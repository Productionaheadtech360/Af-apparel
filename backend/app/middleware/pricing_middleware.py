"""Pricing middleware — attaches the company's tier discount % to request.state.

This middleware runs AFTER auth_middleware so request.state.pricing_tier_id is
already populated.  For unauthenticated requests the tier_discount_percent is
set to Decimal("0") (retail / no discount).
"""
from decimal import Decimal

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.redis import redis_get, redis_set
from app.core.database import AsyncSessionLocal as async_session_factory

_CACHE_PREFIX = "pricing_tier:"
_CACHE_TTL = 3600


class PricingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        tier_id = getattr(request.state, "pricing_tier_id", None)
        discount_percent = Decimal("0")

        if tier_id:
            cache_key = f"{_CACHE_PREFIX}{tier_id}:discount"
            cached = await redis_get(cache_key)
            if cached is not None:
                discount_percent = Decimal(cached)
            else:
                # Lazy DB lookup — only for authenticated requests on product/cart paths
                try:
                    from app.models.pricing import PricingTier
                    from sqlalchemy import select

                    async with async_session_factory() as session:
                        result = await session.execute(
                            select(PricingTier.discount_percent).where(
                                PricingTier.id == tier_id
                            )
                        )
                        row = result.scalar_one_or_none()
                        if row is not None:
                            discount_percent = row
                            await redis_set(
                                cache_key, str(discount_percent), expire=_CACHE_TTL
                            )
                except Exception:
                    pass  # Graceful fallback to 0%

        request.state.tier_discount_percent = discount_percent
        return await call_next(request)
