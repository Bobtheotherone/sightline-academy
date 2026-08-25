"""Meta routes (SPEC-004 §Meta): health for ops and the network-down banner."""

from importlib.metadata import PackageNotFoundError
from importlib.metadata import version as pkg_version

from fastapi import APIRouter, Depends
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..ingest import ingest
from ..models import CourseMeta
from ..schemas import HealthOut

router = APIRouter(prefix="/meta", tags=["meta"])


def _app_version() -> str:
    try:
        return pkg_version("sightline-server")
    except PackageNotFoundError:
        return "0.1.0"


@router.get("/health", response_model=HealthOut)
def health(db: Session = Depends(get_db)) -> HealthOut:
    settings = get_settings()
    try:
        db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception:  # pragma: no cover - only on storage failure
        db_status = "error"

    course = db.execute(select(CourseMeta)).scalar_one_or_none()
    version = course.version if course else _app_version()

    docs = ingest.doc_count()  # cached client/collection — cheap after boot

    key = settings.anthropic_api_key
    degraded_reason = settings.tutor_degraded_reason
    tutor = {
        "provider": settings.provider,
        "model": settings.tutor_model,
        # Booleans only. This endpoint is unauthenticated, so it must never
        # carry key material — not even a prefix or a length.
        "key_present": bool(key),
        "key_well_formed": bool(key) and key.startswith("sk-ant-") and len(key) >= 40,
        "degraded_reason": degraded_reason,
    }

    return HealthOut.model_validate(
        {
            # `status` answers "can this instance serve traffic", because that
            # is what load balancers and container orchestrators act on — a
            # keyless tutor must not cause the platform to cycle a perfectly
            # healthy container. Tutor degradation is reported in `tutor`
            # below, and shouted once at startup, where an operator sees it.
            "status": "ok" if db_status == "ok" and docs > 0 else "degraded",
            "db": db_status,
            "chroma": {"docs": docs},
            "provider": settings.provider,
            "tutor": tutor,
            "version": version,
        }
    )
