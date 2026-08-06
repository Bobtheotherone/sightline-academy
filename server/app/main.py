"""App factory + startup sequence (SPEC-002) and SPEC-004 error envelope handlers."""

import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import select
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import get_settings
from .db import SessionLocal, init_db
from .errors import ApiError
from .models import Module
from .routers import auth as auth_router
from .routers import meta as meta_router
from .services.fixtures import create_fixture_accounts

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("sightline")


def _startup() -> None:
    settings = get_settings()
    init_db()
    with SessionLocal() as db:
        # Seed hook — the pipeline over content/curriculum/ lands in Wave 1.
        has_modules = db.execute(select(Module.id).limit(1)).first() is not None
        if not has_modules or settings.seed_force:
            logger.info("course tables empty; seed pipeline lands in Wave 1")
        if settings.fixtures:
            create_fixture_accounts(db)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _startup()
    yield


def _envelope(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
    )


def create_app() -> FastAPI:
    app = FastAPI(title="Sightline Safety Academy API", lifespan=lifespan)

    app.include_router(auth_router.router, prefix="/api")
    app.include_router(meta_router.router, prefix="/api")

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
