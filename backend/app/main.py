"""FastAPI application factory."""
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import check_db_connection
from app.core.exceptions import AppException
from app.core.redis import check_redis_connection
from app.middleware.audit_middleware import AuditMiddleware
from app.middleware.auth_middleware import AuthMiddleware


# ── Sentry ────────────────────────────────────────────────────────────────────
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.APP_ENV,
        traces_sample_rate=0.1,
    )


# ── App factory ───────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup: verify connections
    assert await check_db_connection(), "Database connection failed on startup"
    assert await check_redis_connection(), "Redis connection failed on startup"
    yield
    # Shutdown: nothing to clean up (connection pools handle their own teardown)


app = FastAPI(
    title="AF Apparels B2B Wholesale API",
    description="B2B wholesale e-commerce platform API",
    version="1.0.0",
    docs_url="/docs" if settings.APP_ENV != "production" else None,
    redoc_url="/redoc" if settings.APP_ENV != "production" else None,
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Custom middleware (order matters: outermost runs first) ───────────────────
app.add_middleware(AuditMiddleware)
app.add_middleware(AuthMiddleware)


# ── Global exception handler ──────────────────────────────────────────────────
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "details": exc.details,
            }
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    if settings.DEBUG:
        raise exc
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred"}},
    )


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    db_ok = await check_db_connection()
    redis_ok = await check_redis_connection()
    return {
        "status": "ok" if (db_ok and redis_ok) else "degraded",
        "db": "ok" if db_ok else "error",
        "redis": "ok" if redis_ok else "error",
    }


# ── Routers ───────────────────────────────────────────────────────────────────
from app.api.v1 import auth, products, cart, checkout, orders, account, webhooks
from app.api.v1.admin import customers, pricing as admin_pricing, shipping as admin_shipping, settings as admin_settings, orders as admin_orders, reports as admin_reports, quickbooks as admin_quickbooks
from app.middleware.pricing_middleware import PricingMiddleware

# Register PricingMiddleware (runs after AuthMiddleware injects pricing_tier_id)
app.add_middleware(PricingMiddleware)

_V1 = "/api/v1"
app.include_router(auth.router, prefix=_V1)
app.include_router(products.router, prefix=_V1)
app.include_router(cart.router, prefix=_V1)
app.include_router(checkout.router, prefix=_V1)
app.include_router(orders.router, prefix=_V1)
app.include_router(account.router, prefix=_V1)
app.include_router(webhooks.router, prefix=_V1)
app.include_router(customers.router, prefix=_V1)
app.include_router(admin_pricing.router, prefix=_V1)
app.include_router(admin_shipping.router, prefix=_V1)
app.include_router(admin_settings.router, prefix=_V1)
app.include_router(admin_orders.router, prefix=_V1)
app.include_router(admin_reports.router, prefix=_V1)
app.include_router(admin_quickbooks.router, prefix=_V1)
