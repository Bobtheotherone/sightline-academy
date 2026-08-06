"""Meta routes (SPEC-004 §Meta): health for ops and the network-down banner."""

from importlib.metadata import PackageNotFoundError
from importlib.metadata import version as pkg_version

from fastapi import APIRouter, Depends
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
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

    # Wave 0: Chroma is not wired yet (ingest lands in Wave 1); report 0 docs
    # rather than importing chromadb at request time and slowing boot.
    return HealthOut.model_validate(
        {
            "status": "ok" if db_status == "ok" else "degraded",
            "db": db_status,
            "chroma": {"docs": 0},
            "provider": settings.provider,
            "version": version,
        }
    )
