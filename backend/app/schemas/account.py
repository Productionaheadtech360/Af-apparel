from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field


class ProfileOut(BaseModel):
    id: UUID
    email: str
    first_name: str
    last_name: str
    phone: str | None
    is_active: bool
    email_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class CompanyUserOut(BaseModel):
    id: UUID
    user_id: UUID
    email: str
    first_name: str
    last_name: str
    role: str
    is_active: bool

    model_config = {"from_attributes": True}


class UserInvite(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    role: str = "buyer"


class RoleUpdate(BaseModel):
    role: str = Field(..., pattern="^(owner|buyer|viewer|finance)$")


class ContactCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str | None = None
    title: str | None = None
    is_primary: bool = False
    notify_order_confirmation: bool = True
    notify_order_shipped: bool = True
    notify_invoices: bool = False


class ContactOut(BaseModel):
    id: UUID
    company_id: UUID
    first_name: str
    last_name: str
    email: str
    phone: str | None
    title: str | None
    is_primary: bool
    notify_order_confirmation: bool
    notify_order_shipped: bool
    notify_invoices: bool

    model_config = {"from_attributes": True}


class StatementOut(BaseModel):
    id: UUID
    period_start: datetime
    period_end: datetime
    total_orders: int
    total_amount: Decimal
    status: str  # open | closed
    pdf_url: str | None

    model_config = {"from_attributes": True}


class MessageCreate(BaseModel):
    subject: str = Field(..., min_length=1, max_length=255)
    body: str = Field(..., min_length=1)
    parent_id: UUID | None = None


class MessageOut(BaseModel):
    id: UUID
    subject: str
    body: str
    parent_id: UUID | None
    is_read_by_company: bool
    created_at: datetime

    model_config = {"from_attributes": True}
