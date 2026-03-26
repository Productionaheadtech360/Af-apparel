"""Account endpoints — profile, addresses, payment methods, price list, and more.

Each phase adds endpoints to this router:
  Phase 4 (T056): price list generation + status
  Phase 9 (T094–T095): addresses + payment methods
  Phase 15 (T143–T149): profile, users, contacts, statements, messages, inventory report
"""
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
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
from sqlalchemy import func, select, delete, update  # noqa: E402


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

    count = (await db.execute(
        select(func.count(UserAddress.id)).where(UserAddress.company_id == company_id)
    )).scalar_one()

    make_default = payload.is_default or count == 0
    if make_default:
        await db.execute(
            update(UserAddress)
            .where(UserAddress.company_id == company_id)
            .values(is_default=False)
        )

    addr = UserAddress(
        company_id=company_id,
        label=payload.label,
        full_name=payload.full_name,
        address_line1=payload.line1,
        address_line2=payload.line2,
        city=payload.city,
        state=payload.state,
        postal_code=payload.postal_code,
        country=payload.country,
        phone=payload.phone,
        is_default=make_default,
    )
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
    addr = (await db.execute(
        select(UserAddress).where(
            UserAddress.id == address_id, UserAddress.company_id == company_id
        )
    )).scalar_one_or_none()
    if not addr:
        raise NotFoundError("Address not found")

    if payload.is_default and not addr.is_default:
        await db.execute(
            update(UserAddress)
            .where(UserAddress.company_id == company_id)
            .values(is_default=False)
        )

    addr.label = payload.label
    addr.full_name = payload.full_name
    addr.address_line1 = payload.line1
    addr.address_line2 = payload.line2
    addr.city = payload.city
    addr.state = payload.state
    addr.postal_code = payload.postal_code
    addr.country = payload.country
    addr.phone = payload.phone
    addr.is_default = payload.is_default
    await db.commit()
    await db.refresh(addr)
    return addr


