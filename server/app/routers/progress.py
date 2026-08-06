"""Progress routes (SPEC-004 §Progress): the evidence write path + rollup."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import auth as auth_svc
from ..db import get_db
from ..models import BadgeAward, User, XpEvent
from ..schemas import EvidencePutIn, EvidencePutOut, ProgressOut
from ..services import progress as progress_svc
from ..services import xp

router = APIRouter(tags=["progress"])

RECENT_XP_LIMIT = 15


@router.put("/steps/{step_id}/evidence", response_model=EvidencePutOut)
def put_step_evidence(
    step_id: str,
    body: EvidencePutIn,
    user: User = Depends(auth_svc.current_user),
    db: Session = Depends(get_db),
) -> EvidencePutOut:
    result = progress_svc.put_evidence(db, user, step_id, body)
    return EvidencePutOut.model_validate(result)


@router.get("/progress", response_model=ProgressOut)
def get_progress(
    user: User = Depends(auth_svc.current_user), db: Session = Depends(get_db)
) -> ProgressOut:
    modules, states = progress_svc.course_state(db, user.id)
    total = xp.xp_total(db, user.id)

    held = {
        row.badge_id: row.created_at
        for row in db.execute(
            select(BadgeAward).where(BadgeAward.user_id == user.id)
        ).scalars()
    }
    recent = db.execute(
        select(XpEvent)
        .where(XpEvent.user_id == user.id)
        .order_by(XpEvent.created_at.desc(), XpEvent.id.desc())
        .limit(RECENT_XP_LIMIT)
    ).scalars()

    return ProgressOut.model_validate(
        {
            "modules": [
                {
                    "module_id": m.id,
                    "title": m.title,
                    "percent": states[m.id].percent,
                    "complete": states[m.id].complete,
                    "lessons_completed": states[m.id].lessons_completed,
                    "lessons_total": len(states[m.id].lessons),
                }
                for m in modules
            ],
            "xp_total": total,
            "level": xp.level_for(total),
            "level_progress": xp.level_progress(total),
            "badges": [
                {"id": badge_id, "name": name, "awarded_at": held.get(badge_id)}
                for badge_id, name in xp.BADGES.items()
            ],
            "recent_xp": [progress_svc.xp_event_out(row) for row in recent],
        }
    )
