"""OrderService — create orders with server-side validation + price snapshots."""
import logging
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import NotFoundError, ValidationError, InsufficientStockError
from app.models.company import Company, UserAddress
from app.models.inventory import InventoryRecord
from app.models.order import CartItem, Order, OrderItem, OrderTemplate
from app.models.product import Product, ProductVariant
from app.models.pricing import PricingTier
from app.models.shipping import ShippingTier
from app.schemas.order import AddressIn, CheckoutConfirmRequest, OrderListItem, OrderOut

logger = logging.getLogger(__name__)

_ORDER_COUNTER_KEY = "order:counter"


class OrderService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ------------------------------------------------------------------
    # Create order (US-6)
    # ------------------------------------------------------------------

    async def create_order(
        self,
        company_id: UUID,
        user_id: UUID,
        confirm: CheckoutConfirmRequest,
        discount_percent: Decimal = Decimal("0"),
    ) -> Order:
        settings = get_settings()

        # 1. Load cart items
        cart_result = await self.db.execute(
            select(CartItem).where(CartItem.company_id == company_id)
        )
        cart_items = cart_result.scalars().all()
        if not cart_items:
            raise ValidationError("Cart is empty")

        # 2. Load company + shipping tier
        company_result = await self.db.execute(
            select(Company).where(Company.id == company_id)
        )
        company = company_result.scalar_one_or_none()
        if not company:
            raise NotFoundError(f"Company {company_id} not found")

        # 3. Validate + snapshot each item
        order_items_data = []
        subtotal = Decimal("0")
        total_units = 0

        for cart_item in cart_items:
            variant_result = await self.db.execute(
                select(ProductVariant, Product)
                .join(Product, ProductVariant.product_id == Product.id)
                .where(ProductVariant.id == cart_item.variant_id)
            )
            row = variant_result.first()
            if not row:
                raise NotFoundError(f"Variant {cart_item.variant_id} not found")
            variant, product = row

            # MOQ check
            if cart_item.quantity < product.moq:
                raise ValidationError(
                    f"SKU {variant.sku}: minimum {product.moq} units required"
                )

            # Stock check
            stock_result = await self.db.execute(
                select(func.coalesce(func.sum(InventoryRecord.quantity), 0)).where(
                    InventoryRecord.variant_id == variant.id
                )
            )
            available = stock_result.scalar_one()
            if available < cart_item.quantity:
                raise InsufficientStockError(
                    f"Insufficient stock for {variant.sku}: {available} available"
                )

            # Price snapshot
            from app.services.pricing_service import PricingService
            pricing_svc = PricingService(self.db)
            unit_price = pricing_svc.calculate_effective_price(
                variant.retail_price, discount_percent
            )
            line_total = unit_price * cart_item.quantity
            subtotal += line_total
            total_units += cart_item.quantity

            order_items_data.append({
                "variant_id": variant.id,
                "product_name": product.name,
                "sku": variant.sku,
                "color": variant.color,
                "size": variant.size,
                "quantity": cart_item.quantity,
                "unit_price": unit_price,
                "line_total": line_total,
            })

        # 4. MOV check
        mov_amount = Decimal(str(getattr(settings, "MOV_AMOUNT", "0")))
        if subtotal < mov_amount:
            raise ValidationError(
                f"Minimum order value of ${mov_amount} not met (current: ${subtotal})"
            )

        # 5. Calculate shipping
        shipping_cost = Decimal("0")
        if company.shipping_tier_id:
            shipping_tier_result = await self.db.execute(
                select(ShippingTier).where(ShippingTier.id == company.shipping_tier_id)
            )
            shipping_tier = shipping_tier_result.scalar_one_or_none()
            if shipping_tier:
                from app.services.shipping_service import ShippingService
                shipping_svc = ShippingService(self.db)
                shipping_cost = shipping_svc.calculate_shipping_cost(
                    total_units, shipping_tier, company.shipping_override_amount
                )

        total = subtotal + shipping_cost

        # 6. Resolve shipping address
        shipping_address = await self._resolve_address(confirm, company_id)

        # 7. Generate order number
        order_number = await self._generate_order_number()

        # 8. Create Order record
        order = Order(
            company_id=company_id,
            created_by=user_id,
            order_number=order_number,
            status="pending",
            payment_status="pending",
            po_number=confirm.po_number,
            order_notes=confirm.order_notes,
            stripe_payment_intent_id=confirm.payment_intent_id,
            subtotal=subtotal,
            shipping_cost=shipping_cost,
            total=total,
            shipping_address_line1=shipping_address.get("line1"),
            shipping_address_line2=shipping_address.get("line2"),
            shipping_address_city=shipping_address.get("city"),
            shipping_address_state=shipping_address.get("state"),
            shipping_address_postal_code=shipping_address.get("postal_code"),
            shipping_address_country=shipping_address.get("country", "US"),
        )
        self.db.add(order)
        await self.db.flush()

        # 9. Create OrderItem records
        for item_data in order_items_data:
            order_item = OrderItem(
                order_id=order.id,
                **item_data,
            )
            self.db.add(order_item)

        # 10. Clear cart
        from sqlalchemy import delete
        await self.db.execute(
            delete(CartItem).where(CartItem.company_id == company_id)
        )

        await self.db.flush()
        await self.db.refresh(order)

        # 11. Queue confirmation email
        from app.tasks.email_tasks import send_order_confirmation_email
        send_order_confirmation_email.delay(str(order.id))

        return order

    # ------------------------------------------------------------------
    # Get / list orders
    # ------------------------------------------------------------------

    async def get_order(self, order_id: UUID, company_id: UUID) -> Order:
        from sqlalchemy.orm import selectinload

        result = await self.db.execute(
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.id == order_id, Order.company_id == company_id)
        )
        order = result.scalar_one_or_none()
        if not order:
            raise NotFoundError(f"Order {order_id} not found")
        return order

    async def list_orders_for_company(
        self, company_id: UUID, page: int = 1, page_size: int = 20
    ) -> tuple[list[Order], int]:
        from sqlalchemy.orm import selectinload

        count_result = await self.db.execute(
            select(func.count(Order.id)).where(Order.company_id == company_id)
        )
        total = count_result.scalar_one()

        result = await self.db.execute(
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.company_id == company_id)
            .order_by(Order.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        orders = result.scalars().all()
        return list(orders), total

    # ------------------------------------------------------------------
    # Reorder (T150 — Phase 15)
    # ------------------------------------------------------------------

    async def reorder(
        self, order_id: UUID, company_id: UUID, discount_percent: Decimal = Decimal("0")
    ) -> list[dict]:
        """Copy a past order's items into the cart with current pricing + stock check."""
        order = await self.get_order(order_id, company_id)
        from app.services.pricing_service import PricingService
        pricing_svc = PricingService(self.db)

        added = []
        skipped = []

        for order_item in order.items:
            stock_result = await self.db.execute(
                select(func.coalesce(func.sum(InventoryRecord.quantity), 0)).where(
                    InventoryRecord.variant_id == order_item.variant_id
                )
            )
            available = stock_result.scalar_one()

            if available < order_item.quantity:
                skipped.append({"sku": order_item.sku, "reason": "insufficient_stock"})
                continue

            variant_result = await self.db.execute(
                select(ProductVariant).where(ProductVariant.id == order_item.variant_id)
            )
            variant = variant_result.scalar_one_or_none()
            if not variant or variant.status != "active":
                skipped.append({"sku": order_item.sku, "reason": "discontinued"})
                continue

            effective_price = pricing_svc.calculate_effective_price(
                variant.retail_price, discount_percent
            )

            cart_item = CartItem(
                company_id=company_id,
                variant_id=order_item.variant_id,
                product_id=variant.product_id,
                quantity=order_item.quantity,
                unit_price=effective_price,
            )
            self.db.add(cart_item)
            added.append({"sku": order_item.sku})

        await self.db.flush()
        return {"added": added, "skipped": skipped}

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    async def _resolve_address(self, confirm: CheckoutConfirmRequest, company_id: UUID) -> dict:
        if confirm.address_id:
            result = await self.db.execute(
                select(UserAddress).where(
                    UserAddress.id == confirm.address_id,
                    UserAddress.company_id == company_id,
                )
            )
            addr = result.scalar_one_or_none()
            if addr:
                return {
                    "line1": addr.line1,
                    "line2": addr.line2,
                    "city": addr.city,
                    "state": addr.state,
                    "postal_code": addr.postal_code,
                    "country": addr.country,
                }
        if confirm.shipping_address:
            return confirm.shipping_address.model_dump()
        return {}

    async def _generate_order_number(self) -> str:
        from app.core.redis import redis_increment
        try:
            counter = await redis_increment(_ORDER_COUNTER_KEY)
        except Exception:
            import random
            counter = random.randint(10000, 99999)
        return f"AF-{counter:06d}"