@router.patch("/addresses/{address_id}/set-default", response_model=AddressOut)
async def set_default_address(
    address_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    company_id = getattr(request.state, "company_id", None)
    if not company_id:
        raise ForbiddenError("Company account required")
    from app.core.exceptions import NotFoundError
    await db.execute(
        update(UserAddress)
        .where(UserAddress.company_id == company_id)
        .values(is_default=False)
    )
    addr = (await db.execute(
        select(UserAddress).where(
            UserAddress.id == address_id, UserAddress.company_id == company_id
        )
    )).scalar_one_or_none()
    if not addr:
        raise NotFoundError("Address not found")
    addr.is_default = True
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
    from app.models.company import Company
    from app.services.qb_payments_service import QBPaymentsService

    company = (await db.execute(select(Company).where(Company.id == company_id))).scalar_one_or_none()
    if not company or not company.qb_customer_id:
        return []

    try:
        svc = QBPaymentsService()
        cards = svc.list_saved_cards(company.qb_customer_id)
        default_id = company.default_payment_method_id
        return [
            {
                "id": card.get("id"),
                "brand": card.get("cardType", "Unknown"),
                "last4": (card.get("number") or "")[-4:] or "****",
                "exp_month": card.get("expMonth"),
                "exp_year": card.get("expYear"),
                "name": card.get("name"),
                "billing_address": card.get("address"),
                "is_default": card.get("id") == default_id,
                "created": card.get("created"),
            }
            for card in (cards if isinstance(cards, list) else [])
        ]
    except Exception:
        return []


@router.patch("/payment-methods/{payment_method_id}/set-default")
async def set_default_payment_method(
    payment_method_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    company_id = getattr(request.state, "company_id", None)
    if not company_id:
        raise ForbiddenError("Company account required")
    from app.models.company import Company

    company = (await db.execute(select(Company).where(Company.id == company_id))).scalar_one_or_none()
    if company:
        company.default_payment_method_id = payment_method_id
        await db.commit()
    return {"message": "Default payment method updated"}


@router.delete("/payment-methods/{payment_method_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment_method(
    payment_method_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    company_id = getattr(request.state, "company_id", None)
    if not company_id:
        raise ForbiddenError("Company account required")
    from app.models.company import Company
    from app.services.qb_payments_service import QBPaymentsService

    company = (await db.execute(select(Company).where(Company.id == company_id))).scalar_one_or_none()
    if not company or not company.qb_customer_id:
        return

    try:
        svc = QBPaymentsService()
        svc.delete_saved_card(company.qb_customer_id, payment_method_id)
        if company.default_payment_method_id == payment_method_id:
            company.default_payment_method_id = None
            await db.commit()
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Profile (T144 — US-7)
# ---------------------------------------------------------------------------

from app.schemas.account import (  # noqa: E402
    ChangePasswordRequest, CompanyProfileUpdate, CompanyUserOut, ContactCreate,
    ContactOut, MessageCreate, MessageOut, ProfileOut, ProfileUpdate, RoleUpdate, UserInvite,
    UserUpdate,
)
from app.core.security import hash_password, verify_password  # noqa: E402
from app.core.exceptions import ConflictError, NotFoundError, ValidationError  # noqa: E402
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


@router.get("/profile/full")
async def get_full_profile(request: Request, db: AsyncSession = Depends(get_db)):
    """Return combined user + company profile for the account profile page."""
    user_id = getattr(request.state, "user_id", None)
    company_id = getattr(request.state, "company_id", None)
    if not user_id:
        raise ForbiddenError("Authentication required")

    from app.models.company import Company

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found")

    company = None
    if company_id:
        company = (await db.execute(
            select(Company).where(Company.id == company_id)
        )).scalar_one_or_none()

    return {
        "web_user": {
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
        },
        "company": {
            "account_number": str(company.id)[:8].upper(),
            "name": company.name,
            "trading_name": company.trading_name,
            "phone": company.phone,
            "fax": company.fax,
            "website": company.website,
            "tax_id": company.tax_id,
            "tax_id_expiry": company.tax_id_expiry,
            "business_type": company.business_type,
            "secondary_business": company.secondary_business,
            "estimated_annual_volume": company.estimated_annual_volume,
            "ppac_number": company.ppac_number,
            "ppai_number": company.ppai_number,
            "asi_number": company.asi_number,
        } if company else None,
    }


@router.patch("/profile/user")
async def update_user_profile(
    payload: ProfileUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Update first_name / last_name / phone for the logged-in user."""
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise ForbiddenError("Authentication required")
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.commit()
    return {"message": "User profile updated"}


@router.patch("/profile/company")
async def update_company_profile(
    payload: CompanyProfileUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Update editable company profile fields."""
    company_id = getattr(request.state, "company_id", None)
    if not company_id:
        raise ForbiddenError("Company account required")

    from app.models.company import Company

    company = (await db.execute(
        select(Company).where(Company.id == company_id)
    )).scalar_one_or_none()
    if not company:
        raise NotFoundError("Company not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if hasattr(company, field):
            setattr(company, field, value)
    await db.commit()
    return {"message": "Company profile updated"}


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

    # Security notification — never block the response if email fails
    try:
        from app.services.email_service import EmailService
        EmailService(db).send_raw(
            to_email=user.email,
            subject="Your AF Apparels password has been changed",
            body_html=(
                f"<h2>Password Changed Successfully</h2>"
                f"<p>Hi {user.first_name},</p>"
                f"<p>Your AF Apparels account password was successfully changed.</p>"
                f"<p>If you did not make this change, please contact us immediately.</p>"
                f"<br><p>AF Apparels Team</p>"
            ),
        )
    except Exception:
        pass

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
    members = (await db.execute(
        select(CompanyUser).where(CompanyUser.company_id == company_id)
    )).scalars().all()
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
                user_group=m.user_group,
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

    # Validate password
    import re
    if len(payload.password) < 8 or len(payload.password) > 20:
        raise ValidationError("Password must be between 8 and 20 characters")
    if not re.match(r"^[a-zA-Z]", payload.password):
        raise ValidationError("Password must begin with a letter")

    existing = (await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()
    if existing:
        already_member = (await db.execute(
            select(CompanyUser).where(
                CompanyUser.company_id == company_id, CompanyUser.user_id == existing.id
            )
        )).scalar_one_or_none()
        if already_member:
            raise ConflictError("User already belongs to this company")
        user_id = existing.id
    else:
        new_user = User(
            email=payload.email,
            hashed_password=hash_password(payload.password),
            first_name=payload.first_name,
            last_name=payload.last_name,
            is_active=True,
            email_verified=False,
        )
        db.add(new_user)
        await db.flush()
        user_id = new_user.id

    db.add(CompanyUser(
        company_id=company_id,
        user_id=user_id,
        role=payload.role,
        user_group=payload.user_group,
        is_active=True,
        invited_by_id=inviter_id,
    ))
    await db.commit()

    try:
        from app.services.email_service import EmailService
        email_svc = EmailService(db)
        email_svc.send_raw(
            to_email=payload.email,
            subject="You have been invited to AF Apparels",
            body_html=f"""
            <h2>Welcome to AF Apparels!</h2>
            <p>Hi {payload.first_name},</p>
            <p>You have been invited to join the AF Apparels wholesale platform.</p>
            <p><strong>Your login details:</strong></p>
            <p>Email: {payload.email}<br>Password: {payload.password}</p>
            <p><a href="http://localhost:3000/login">Click here to login</a></p>
            <p>AF Apparels Team</p>
            """,
        )
    except Exception:
        pass

    return {"message": "User invited successfully", "user_id": str(user_id)}


@router.patch("/users/{user_id}", status_code=status.HTTP_200_OK)
async def update_company_user(
    user_id: UUID,
    payload: UserUpdate,
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

    if payload.role is not None:
        member.role = payload.role
    if payload.user_group is not None:
        member.user_group = payload.user_group

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user:
        if payload.first_name is not None:
            user.first_name = payload.first_name
        if payload.last_name is not None:
            user.last_name = payload.last_name
        if payload.is_active is not None:
            user.is_active = payload.is_active

    await db.commit()
    return {"message": "User updated"}


@router.post("/users/{user_id}/reset-password", status_code=status.HTTP_200_OK)
async def reset_user_password(
    user_id: UUID,
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
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found")
    from app.services.auth_service import AuthService
    auth_svc = AuthService(db)
    await auth_svc.send_password_reset(user.email)
    return {"message": "Password reset email sent"}


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_company_user(
    user_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    company_id, _ = _require_owner(request)
    current_user_id = getattr(request.state, "user_id", None)
    if current_user_id and str(user_id) == str(current_user_id):
        raise ValidationError("Cannot remove yourself")
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
    if stock_level == "low":
        return await svc.get_low_stock_variants()
    else:
        return await svc.get_low_stock_variants(threshold_override=999999)


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


# ---------------------------------------------------------------------------
# Resend Registration Emails
# ---------------------------------------------------------------------------

@router.post("/resend-registration-emails")
async def resend_registration_emails(
    payload: dict,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Resend welcome/registration emails to selected user groups and/or explicit addresses."""
    company_id = getattr(request.state, "company_id", None)
    company_role = getattr(request.state, "company_role", None)
    if not company_id:
        raise ForbiddenError("Company account required")
    if company_role != "owner":
        raise ForbiddenError("Owner role required")

    # Verify reCAPTCHA (skip if secret key not configured — dev convenience)
    from app.core.config import settings as _settings
    recaptcha_token = payload.get("recaptcha_token")
    if _settings.RECAPTCHA_SECRET_KEY:
        if not recaptcha_token:
            raise ValidationError("reCAPTCHA verification required")
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://www.google.com/recaptcha/api/siteverify",
                data={
                    "secret": _settings.RECAPTCHA_SECRET_KEY,
                    "response": recaptcha_token,
                },
            )
            result = resp.json()
            if not result.get("success"):
                raise ValidationError("reCAPTCHA verification failed")

    selected_groups = payload.get("groups", [])
    to_emails = [e.strip() for e in payload.get("to", "").split(",") if e.strip()]
    cc_emails = [e.strip() for e in payload.get("cc", "").split(",") if e.strip()]
    bcc_emails = [e.strip() for e in payload.get("bcc", "").split(",") if e.strip()]

    if not selected_groups and not to_emails:
        raise ValidationError("Select at least one user group or enter a TO email")

    # Collect emails from selected groups
    group_emails: list[str] = []
    if selected_groups:
        members = (await db.execute(
            select(CompanyUser).where(
                CompanyUser.company_id == company_id,
                CompanyUser.user_group.in_(selected_groups),
            )
        )).scalars().all()
        for member in members:
            user = (await db.execute(
                select(User).where(User.id == member.user_id)
            )).scalar_one_or_none()
            if user and user.email:
                group_emails.append(user.email)

    all_to = list(set(group_emails + to_emails))
    if not all_to:
        raise ValidationError("No recipients found for selected groups")

    from app.services.email_service import EmailService as _EmailService
    email_svc = _EmailService(db)

    sent_count = 0
    for email in all_to:
        try:
            email_svc.send_raw(
                to_email=email,
                subject="Welcome to AF Apparels B2B Platform",
                body_html=(
                    "<h2>Welcome to AF Apparels!</h2>"
                    "<p>This is a reminder of your registration to the AF Apparels wholesale platform.</p>"
                    f"<p>Please visit <a href='{_settings.FRONTEND_URL}/login'>our platform</a> to login.</p>"
                    "<p>If you need help, please contact us.</p>"
                    "<p>AF Apparels Team</p>"
                ),
                cc=cc_emails or None,
                bcc=bcc_emails or None,
            )
            sent_count += 1
        except Exception:
            pass

    return {"message": f"Emails sent successfully to {sent_count} recipient(s)", "sent_count": sent_count}
