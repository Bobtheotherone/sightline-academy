"""App factory + startup sequence (SPEC-002) and SPEC-004 error envelope handlers."""

import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import get_settings, verify_production_readiness
from .db import SessionLocal, init_db
from .errors import ApiError
from .ingest import ingest as ingest_mod
from .routers import admin as admin_router
from .routers import auth as auth_router
from .routers import billing as billing_router
from .routers import course as course_router
from .routers import dev as dev_router
from .routers import instructor as instructor_router
from .routers import journal as journal_router
from .routers import meta as meta_router
from .routers import progress as progress_router
from .routers import tutor as tutor_router
from .services.fixtures import create_fixtures
from .services.seed import run_seed

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("sightline")


def _log_configuration(settings) -> None:
    """Announce the operating mode at boot.

    Ranger previously fell back to corpus-only answers whenever the API key was
    empty, with nothing in the logs to say so — which is exactly why the tutor
    kept appearing offline with no obvious cause. Every mode that changes
    behaviour now names itself here, once, at startup.

    Never logs a key, a prefix of one, or any other secret: booleans, lengths
    and names only.
    """
    logger.info(
        "environment: app_env=%s database=%s paywall=%s",
        settings.app_env,
        "postgres" if not settings.uses_sqlite else "sqlite (local file)",
        "enforced" if settings.paywall_enforced else "OFF",
    )

    degraded = settings.tutor_degraded_reason
    if degraded:
        logger.warning("TUTOR DEGRADED: %s", degraded)
    else:
        logger.info(
            "tutor provider: anthropic (model %s, key length %d)",
            settings.tutor_model,
            len(settings.anthropic_api_key),
        )

    if settings.require_subscription and not settings.billing_configured:
        logger.warning(
            "BILLING NOT CONFIGURED: REQUIRE_SUBSCRIPTION=1 but Stripe is incomplete "
            "— the paywall is disabled so learners are not locked out. "
            "Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and a price id to enable it."
        )
    if not settings.owner_email.strip():
        logger.warning(
            "OWNER_EMAIL is unset — no account will hold funds access or be able "
            "to create faculty accounts."
        )


def _startup() -> None:
    """SPEC-002 §Startup: config → create_all → seed → ingest → warm → serve."""
    settings = get_settings()

    # Fail closed and loud before serving a single request. Every item here is
    # a way the site could come up looking healthy while being unsafe.
    problems = verify_production_readiness(settings)
    if problems:
        for problem in problems:
            logger.critical("PRODUCTION CHECK FAILED: %s", problem)
        raise RuntimeError(
            "Refusing to start in production with "
            f"{len(problems)} unsafe setting(s); see the log above."
        )

    _log_configuration(settings)

    init_db()
    with SessionLocal() as db:
        run_seed(db)
    ingest_mod.ingest_if_needed(force=bool(settings.seed_force))
    ingest_mod.warm_embedder()
    if settings.fixtures:
        with SessionLocal() as db:
            create_fixtures(db)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _startup()
    yield


def _envelope(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
    )


#: Paths that legitimately receive cross-origin POSTs from a third party.
#: Stripe calls the webhook server-to-server; it is authenticated by signature,
#: not by origin, so the origin check must not reject it.
_ORIGIN_EXEMPT_PATHS = frozenset({"/api/billing/webhook"})

_SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Sightline ATV Safety Academy API",
        lifespan=lifespan,
        # The interactive docs enumerate every admin and billing route. Useful
        # while building, needless attack surface once public.
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None,
        openapi_url=None if settings.is_production else "/openapi.json",
    )

    @app.middleware("http")
    async def security_headers_and_origin(request: Request, call_next):
        """Two jobs: reject cross-site writes, and harden every response.

        The session cookie is already ``SameSite=Lax``, which stops the classic
        cross-site form POST on its own. This is defence in depth for the cases
        Lax does not cover, and it fails *open* for requests with no Origin
        header at all — server-to-server callers and older clients send none,
        and rejecting those would break the Stripe webhook.
        """
        if (
            request.method not in _SAFE_METHODS
            and request.url.path not in _ORIGIN_EXEMPT_PATHS
        ):
            origin = request.headers.get("origin")
            if origin:
                allowed = {settings.public_base_url.rstrip("/")}
                # Whatever host the request actually arrived on is also fine;
                # this keeps local dev and preview deploys working without
                # widening anything in production.
                host = request.headers.get("host")
                if host:
                    allowed.add(f"{request.url.scheme}://{host}")
                    allowed.add(f"https://{host}")
                    allowed.add(f"http://{host}")
                if origin.rstrip("/") not in allowed:
                    logger.warning(
                        "blocked cross-origin %s %s from origin %s",
                        request.method,
                        request.url.path,
                        origin,
                    )
                    return _envelope(
                        403, "forbidden", "That request came from an unexpected origin."
                    )

        response = await call_next(request)

        # Applies to API responses; nginx sets the SPA's own headers for static
        # documents. Duplicating the cheap ones here means a direct hit on the
        # API (or a future deploy without nginx) is still covered.
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Permissions-Policy", "geolocation=(), microphone=(), camera=(), payment=()"
        )
        # API responses are JSON; nothing should ever be executed or embedded
        # from them, so the strictest possible policy is also the correct one.
        response.headers.setdefault(
            "Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"
        )
        if settings.is_production or settings.secure_cookies:
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains",
            )
        return response

    app.include_router(auth_router.router, prefix="/api")
    app.include_router(course_router.router, prefix="/api")
    app.include_router(progress_router.router, prefix="/api")
    app.include_router(journal_router.router, prefix="/api")
    app.include_router(tutor_router.router, prefix="/api")
    app.include_router(meta_router.router, prefix="/api")
    app.include_router(instructor_router.router, prefix="/api")
    app.include_router(billing_router.router, prefix="/api")
    app.include_router(admin_router.router, prefix="/api")
    if settings.fixtures:  # QA-002 J2 helper — dev boots only
        app.include_router(dev_router.router, prefix="/api")

    @app.exception_handler(ApiError)
    async def handle_api_error(request: Request, exc: ApiError) -> JSONResponse:
        return _envelope(exc.status_code, exc.code, exc.message)

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        # Reshape 422s into the envelope; first field error becomes the message.
        message = "That request wasn't valid."
        errors = exc.errors()
        if errors:
            raw = str(errors[0].get("msg", message))
            message = raw.removeprefix("Value error, ")
        return _envelope(422, "validation_error", message)

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_error(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        codes = {404: "not_found", 405: "method_not_allowed"}
        return _envelope(
            exc.status_code,
            codes.get(exc.status_code, "http_error"),
            str(exc.detail) if exc.detail else "Request failed.",
        )

    @app.exception_handler(Exception)
    async def handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
        incident_id = uuid.uuid4().hex[:12]
        logger.exception("incident %s: unhandled error on %s %s",
                         incident_id, request.method, request.url.path)
        return _envelope(
            500,
            "internal_error",
            f"Something went wrong on our side. Incident {incident_id}.",
        )

    return app


app = create_app()
