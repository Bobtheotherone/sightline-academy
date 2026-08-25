"""Course read routes (SPEC-004 §Course): map, module detail, lesson player."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import auth as auth_svc
from ..db import get_db
from ..errors import ApiError
from ..models import CourseMeta, Lesson, Module, Step, StepEvidence, User
from ..schemas import CourseOut, LessonDetailOut, ModuleDetailOut
from ..services import entitlements as ent_svc
from ..services import progress as progress_svc
from ..services.seed import COURSE_ID

router = APIRouter(tags=["course"])


def _module_out(module: Module, state: progress_svc.ModuleState) -> dict:
    return {
        "id": module.id,
        "order": module.order,
        "title": module.title,
        "tagline": module.tagline,
        "mission": module.mission,
        "estimated_minutes": module.estimated_minutes,
        "objectives": module.objectives,
        "badge_id": module.badge_id,
        "hero_slot": module.hero_slot,
        "percent": state.percent,
        "complete": state.complete,
        "locked": state.locked,
    }


def _lesson_summary(lesson: Lesson, state: progress_svc.LessonState) -> dict:
    return {
        "id": lesson.id,
        "module_id": lesson.module_id,
        "order": lesson.order,
        "title": lesson.title,
        "summary": lesson.summary,
        "estimated_minutes": lesson.estimated_minutes,
        "sections_present": lesson.sections_present,
        "percent": state.percent,
        "complete": state.complete,
    }


@router.get("/course", response_model=CourseOut)
def get_course(
    user: User = Depends(auth_svc.current_user), db: Session = Depends(get_db)
) -> CourseOut:
    meta = db.get(CourseMeta, COURSE_ID)
    if meta is None:
        raise ApiError(503, "course_not_seeded", "The course content isn't loaded yet.")
    modules, states = progress_svc.course_state(db, user.id)
    return CourseOut.model_validate(
        {
            "course": {
                "id": meta.id,
                "title": meta.title,
                "tagline": meta.tagline,
                "version": meta.version,
                "module_order": meta.module_order,
            },
            "modules": [_module_out(m, states[m.id]) for m in modules],
        }
    )


@router.get("/modules/{module_id}", response_model=ModuleDetailOut)
def get_module(
    module_id: str,
    user: User = Depends(auth_svc.current_user),
    db: Session = Depends(get_db),
) -> ModuleDetailOut:
    # The course map at /course stays readable without a subscription so a
    # visitor can see what they would be buying; the lessons themselves do not.
    ent_svc.require_course_access(db, user)
    module = db.get(Module, module_id)
    if module is None:
        raise ApiError(404, "not_found", "That module isn't on this trail map.")
    _, states = progress_svc.course_state(db, user.id)
    state = states[module.id]
    lessons = sorted(
        db.execute(select(Lesson).where(Lesson.module_id == module.id)).scalars(),
        key=lambda lesson: lesson.order,
    )
    return ModuleDetailOut.model_validate(
        {
            "module": _module_out(module, state),
            "lessons": [_lesson_summary(les, state.lessons[les.id]) for les in lessons],
        }
    )


@router.get("/lessons/{lesson_id}", response_model=LessonDetailOut)
def get_lesson(
    lesson_id: str,
    user: User = Depends(auth_svc.current_user),
    db: Session = Depends(get_db),
) -> LessonDetailOut:
    ent_svc.require_course_access(db, user)
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        raise ApiError(404, "not_found", "That lesson isn't on this trail map.")
    module = db.get(Module, lesson.module_id)
    progress_svc.ensure_module_unlocked(db, user.id, module)

    _, states = progress_svc.course_state(db, user.id)
    steps = sorted(
        db.execute(select(Step).where(Step.lesson_id == lesson.id)).scalars(),
        key=lambda step: step.order,
    )
    evidence = db.execute(
        select(StepEvidence).where(
            StepEvidence.user_id == user.id, StepEvidence.lesson_id == lesson.id
        )
    ).scalars()
    return LessonDetailOut.model_validate(
        {
            "lesson": _lesson_summary(lesson, states[module.id].lessons[lesson.id]),
            "steps": [
                {
                    "id": s.id,
                    "order": s.order,
                    "section": s.section,
                    "renderer": s.renderer,
                    "title": s.title,
                    "minutes": s.minutes,
                    "required": s.required,
                    "payload": s.payload,
                }
                for s in steps
            ],
            "evidence": {row.step_id: progress_svc.evidence_out(row) for row in evidence},
        }
    )
