"""Admin — order management and RMA."""
import csv
import io
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.models.company import Company
from app.models.order import Order, OrderItem
from app.models.rma import RMAItem, RMARequest
from app.schemas.order import (
    AdminOrderDetail,
    AdminOrderListItem,
    CancelOrderRequest,
    OrderUpdateRequest,
    RMACreate,
    RMAOut,
    RMAUpdateRequest,
)
from app.types.api import PaginatedResponse

router = APIRouter(prefix="/admin", tags=["admin-orders"])


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------

@router.get("/orders", response_model=PaginatedResponse[AdminOrderListItem])
async def list_admin_orders(
    q: str | None = None,
    status: str | None = None,
    payment_status: str | None = None,
    company_id: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(Order, Company.name.label("company_name")).join(
        Company, Order.company_id == Company.id
    )
    if q:
        query = query.where(
            (Order.order_number.ilike(f"%{q}%")) | (Order.po_number.ilike(f"%{q}%"))
        )
    if status:
        query = query.where(Order.status == status)
    if payment_status:
        query = query.where(Order.payment_status == payment_status)
    if company_id:
        query = query.where(Order.company_id == company_id)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    result = await db.execute(
        query.order_by(Order.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    rows = result.all()

    items = []
    for row in rows:
        order, company_name = row
        item_count = (await db.execute(
            select(func.count(OrderItem.id)).where(OrderItem.order_id == order.id)
        )).scalar_one()
        items.append(AdminOrderListItem(
            id=order.id,
            order_number=order.order_number,
            company_name=company_name,
            status=order.status,
            payment_status=order.payment_status,
            po_number=order.po_number,
            total=order.total,
            item_count=item_count,
            created_at=order.created_at,
        ))

    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size, pages=(total + page_size - 1) // page_size)


@router.get("/orders/export-csv")
async def export_orders_csv(
    q: str | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Order, Company.name.label("company_name")).join(Company, Order.company_id == Company.id)
    if q:
        query = query.where(Order.order_number.ilike(f"%{q}%"))
    if status:
        query = query.where(Order.status == status)
    result = await db.execute(query.order_by(Order.created_at.desc()))
    rows = result.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Order #", "Company", "Status", "Payment", "PO Number", "Total", "Created"])
    for row in rows:
        order, company_name = row
        writer.writerow([
            order.order_number, company_name, order.status, order.payment_status,
            order.po_number or "", str(order.total), order.created_at.isoformat(),
        ])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=orders.csv"},
    )


@router.get("/orders/{order_id}", response_model=AdminOrderDetail)
async def get_admin_order(order_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Order, Company.name.label("company_name"))
        .join(Company, Order.company_id == Company.id)
        .where(Order.id == order_id)
    )
    row = result.one_or_none()
    if not row:
        raise NotFoundError(f"Order {order_id} not found")
    order, company_name = row

    items_result = await db.execute(select(OrderItem).where(OrderItem.order_id == order_id))
    items = items_result.scalars().all()

    return {
        **{c.key: getattr(order, c.key) for c in order.__table__.columns},
        "company_name": company_name,
        "items": items,
    }


@router.patch("/orders/{order_id}", response_model=dict)
async def update_admin_order(
    order_id: UUID,
    payload: OrderUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    order = (await db.execute(select(Order).where(Order.id == order_id))).scalar_one_or_none()
    if not order:
        raise NotFoundError(f"Order {order_id} not found")

    old_status = order.status
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(order, field, value)
    await db.commit()

    # Trigger shipping email if status changed to "shipped" with tracking
    if payload.status == "shipped" and old_status != "shipped":
        from app.tasks.email_tasks import send_order_shipped_email
        send_order_shipped_email.delay(str(order_id), payload.tracking_number or "")

    return {"message": "Order updated"}


@router.post("/orders/{order_id}/cancel", response_model=dict)
async def cancel_admin_order(
    order_id: UUID,
    payload: CancelOrderRequest,
    db: AsyncSession = Depends(get_db),
):
    order = (await db.execute(select(Order).where(Order.id == order_id))).scalar_one_or_none()
    if not order:
        raise NotFoundError(f"Order {order_id} not found")
    order.status = "cancelled"
    if hasattr(order, "notes"):
        order.notes = f"Cancelled: {payload.reason}"
    await db.commit()
    return {"message": "Order cancelled"}


@router.post("/orders/{order_id}/sync-quickbooks", response_model=dict)
async def sync_order_to_quickbooks(order_id: UUID, db: AsyncSession = Depends(get_db)):
    from app.tasks.quickbooks_tasks import sync_order_to_qb
    sync_order_to_qb.delay(str(order_id))
    return {"message": "QuickBooks sync queued", "order_id": str(order_id)}


# ---------------------------------------------------------------------------
# Admin RMA management (T180 — US-14)
# ---------------------------------------------------------------------------

@router.get("/rma")
async def list_admin_rma(
    status: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(RMARequest)
    if status:
        query = query.where(RMARequest.status == status)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    result = await db.execute(
        query.order_by(RMARequest.created_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    return PaginatedResponse(
        items=list(result.scalars().all()),
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.patch("/rma/{rma_id}", response_model=dict)
async def update_rma(
    rma_id: UUID,
    payload: RMAUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    rma = (await db.execute(select(RMARequest).where(RMARequest.id == rma_id))).scalar_one_or_none()
    if not rma:
        raise NotFoundError(f"RMA {rma_id} not found")
    rma.status = payload.status
    if payload.admin_notes:
        rma.admin_notes = payload.admin_notes
    await db.commit()

    from app.tasks.email_tasks import send_rma_status_email
    send_rma_status_email.delay(str(rma_id))

    return {"message": f"RMA {payload.status}"}
