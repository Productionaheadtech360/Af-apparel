"""Email Celery tasks — full implementation with 3-retry exponential backoff."""
import asyncio
import logging

from app.core.celery import celery_app
from app.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)


def _run(coro):
    """Run an async coroutine from a sync Celery task."""
    return asyncio.get_event_loop().run_until_complete(coro)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_order_confirmation_email(self, order_id: str) -> dict:
    """Send order confirmation to buyer contacts."""
    try:
        async def _send():
            from sqlalchemy import select
            from app.models.order import Order
            from app.models.user import User
            from app.services.email_service import EmailService
            async with AsyncSessionLocal() as db:
                order = (await db.execute(select(Order).where(Order.id == order_id))).scalar_one_or_none()
                if not order:
                    return {"status": "skipped", "reason": "order_not_found"}
                user = (await db.execute(select(User).where(User.id == order.created_by_id))).scalar_one_or_none()
                if not user:
                    return {"status": "skipped", "reason": "user_not_found"}
                svc = EmailService(db)
                variables = {
                    "order_number": order.order_number,
                    "company_name": order.company.name if order.company else "",
                    "total": str(order.total),
                    "created_at": order.created_at.strftime("%B %d, %Y"),
                }
                ok = await svc.send("order_confirmation", user.email, variables)
                return {"status": "sent" if ok else "failed", "order_id": order_id}
        return _run(_send())
    except Exception as exc:
        delay = 60 * (2 ** self.request.retries)
        raise self.retry(exc=exc, countdown=delay)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_order_shipped_email(self, order_id: str, tracking_number: str = "") -> dict:
    """Send shipping notification with tracking info."""
    try:
        async def _send():
            from sqlalchemy import select
            from app.models.order import Order
            from app.models.user import User
            from app.services.email_service import EmailService
            async with AsyncSessionLocal() as db:
                order = (await db.execute(select(Order).where(Order.id == order_id))).scalar_one_or_none()
                if not order:
                    return {"status": "skipped", "reason": "order_not_found"}
                user = (await db.execute(select(User).where(User.id == order.created_by_id))).scalar_one_or_none()
                if not user:
                    return {"status": "skipped", "reason": "user_not_found"}
                svc = EmailService(db)
                variables = {
                    "order_number": order.order_number,
                    "tracking_number": tracking_number or "N/A",
                }
                ok = await svc.send("order_shipped", user.email, variables)
                return {"status": "sent" if ok else "failed", "order_id": order_id}
        return _run(_send())
    except Exception as exc:
        delay = 60 * (2 ** self.request.retries)
        raise self.retry(exc=exc, countdown=delay)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_wholesale_approved_email(self, application_id: str, company_id: str) -> dict:
    """Notify applicant that their wholesale account was approved."""
    try:
        async def _send():
            from sqlalchemy import select
            from app.models.wholesale import WholesaleApplication
            from app.services.email_service import EmailService
            async with AsyncSessionLocal() as db:
                app = (await db.execute(
                    select(WholesaleApplication).where(WholesaleApplication.id == application_id)
                )).scalar_one_or_none()
                if not app:
                    return {"status": "skipped", "reason": "application_not_found"}
                svc = EmailService(db)
                variables = {
                    "company_name": app.company_name,
                    "contact_name": app.contact_name,
                }
                ok = await svc.send("wholesale_approved", app.contact_email, variables)
                return {"status": "sent" if ok else "failed", "application_id": application_id}
        return _run(_send())
    except Exception as exc:
        delay = 60 * (2 ** self.request.retries)
        raise self.retry(exc=exc, countdown=delay)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_wholesale_rejected_email(self, application_id: str, reason: str) -> dict:
    """Notify applicant that their application was rejected."""
    try:
        async def _send():
            from sqlalchemy import select
            from app.models.wholesale import WholesaleApplication
            from app.services.email_service import EmailService
            async with AsyncSessionLocal() as db:
                app = (await db.execute(
                    select(WholesaleApplication).where(WholesaleApplication.id == application_id)
                )).scalar_one_or_none()
                if not app:
                    return {"status": "skipped", "reason": "application_not_found"}
                svc = EmailService(db)
                variables = {
                    "company_name": app.company_name,
                    "contact_name": app.contact_name,
                    "reason": reason,
                }
                ok = await svc.send("wholesale_rejected", app.contact_email, variables)
                return {"status": "sent" if ok else "failed", "application_id": application_id}
        return _run(_send())
    except Exception as exc:
        delay = 60 * (2 ** self.request.retries)
        raise self.retry(exc=exc, countdown=delay)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_password_reset_email(self, user_id: str, reset_token: str) -> dict:
    """Send password reset link."""
    try:
        async def _send():
            from sqlalchemy import select
            from app.models.user import User
            from app.services.email_service import EmailService
            from app.core.config import settings
            async with AsyncSessionLocal() as db:
                user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
                if not user:
                    return {"status": "skipped", "reason": "user_not_found"}
                svc = EmailService(db)
                reset_url = f"{settings.FRONTEND_URL}/auth/reset-password?token={reset_token}"
                variables = {"name": user.full_name or user.email, "reset_url": reset_url}
                ok = await svc.send("password_reset", user.email, variables)
                return {"status": "sent" if ok else "failed", "user_id": user_id}
        return _run(_send())
    except Exception as exc:
        delay = 60 * (2 ** self.request.retries)
        raise self.retry(exc=exc, countdown=delay)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_email_verification(self, user_id: str, verification_token: str) -> dict:
    """Send email address verification link."""
    try:
        async def _send():
            from sqlalchemy import select
            from app.models.user import User
            from app.services.email_service import EmailService
            from app.core.config import settings
            async with AsyncSessionLocal() as db:
                user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
                if not user:
                    return {"status": "skipped", "reason": "user_not_found"}
                svc = EmailService(db)
                verify_url = f"{settings.FRONTEND_URL}/auth/verify-email?token={verification_token}"
                variables = {"name": user.full_name or user.email, "verify_url": verify_url}
                ok = await svc.send("email_verification", user.email, variables)
                return {"status": "sent" if ok else "failed", "user_id": user_id}
        return _run(_send())
    except Exception as exc:
        delay = 60 * (2 ** self.request.retries)
        raise self.retry(exc=exc, countdown=delay)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_user_invitation_email(self, invited_user_id: str, company_id: str, invite_token: str = "") -> dict:
    """Send portal invitation to a new company user."""
    try:
        async def _send():
            from sqlalchemy import select
            from app.models.user import User
            from app.models.company import Company
            from app.services.email_service import EmailService
            from app.core.config import settings
            async with AsyncSessionLocal() as db:
                user = (await db.execute(select(User).where(User.id == invited_user_id))).scalar_one_or_none()
                company = (await db.execute(select(Company).where(Company.id == company_id))).scalar_one_or_none()
                if not user or not company:
                    return {"status": "skipped", "reason": "user_or_company_not_found"}
                svc = EmailService(db)
                invite_url = f"{settings.FRONTEND_URL}/auth/accept-invite?token={invite_token}" if invite_token else f"{settings.FRONTEND_URL}/auth/login"
                variables = {
                    "name": user.full_name or user.email,
                    "company_name": company.name,
                    "invite_url": invite_url,
                }
                ok = await svc.send("user_invitation", user.email, variables)
                return {"status": "sent" if ok else "failed", "user_id": invited_user_id}
        return _run(_send())
    except Exception as exc:
        delay = 60 * (2 ** self.request.retries)
        raise self.retry(exc=exc, countdown=delay)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_rma_status_email(self, rma_id: str) -> dict:
    """Send RMA status update (approved or rejected)."""
    try:
        async def _send():
            from sqlalchemy import select
            from app.models.rma import RMARequest
            from app.models.user import User
            from app.services.email_service import EmailService
            async with AsyncSessionLocal() as db:
                rma = (await db.execute(select(RMARequest).where(RMARequest.id == rma_id))).scalar_one_or_none()
                if not rma:
                    return {"status": "skipped", "reason": "rma_not_found"}
                user = (await db.execute(select(User).where(User.id == rma.submitted_by_id))).scalar_one_or_none()
                if not user:
                    return {"status": "skipped", "reason": "user_not_found"}
                event = "rma_approved" if rma.status == "approved" else "rma_rejected"
                svc = EmailService(db)
                variables = {
                    "rma_number": rma.rma_number,
                    "status": rma.status,
                    "resolution_notes": rma.admin_notes or "",
                }
                ok = await svc.send(event, user.email, variables)
                return {"status": "sent" if ok else "failed", "rma_id": rma_id}
        return _run(_send())
    except Exception as exc:
        delay = 60 * (2 ** self.request.retries)
        raise self.retry(exc=exc, countdown=delay)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_payment_failed_email(self, order_id: str) -> dict:
    """Notify buyer of a failed payment."""
    try:
        async def _send():
            from sqlalchemy import select
            from app.models.order import Order
            from app.models.user import User
            from app.services.email_service import EmailService
            from app.core.config import settings
            async with AsyncSessionLocal() as db:
                order = (await db.execute(select(Order).where(Order.id == order_id))).scalar_one_or_none()
                if not order:
                    return {"status": "skipped", "reason": "order_not_found"}
                user = (await db.execute(select(User).where(User.id == order.created_by_id))).scalar_one_or_none()
                if not user:
                    return {"status": "skipped", "reason": "user_not_found"}
                svc = EmailService(db)
                retry_url = f"{settings.FRONTEND_URL}/orders/{order_id}"
                variables = {
                    "order_number": order.order_number,
                    "total": str(order.total),
                    "retry_url": retry_url,
                }
                ok = await svc.send("payment_failed", user.email, variables)
                return {"status": "sent" if ok else "failed", "order_id": order_id}
        return _run(_send())
    except Exception as exc:
        delay = 60 * (2 ** self.request.retries)
        raise self.retry(exc=exc, countdown=delay)
