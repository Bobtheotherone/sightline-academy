"""Journal routes (SPEC-004 §Journal): the Field Journal surface.

PUT /journal/{artifactType} is the autosave path for edits made from the
Journal page itself; the lesson player's journal_builder steps write through
PUT /steps/{stepId}/evidence, which upserts the same rows. XP for a completed
artifact is ref-deduped, so the two paths can never double-award.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import auth as auth_svc
from ..db import get_db
from ..errors import ApiError
from ..models import JournalArtifact, Lesson, Step, User, utc_now_iso
from ..schemas import JournalOut, JournalPutIn, JournalPutOut
from ..services import xp
from ..services.progress import _validate_artifact_fields

router = APIRouter(prefix="/journal", tags=["journal"])


def _artifact_out(row: JournalArtifact) -> dict:
    return {
        "artifact_type": row.artifact_type,
        "title": row.title,
        "fields": row.fields,
        "status": row.status,
        "module_id": row.module_id,
        "updated_at": row.updated_at,
    }


def _journal_step(db: Session, artifact_type: str) -> Step:
    steps = db.execute(select(Step).where(Step.renderer == "journal_builder")).scalars()
    for step in steps:
        if step.payload.get("artifactType") == artifact_type:
            return step
    raise ApiError(404, "not_found", "That Field Journal page doesn't exist.")


@router.get("", response_model=JournalOut)
def get_journal(
    user: User = Depends(auth_svc.current_user), db: Session = Depends(get_db)
) -> JournalOut:
    rows = db.execute(
        select(JournalArtifact).where(JournalArtifact.user_id == user.id)
    ).scalars()
    order = {artifact_type: i for i, artifact_type in enumerate(xp.ARTIFACT_TYPES)}
    ordered = sorted(rows, key=lambda row: order.get(row.artifact_type, len(order)))
    return JournalOut.model_validate({"artifacts": [_artifact_out(r) for r in ordered]})


@router.put("/{artifact_type}", response_model=JournalPutOut)
def put_artifact(
    artifact_type: str,
    body: JournalPutIn,
    user: User = Depends(auth_svc.current_user),
    db: Session = Depends(get_db),
) -> JournalPutOut:
    if artifact_type not in xp.ARTIFACT_TYPES:
        raise ApiError(404, "not_found", "That Field Journal page doesn't exist.")
    if body.status not in ("draft", "complete"):
        raise ApiError(422, "invalid_artifact", "Status must be draft or complete.")
    step = _journal_step(db, artifact_type)
    defs = {f.get("id"): f for f in step.payload.get("fields", [])}
    unknown = set(body.fields) - set(defs)
    if unknown:
        raise ApiError(
            422, "invalid_artifact", f"{sorted(unknown)[0]!r} isn't a field on this artifact."
        )
    if body.status == "complete":
        _validate_artifact_fields(defs, body.fields)

    lesson = db.get(Lesson, step.lesson_id)
    row = db.get(JournalArtifact, f"{user.id}::{artifact_type}")
    was = row.status if row else None
    if row is None:
        row = JournalArtifact(
            id=f"{user.id}::{artifact_type}",
            user_id=user.id,
            artifact_type=artifact_type,
            title=body.title or step.payload.get("title", step.title),
            fields=body.fields,
            status=body.status,
            module_id=lesson.module_id,
        )
        db.add(row)
    else:
        row.fields = body.fields
        if body.title:
            row.title = body.title
        # Autosave never downgrades a completed artifact back to draft.
        if body.status == "complete":
            row.status = "complete"
        row.updated_at = utc_now_iso()
    db.flush()

    if row.status == "complete" and was != "complete":
        xp.award(
            db,
            user.id,
            "journal_artifact_complete",
            label=f"Field Journal: {row.title}",
            ref=f"journal:{artifact_type}",
        )
        if artifact_type == "ride_plan":
            xp.award(
                db,
                user.id,
                "capstone_complete",
                label="Capstone complete: The Ride Plan",
                ref="capstone",
            )
        xp.check_journal_badge(db, user.id)

    db.commit()
    return JournalPutOut.model_validate({"artifact": _artifact_out(row)})
