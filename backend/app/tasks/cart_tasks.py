"""Cart Celery tasks — T208: abandoned cart detection."""
import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone

from app.core.celery import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="cart.detect_abandoned")
def detect_abandoned_carts() -> dict:
    """T208: Periodic task — flag cart items inactive >24h, snapshot to abandoned_carts.

    Algorithm:
    1. Find all users with cart_items not updated in >24h
    2. For each such user, if no abandoned_cart entry exists within the window:
       a. Serialize their current cart items as JSON
       b. Insert an AbandonedCart record
    3. Return count of new abandoned carts created.
    """

    async def _run() -> dict:
        from sqlalchemy import func, select
        from sqlalchemy.orm import selectinload
        from app.core.database import AsyncSessionLocal
        from app.models.order import AbandonedCart, CartItem

        threshold = datetime.now(timezone.utc) - timedelta(hours=24)

        async with AsyncSessionLocal() as db:
            # Find users with stale cart items
            stale_q = (
                select(CartItem.user_id, func.max(CartItem.updated_at).label("last_activity"))
                .group_by(CartItem.user_id)
                .having(func.max(CartItem.updated_at) < threshold)
            )
            stale_rows = (await db.execute(stale_q)).all()

            created = 0
            for row in stale_rows:
                user_id = row.user_id
                last_activity = row.last_activity

                # Check if already snapshotted recently
                existing_q = (
                    select(AbandonedCart)
                    .where(AbandonedCart.user_id == user_id)
                    .where(AbandonedCart.created_at >= last_activity)
                    .limit(1)
                )
                existing = (await db.execute(existing_q)).scalar_one_or_none()
                if existing:
                    continue

                # Load cart items
                items_q = (
                    select(CartItem)
                    .options(selectinload(CartItem.variant))
                    .where(CartItem.user_id == user_id)
                )
                items = (await db.execute(items_q)).scalars().all()
                if not items:
                    continue

                snapshot = [
                    {
                        "variant_id": str(item.variant_id),
                        "sku": item.variant.sku if item.variant else None,
                        "quantity": item.quantity,
                        "price_at_add": float(item.price_at_add) if item.price_at_add else None,
                    }
                    for item in items
                ]

                abandoned = AbandonedCart(
                    user_id=user_id,
                    items_snapshot=json.dumps(snapshot),
                    total_items=len(items),
                )
                db.add(abandoned)
                created += 1

            await db.commit()

        logger.info("Abandoned cart detection: %d new snapshots created", created)
        return {"created": created, "checked": len(stale_rows)}

    return asyncio.get_event_loop().run_until_complete(_run())
