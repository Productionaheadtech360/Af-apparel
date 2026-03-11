from decimal import Decimal
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import ForbiddenError, ValidationError
from app.schemas.order import CheckoutConfirmRequest, CreatePaymentIntentRequest, OrderOut
from app.services.cart_service import CartService
from app.services.order_service import OrderService
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/checkout", tags=["checkout"])


@router.post("/intent")
async def create_payment_intent(
    payload: CreatePaymentIntentRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Create Stripe PaymentIntent for current cart total."""
    company_id = getattr(request.state, "company_id", None)
    if not company_id:
        raise ForbiddenError("Company account required")

    discount_percent = getattr(request.state, "tier_discount_percent", Decimal("0"))
    cart_svc = CartService(db)
    cart = await cart_svc.get_cart_with_pricing(company_id, discount_percent)

    if not cart.items:
        raise ValidationError("Cart is empty")

    if not cart.validation.is_valid:
        raise ValidationError("Cart validation failed — check MOQ and MOV requirements")

    total = cart.subtotal + cart.validation.estimated_shipping
    payment_svc = PaymentService(db)
    intent = await payment_svc.create_payment_intent(
        amount_decimal=total,
        metadata={"company_id": str(company_id)},
    )

    return {
        "client_secret": intent.client_secret,
        "payment_intent_id": intent.id,
        "amount": total,
    }


@router.post("/confirm", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def confirm_checkout(
    payload: CheckoutConfirmRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Create order record after client-side payment confirmation."""
    company_id = getattr(request.state, "company_id", None)
    user_id = getattr(request.state, "user_id", None)
    if not company_id:
        raise ForbiddenError("Company account required")

    discount_percent = getattr(request.state, "tier_discount_percent", Decimal("0"))
    order_svc = OrderService(db)
    order = await order_svc.create_order(
        company_id=company_id,
        user_id=user_id,
        confirm=payload,
        discount_percent=discount_percent,
    )
    await db.commit()
    return order
