"""EmailService — DB-stored Jinja2 templates + SendGrid delivery."""
import json
import logging
from uuid import UUID

from jinja2 import BaseLoader, Environment, TemplateError
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import NotFoundError
from app.models.communication import EmailTemplate

logger = logging.getLogger(__name__)

_jinja_env = Environment(loader=BaseLoader(), autoescape=True)


class EmailService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_template(self, trigger_event: str) -> EmailTemplate:
        result = await self.db.execute(
            select(EmailTemplate).where(
                EmailTemplate.trigger_event == trigger_event,
                EmailTemplate.is_active.is_(True),
            )
        )
        tpl = result.scalar_one_or_none()
        if not tpl:
            raise NotFoundError(f"Email template '{trigger_event}' not found or inactive")
        return tpl

    async def get_template_by_id(self, template_id: UUID) -> EmailTemplate:
        result = await self.db.execute(
            select(EmailTemplate).where(EmailTemplate.id == template_id)
        )
        tpl = result.scalar_one_or_none()
        if not tpl:
            raise NotFoundError(f"Email template {template_id} not found")
        return tpl

    async def list_templates(self) -> list[EmailTemplate]:
        result = await self.db.execute(select(EmailTemplate).order_by(EmailTemplate.trigger_event))
        return list(result.scalars().all())

    def render_template(self, template_str: str, variables: dict) -> str:
        try:
            tpl = _jinja_env.from_string(template_str)
            return tpl.render(**variables)
        except TemplateError as exc:
            logger.error("Template render error: %s", exc)
            return template_str  # fallback — return unrendered

    async def render(self, trigger_event: str, variables: dict) -> dict:
        """Returns rendered {subject, body_html, body_text}."""
        tpl = await self.get_template(trigger_event)
        return {
            "subject": self.render_template(tpl.subject, variables),
            "body_html": self.render_template(tpl.body_html, variables),
            "body_text": self.render_template(tpl.body_text, variables) if tpl.body_text else None,
        }

    async def send(self, trigger_event: str, to_email: str, variables: dict) -> bool:
        """Render template and send via SendGrid. Returns True on success."""
        rendered = await self.render(trigger_event, variables)
        return self._send_via_sendgrid(
            to_email=to_email,
            subject=rendered["subject"],
            body_html=rendered["body_html"],
            body_text=rendered.get("body_text"),
        )

    def _send_via_sendgrid(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: str | None = None,
    ) -> bool:
        if not settings.SENDGRID_API_KEY:
            logger.warning("SENDGRID_API_KEY not set — skipping email to %s", to_email)
            return False
        message = Mail(
            from_email=(settings.EMAIL_FROM_ADDRESS, settings.EMAIL_FROM_NAME),
            to_emails=to_email,
            subject=subject,
            html_content=body_html,
            plain_text_content=body_text,
        )
        try:
            sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
            response = sg.send(message)
            if response.status_code >= 400:
                logger.error("SendGrid error %s for %s", response.status_code, to_email)
                return False
            return True
        except Exception as exc:
            logger.error("SendGrid exception for %s: %s", to_email, exc)
            return False

    @staticmethod
    def get_available_variables(tpl: EmailTemplate) -> list[str]:
        if not tpl.available_variables:
            return []
        try:
            return json.loads(tpl.available_variables)
        except (ValueError, TypeError):
            return []
