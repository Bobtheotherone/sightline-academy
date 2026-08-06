"""Dev-only fixture helpers, mounted ONLY when FIXTURES=1 (QA-002 J2).

POST /dev/complete-module writes honest, contract-valid evidence for every
required step of one module for the CURRENT user — through the real progress
service, so lesson/module completion, XP, badges, and journal artifacts all
cascade exactly as they would from the player. Module locking still applies:
complete modules in course order, like a learner would.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import auth as auth_svc
from ..db import get_db
from ..errors import ApiError
from ..models import Lesson, Module, Step, StepEvidence, User
from ..schemas import ApiModel, BadgeOut, EvidencePutIn, XpEventOut
from ..services import progress as progress_svc
from ..services.fixtures import complete_value

router = APIRouter(prefix="/dev", tags=["dev"])


class DevCompleteModuleIn(ApiModel):
    module_id: str


class DevCompleteModuleOut(ApiModel):
    module_id: str
    steps_completed: int
    module_complete: bool
    xp_awarded: list[XpEventOut]
    badges_awarded: list[BadgeOut]


@router.post("/complete-module", response_model=DevCompleteModuleOut)
def complete_module(
    body: DevCompleteModuleIn,
    user: User = Depends(auth_svc.current_user),
    db: Session = Depends(get_db),
) -> DevCompleteModuleOut:
    module = db.get(Module, body.module_id)
    if module is None:
        raise ApiError(404, "not_found", "That module isn't on this trail map.")

    lessons = sorted(
        db.execute(select(Lesson).where(Lesson.module_id == module.id)).scalars(),
        key=lambda lesson: lesson.order,
    )
    steps_completed = 0
    module_complete = False
    xp_awarded: list[dict] = []
    badges_awarded: list[dict] = []
    for lesson in lessons:
        steps = sorted(
            db.execute(
                select(Step).where(Step.lesson_id == lesson.id, Step.required.is_(True))
            ).scalars(),
            key=lambda step: step.order,
        )
        for step in steps:
            existing = db.get(StepEvidence, f"{user.id}::{step.id}")
            if existing is not None and existing.complete:
                continue
            kind, value, _first = complete_value(step)
            result = progress_svc.put_evidence(
                db, user, step.id, EvidencePutIn(kind=kind, value=value, complete=True)
            )
            steps_completed += 1
            xp_awarded.extend(result["xp_awarded"])
            badges_awarded.extend(result["badges_awarded"])
            if result["module_complete"]:
                module_complete = True

    return DevCompleteModuleOut.model_validate(
        {
            "module_id": module.id,
            "steps_completed": steps_completed,
            "module_complete": module_complete,
            "xp_awarded": xp_awarded,
            "badges_awarded": badges_awarded,
        }
    )
