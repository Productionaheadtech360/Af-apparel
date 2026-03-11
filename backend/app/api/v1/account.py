"""Account endpoints — profile, addresses, payment methods, price list, and more.

Each phase adds endpoints to this router:
  Phase 4 (T056): price list generation + status
  Phase 9 (T094–T095): addresses + payment methods
  Phase 15 (T143–T149): profile, users, contacts, statements, messages, inventory report
"""
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import ForbiddenError

router = APIRouter(prefix="/account", tags=["account"])


# ---------------------------------------------------------------------------
# Price list (T056 — US-10)
# ---------------------------------------------------------------------------

from app.schemas.system import PriceListRequestOut  # noqa: E402


@router.post(
    "/price-list",
    response_model=PriceListRequestOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def request_price_list(
    request: Request,
    format: str = Query("pdf", pattern="^(pdf|excel)$"),
    db: AsyncSession = Depends(get_db),
):
    """Queue async price list generation. Returns request_id for polling."""
    company_id = getattr(request.state, "company_id", None)
    if not company_id:
        raise ForbiddenError("Company account required")

    from app.services.pricelist_service import PriceListService

    svc = PriceListService(db)
    req = await svc.request_generation(company_id=company_id, format=format)
    await db.commit()
    return req


@router.get("/price-list/{request_id}", response_model=PriceListRequestOut)
async def get_price_list_status(
    request_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Poll price list generation status. Returns file_url when completed."""
    company_id = getattr(request.state, "company_id", None)
    if not company_id:
        raise ForbiddenError("Company account required")

    from app.services.pricelist_service import PriceListService

    svc = PriceListService(db)
    return await svc.get_request_status(request_id=request_id, company_id=company_id)


# ---------------------------------------------------------------------------
# Addresses (T094 — US-6)
# ---------------------------------------------------------------------------

from app.schemas.order import AddressIn, AddressOut  # noqa: E402
from app.models.company import UserAddress  # noqa: E402
from sqlalchemy import select, delete  # noqa: E402


@router.get("/addresses", response_model=list[AddressOut])
async def list_addresses(request: Request, db: AsyncSession = Depends(get_db)):
    company_id = getattr(request.state, "company_id", None)
    if not company_id:
        raise ForbiddenError("Company account required")
    result = await db.execute(
        select(UserAddress).where(UserAddress.company_id == company_id)
    )
    return result.scalars().all()


@router.post("/addresses", response_model=AddressOut, status_code=status.HTTP_201_CREATED)
async def create_address(
    payload: AddressIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    company_id = getattr(request.state, "company_id", None)
    if not company_id:
        raise ForbiddenError("Company account required")
    addr = UserAddress(company_id=company_id, **payload.model_dump())
    db.add(addr)
    await db.commit()
    await db.refresh(addr)
    return addr


@router.patch("/addresses/{address_id}", response_model=AddressOut)
async def update_address(
    address_id: UUID,
    payload: AddressIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    company_id = getattr(request.state, "company_id", None)
    if not company_id:
        raise ForbiddenError("Company account required")
    from app.core.exceptions import NotFoundError
    result = await db.execute(
        select(UserAddress).where(
            UserAddress.id == address_id, UserAddress.company_id == company_id
        )
    )
    addr = result.scalar_one_or_none()
    if not addr:
        raise NotFoundError("Address not found")
    for field, value in payload.model_dump().items():
        setattr(addr, field, value)
    await db.commit()
    await db.refresh(addr)
    return addr


@router.delete("/addresses/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_address(
    address_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    company_id = getattr(request.state, "company_id", None)
    if not company_id:
        raise ForbiddenError("Company account required")
    await db.execute(
        delete(UserAddress).where(
            UserAddress.id == address_id, UserAddress.company_id == company_id
        )
    )
    await db.commit()


# ---------------------------------------------------------------------------
# Payment methods (T095 — US-6)
# ---------------------------------------------------------------------------

@router.get("/payment-methods")
async def list_payment_methods(request: Request, db: AsyncSession = Depends(get_db)):
    company_id = getattr(request.state, "company_id", None)
    if not company_id:
        raise ForbiddenError("Company account required")
    from app.services.payment_service import PaymentService
    from app.models.company import Company

    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company or not company.stripe_customer_id:
        return []

    svc = PaymentService(db)
    pms = await svc.list_saved_payment_methods(company.stripe_customer_id)
    return [
        {
            "id": pm.id,
            "brand": pm.card.brand,
            "last4": pm.card.last4,
            "exp_month": pm.card.exp_month,
            "exp_year": pm.card.exp_year,
        }
        for pm in pms
    ]


@router.delete("/payment-methods/{payment_method_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment_method(
    payment_method_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    company_id = getattr(request.state, "company_id", None)
    if not company_id:
        raise ForbiddenError("Company account required")
    from app.services.payment_service import PaymentService

    svc = PaymentService(db)
    await svc.detach_payment_method(payment_method_id)


# ---------------------------------------------------------------------------
# Profile (T144 — US-7)
# ---------------------------------------------------------------------------

from app.schemas.account import (  # noqa: E402
    ChangePasswordRequest, CompanyUserOut, ContactCreate, ContactOut,
    MessageCreate, MessageOut, ProfileOut, ProfileUpdate, RoleUpdate, UserInvite,
)
from app.core.security import hash_password, verify_password  # noqa: E402
from app.core.exceptions import NotFoundError, ValidationError  # noqa: E402
from app.models.company import CompanyUser, Contact  # noqa: E402
from app.models.user import User  # noqa: E402
from app.models.communication import Message  # noqa: E402


@router.get("/profile", response_model=ProfileOut)
async def get_profile(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise ForbiddenError("Authentication required")
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found")
    return user


@router.patch("/profile", response_model=ProfileOut)
async def update_profile(
    payload: ProfileUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise ForbiddenError("Authentication required")
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise ForbiddenError("Authentication required")
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found")
    if not verify_password(payload.current_password, user.hashed_password):
        raise ValidationError("Current password is incorrect")
    user.hashed_password = hash_password(payload.new_password)
    await db.commit()
    return {"message": "Password updated"}


# ---------------------------------------------------------------------------
# User management (T145 — US-7) — Owner role required
# ---------------------------------------------------------------------------

def _require_owner(request: Request) -> tuple:
    company_id = getattr(request.state, "company_id", None)
    company_role = getattr(request.state, "company_role", None)
    if not company_id:
        raise ForbiddenError("Company account required")
    if company_role != "owner":
        raise ForbiddenError("Owner role required")
    return company_id, getattr(request.state, "user_id", None)


@router.get("/users", response_model=list[CompanyUserOut])
async def list_company_users(request: Request, db: AsyncSession = Depends(get_db)):
    company_id = getattr(request.state, "company_id", None)
    if not company_id:
        raise ForbiddenError("Company account required")
    result = await db.execute(
        select(CompanyUser).where(CompanyUser.company_id == company_id)
    )
    members = result.scalars().all()
    out = []
    for m in members:
        user = (await db.execute(select(User).where(User.id == m.user_id))).scalar_one_or_none()
        if user:
            out.append(CompanyUserOut(
                id=m.id,
                user_id=m.user_id,
                email=user.email,
                first_name=user.first_name,
                last_name=user.last_name,
                role=m.role,
                is_active=user.is_active,
            ))
    return out


@router.post("/users/invite", status_code=status.HTTP_201_CREATED)
async def invite_user(
    payload: UserInvite,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    company_id, inviter_id = _require_owner(request)
    # Create user if not exists
    existing = (await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()
    if not existing:
        import secrets
        temp_password = secrets.token_urlsafe(16)
        new_user = User(
            email=payload.email,
            hashed_password=hash_password(temp_password),
            first_name=payload.first_name,
            last_name=payload.last_name,
            is_active=True,
        )
        db.add(new_user)
        await db.flush()
        user_id = new_user.id
    else:
        user_id = existing.id
    # Add company membership
    db.add(CompanyUser(company_id=company_id, user_id=user_id, role=payload.role))
    await db.commit()
    return {"message": "User invited", "user_id": str(user_id)}


@router.patch("/users/{user_id}", status_code=status.HTTP_200_OK)
async def update_company_user(
    user_id: UUID,
    payload: RoleUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    company_id, _ = _require_owner(request)
    member = (await db.execute(
        select(CompanyUser).where(
            CompanyUser.company_id == company_id, CompanyUser.user_id == user_id
        )
    )).scalar_one_or_none()
    if not member:
        raise NotFoundError("User not found in company")
    member.role = payload.role
    await db.commit()
    return {"message": "Role updated"}


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_company_user(
    user_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    company_id, _ = _require_owner(request)
    from sqlalchemy import delete as sa_delete
    await db.execute(
        sa_delete(CompanyUser).where(
            CompanyUser.company_id == company_id, CompanyUser.user_id == user_id
        )
    )
    await db.commit()


# ---------------------------------------------------------------------------
# Contacts (T146 — US-7)
# ---------------------------------------------------------------------------

@router.get("/contacts", response_model=list[ContactOut])
async def list_contacts(request: Request, db: AsyncSession = Depends(get_db)):
    company_id = getattr(request.state, "company_id", None)
    if not company_id:
        raise ForbiddenError("Company account required")
    result = await db.execute(select(Contact).where(Contact.company_id == company_id))
    return result.scalars().all()


@router.post("/contacts", response_model=ContactOut, status_code=status.HTTP_201_CREATED)
async def create_contact(
    payload: ContactCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    company_id = getattr(request.state, "company_id", None)
    if not company_id:
        raise ForbiddenError("Company account required")
    contact = Contact(company_id=company_id, **payload.model_dump())
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return contact


@router.patch("/contacts/{contact_id}", response_model=ContactOut)
async def update_contact(
    contact_id: UUID,
    payload: ContactCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    company_id = getattr(request.state, "company_id", None)
    if not company_id:
        raise ForbiddenError("Company account required")
    contact = (await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.company_id == company_id)
    )).scalar_one_or_none()
    if not contact:
        raise NotFoundError("Contact not found")
    for field, value in payload.model_dump().items():
        setattr(contact, field, value)
    await db.commit()
    await db.refresh(contact)
    return contact


@router.delete("/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    company_id = getattr(request.state, "company_id", None)
    if not company_id:
        raise ForbiddenError("Company account required")
    from sqlalchemy import delete as sa_delete
    await db.execute(
        sa_delete(Contact).where(Contact.id == contact_id, Contact.company_id == company_id)
    )
    await db.commit()


# ---------------------------------------------------------------------------
# Messages (T148 — US-7)
# ---------------------------------------------------------------------------

@router.get("/messages", response_model=list[MessageOut])
async def list_messages(request: Request, db: AsyncSession = Depends(get_db)):
    company_id = getattr(request.state, "company_id", None)
    if not company_id:
        raise ForbiddenError("Company account required")
    result = await db.execute(
        select(Message).where(Message.company_id == company_id).order_by(Message.created_at.desc())
    )
    return result.scalars().all()


@router.post("/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def send_message(
    payload: MessageCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    company_id = getattr(request.state, "company_id", None)
    user_id = getattr(request.state, "user_id", None)
    if not company_id or not user_id:
        raise ForbiddenError("Company account required")
    msg = Message(
        company_id=company_id,
        sender_id=user_id,
        subject=payload.subject,
        body=payload.body,
        parent_id=payload.parent_id,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


# ---------------------------------------------------------------------------
# Inventory report (T149 — US-7)
# ---------------------------------------------------------------------------

@router.get("/inventory-report")
async def get_inventory_report(
    q: str | None = None,
    category: str | None = None,
    stock_level: str | None = None,  # low | out | in_stock
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """Returns variant stock summary visible to account users."""
    company_id = getattr(request.state, "company_id", None)
    if not company_id:
        raise ForbiddenError("Company account required")
    from app.services.inventory_service import InventoryService
    svc = InventoryService(db)
    return await svc.get_low_stock_variants(low_stock_only=(stock_level == "low"))


# ---------------------------------------------------------------------------
# Order Templates (T165 — US-8)
# ---------------------------------------------------------------------------

from app.models.order import OrderTemplate  # noqa: E402


@router.get("/templates")
async def list_templates(request: Request, db: AsyncSession = Depends(get_db)):
    company_id = getattr(request.state, "company_id", None)
    if not company_id:
        raise ForbiddenError("Company account required")
    result = await db.execute(
        select(OrderTemplate).where(OrderTemplate.company_id == company_id)
        .order_by(OrderTemplate.created_at.desc())
    )
    templates = result.scalars().all()
    import json
    return [
        {
            "id": str(t.id),
            "name": t.name,
            "item_count": len(json.loads(t.items)),
            "created_at": t.created_at.isoformat(),
        }
        for t in templates
    ]


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    company_id = getattr(request.state, "company_id", None)
    if not company_id:
        raise ForbiddenError("Company account required")
    from sqlalchemy import delete as sa_delete
    await db.execute(
        sa_delete(OrderTemplate).where(
            OrderTemplate.id == template_id,
            OrderTemplate.company_id == company_id,
        )
    )
    await db.commit()


@router.post("/templates/{template_id}/load")
async def load_template_to_cart(
    template_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Load a saved template into cart, applying current pricing."""
    company_id = getattr(request.state, "company_id", None)
    if not company_id:
        raise ForbiddenError("Company account required")
    tpl = (await db.execute(
        select(OrderTemplate).where(
            OrderTemplate.id == template_id,
            OrderTemplate.company_id == company_id,
        )
    )).scalar_one_or_none()
    if not tpl:
        raise NotFoundError("Template not found")

    import json
    from decimal import Decimal
    items = json.loads(tpl.items)
    from app.services.cart_service import CartService
    svc = CartService(db)
    discount = getattr(request.state, "tier_discount_percent", Decimal("0"))
    validation = await svc.validate_sku_list(items)
    added = await svc.bulk_add_validated_items(company_id, validation["valid"], discount)
    await db.commit()
    return {
        "message": f"Loaded {added} items",
        "added": added,
        "invalid": len(validation["invalid"]),
        "insufficient_stock": len(validation["insufficient_stock"]),
    }


# ---------------------------------------------------------------------------
# RMA (T179 — US-14)
# ---------------------------------------------------------------------------

from app.models.rma import RMAItem as RMAItemModel, RMARequest  # noqa: E402
from app.schemas.order import RMACreate, RMAOut  # noqa: E402


@router.get("/rma", response_model=list[RMAOut])
async def list_my_rma(request: Request, db: AsyncSession = Depends(get_db)):
    company_id = getattr(request.state, "company_id", None)
    if not company_id:
        raise ForbiddenError("Company account required")
    # Get order IDs for this company
    from app.models.order import Order
    order_ids = (await db.execute(
        select(Order.id).where(Order.company_id == company_id)
    )).scalars().all()
    result = await db.execute(
        select(RMARequest).where(RMARequest.order_id.in_(order_ids))
        .order_by(RMARequest.created_at.desc())
    )
    return result.scalars().all()


@router.post("/rma", response_model=RMAOut, status_code=status.HTTP_201_CREATED)
async def create_rma(
    payload: RMACreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    company_id = getattr(request.state, "company_id", None)
    user_id = getattr(request.state, "user_id", None)
    if not company_id or not user_id:
        raise ForbiddenError("Company account required")

    import random
    rma_number = f"RMA-{random.randint(100000, 999999)}"

    rma = RMARequest(
        order_id=payload.order_id,
        submitted_by_id=user_id,
        rma_number=rma_number,
        reason=payload.reason,
        notes=payload.notes,
        status="pending",
    )
    db.add(rma)
    await db.flush()

    for item in payload.items:
        db.add(RMAItemModel(
            rma_id=rma.id,
            order_item_id=item.order_item_id,
            quantity=item.quantity,
            reason=item.reason,
        ))

    await db.commit()
    await db.refresh(rma)
    return rma


@router.get("/rma/{rma_id}", response_model=RMAOut)
async def get_rma(rma_id: UUID, request: Request, db: AsyncSession = Depends(get_db)):
    company_id = getattr(request.state, "company_id", None)
    if not company_id:
        raise ForbiddenError("Company account required")
    rma = (await db.execute(select(RMARequest).where(RMARequest.id == rma_id))).scalar_one_or_none()
    if not rma:
        raise NotFoundError("RMA not found")
    return rma
