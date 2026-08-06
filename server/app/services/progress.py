"""The single evidence write path + per-user progress math (SPEC-004/SPEC-006).

PUT /steps/{stepId}/evidence lands here: the value is validated against the
step's renderer contract (SPEC-007), the upsert is idempotent (user::step),
and completion/XP/badges are computed server-side — the client never
self-awards. Every PUT (incomplete saves included) updates learner_state:
an incomplete save IS the step-visit signal for resume.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..errors import ApiError
from ..models import (
    BadgeAward,
    JournalArtifact,
    LearnerState,
    Lesson,
    LessonCompletion,
    Module,
    ModuleCompletion,
    Step,
    StepEvidence,
    User,
    XpEvent,
    utc_now_iso,
)
from ..schemas import EvidencePutIn
from . import xp

EXPECTED_KIND: dict[str, str] = {
    "content": "acknowledgement",
    "prediction_reveal": "prediction",
    "multiple_choice": "choice",
    "sort_categorize": "classification",
    "match": "matches",
    "hotspot_list": "hotspots",
    "branching_decision": "decision_path",
    "structured_response": "written_response",
    "journal_builder": "journal_artifact",
    "reflection": "written_response",
    "lab_objective": "lab_result",
    "checkpoint": "checkpoint_response",
}


def _invalid(message: str) -> ApiError:
    return ApiError(422, "invalid_evidence", message)


# ── Per-renderer validation (SPEC-007 evidence contracts) ────────────────────


def _validate_option_pick(options: list, value: dict, complete: bool, what: str) -> None:
    option_ids = {o.get("id") for o in options}
    chosen = value.get("optionId")
    if chosen not in option_ids:
        raise _invalid(f"{chosen!r} isn't an option on this {what}.")
    first = value.get("firstAttemptOptionId")
    if first is not None and first not in option_ids:
        raise _invalid(f"{first!r} isn't an option on this {what}.")


def _validate_best_found(options: list, value: dict, complete: bool) -> None:
    _validate_option_pick(options, value, complete, "knowledge check")
    if complete:
        best = next(o for o in options if o.get("isBest") is True)
        if value.get("optionId") != best.get("id"):
            raise _invalid("The best answer hasn't been found yet.")


def _validate_text(value: dict, complete: bool, min_length: int) -> None:
    text = value.get("text")
    if text is not None and not isinstance(text, str):
        raise _invalid("Written responses must be text.")
    if complete and len((text or "").strip()) < min_length:
        raise _invalid(f"This response needs at least {min_length} characters.")


def _validate_evidence(step: Step, value: dict, complete: bool) -> None:
    payload = step.payload or {}
    renderer = step.renderer

    if renderer == "content":
        if complete and not value.get("seen"):
            raise _invalid("Reach the end of the reading to continue.")

    elif renderer == "prediction_reveal":
        _validate_option_pick(payload.get("options", []), value, complete, "prediction")

    elif renderer == "multiple_choice":
        _validate_best_found(payload.get("options", []), value, complete)

    elif renderer == "checkpoint":
        inner = payload.get("inner", {})
        if payload.get("mode") == "multiple_choice":
            _validate_best_found(inner.get("options", []), value, complete)
        else:
            _validate_text(value, complete, int(inner.get("minLength", 120)))

    elif renderer == "sort_categorize":
        items = {i.get("id"): i.get("categoryId") for i in payload.get("items", [])}
        category_ids = {c.get("id") for c in payload.get("categories", [])}
        placements = value.get("placements") or {}
        for item_id, category_id in placements.items():
            if item_id not in items:
                raise _invalid(f"{item_id!r} isn't an item in this sort.")
            if category_id not in category_ids:
                raise _invalid(f"{category_id!r} isn't a category in this sort.")
        if complete and placements != items:
            raise _invalid("Every item needs to land in its correct category first.")

    elif renderer == "match":
        pair_ids = {p.get("id") for p in payload.get("pairs", [])}
        matches = value.get("matches") or {}
        unknown = set(matches) - pair_ids
        if unknown:
            raise _invalid(f"{sorted(unknown)[0]!r} isn't a pair in this match.")
        if complete and {k for k, v in matches.items() if v} != pair_ids:
            raise _invalid("All pairs need to be matched first.")

    elif renderer == "hotspot_list":
        hotspot_ids = {h.get("id") for h in payload.get("hotspots", [])}
        visited = value.get("visited") or []
        unknown = set(visited) - hotspot_ids
        if unknown:
            raise _invalid(f"{sorted(unknown)[0]!r} isn't a waypoint on this scene.")
        if complete and set(visited) != hotspot_ids:
            raise _invalid("Every waypoint needs a visit first.")

    elif renderer == "branching_decision":
        nodes = {n.get("id"): n for n in payload.get("nodes", [])}
        path = value.get("path") or []
        terminal = False
        for entry in path:
            node = nodes.get(entry.get("nodeId"))
            if node is None:
                raise _invalid(f"{entry.get('nodeId')!r} isn't a node in this scenario.")
            choice = next(
                (c for c in node.get("choices", []) if c.get("id") == entry.get("choiceId")),
                None,
            )
            if choice is None:
                raise _invalid(
                    f"{entry.get('choiceId')!r} isn't a choice at {entry.get('nodeId')!r}."
                )
            if choice.get("next") is None:
                terminal = True
        if complete and not terminal:
            raise _invalid("The scenario hasn't reached an ending yet.")

    elif renderer == "structured_response":
        _validate_text(value, complete, int(payload.get("minLength", 120)))

    elif renderer == "reflection":
        chips = payload.get("chips") or []
        chip = value.get("chip")
        if chip is not None and chips and chip not in chips:
            raise _invalid(f"{chip!r} isn't one of this reflection's chips.")
        has_text = bool(str(value.get("text") or "").strip())
        if complete and not (chip or has_text):
            raise _invalid("A chip or a few words completes this reflection.")

    elif renderer == "journal_builder":
        fields = value.get("fields") or {}
        defs = {f.get("id"): f for f in payload.get("fields", [])}
        unknown = set(fields) - set(defs)
        if unknown:
            raise _invalid(f"{sorted(unknown)[0]!r} isn't a field on this artifact.")
        if complete:
            _validate_artifact_fields(defs, fields)

    elif renderer == "lab_objective":
        objective_ids = {o.get("id") for o in payload.get("objectives", [])}
        met = value.get("objectivesMet") or []
        unknown = set(met) - objective_ids
        if unknown:
            raise _invalid(f"{sorted(unknown)[0]!r} isn't an objective in this lab.")
        if complete and set(met) != objective_ids:
            raise _invalid("All lab objectives need to be met first.")


def _validate_artifact_fields(defs: dict[str, dict], fields: dict) -> None:
    """Complete-status validation shared by evidence PUTs and journal PUTs."""
    for field_id, spec in defs.items():
        raw = fields.get(field_id)
        options = spec.get("options")
        if options:
            picks = raw if isinstance(raw, list) else [raw]
            if not picks or any(p not in options for p in picks):
                raise _invalid(f'"{spec.get("label", field_id)}" needs a selection.')
        else:
            min_length = int(spec.get("minLength", 1))
            if len(str(raw or "").strip()) < min_length:
                raise _invalid(
                    f'"{spec.get("label", field_id)}" needs at least {min_length} characters.'
                )


# ── Locking (SPEC-006 §Hierarchy & unlocking) ────────────────────────────────


def _completed_module_ids(db: Session, user_id: str) -> set[str]:
    return {
        row[0]
        for row in db.execute(
            select(ModuleCompletion.module_id).where(ModuleCompletion.user_id == user_id)
        )
    }


def locked_map(db: Session, user_id: str, modules: list[Module]) -> dict[str, bool]:
    """Module 1 unlocked; module N+1 unlocks when module N is complete."""
    complete = _completed_module_ids(db, user_id)
    ordered = sorted(modules, key=lambda m: m.order)
    locked: dict[str, bool] = {}
    for i, module in enumerate(ordered):
        locked[module.id] = i > 0 and ordered[i - 1].id not in complete
    return locked


def ensure_module_unlocked(db: Session, user_id: str, module: Module) -> None:
    modules = db.execute(select(Module)).scalars().all()
    if not locked_map(db, user_id, modules).get(module.id, False):
        return
    complete = _completed_module_ids(db, user_id)
    frontier = next(
        m for m in sorted(modules, key=lambda m: m.order) if m.id not in complete
    )
    lesson_ids = {
        row[0]
        for row in db.execute(select(Lesson.id).where(Lesson.module_id == frontier.id))
    }
    done = {
        row[0]
        for row in db.execute(
            select(LessonCompletion.lesson_id).where(
                LessonCompletion.user_id == user_id,
                LessonCompletion.lesson_id.in_(lesson_ids),
            )
        )
    }
    remaining = len(lesson_ids - done)
    plural = "lesson" if remaining == 1 else "lessons"
    raise ApiError(
        403,
        "module_locked",
        f"Finish {frontier.title} first — you're {remaining} {plural} away.",
    )


# ── Progress math ────────────────────────────────────────────────────────────


@dataclass
class LessonState:
    total_required: int = 0
    complete_required: int = 0
    complete: bool = False

    @property
    def percent(self) -> int:
        if self.complete:
            return 100
        if not self.total_required:
            return 0
        return round(100 * self.complete_required / self.total_required)


@dataclass
class ModuleState:
    lessons: dict[str, LessonState] = field(default_factory=dict)
    complete: bool = False
    locked: bool = False

    @property
    def lessons_completed(self) -> int:
        return sum(1 for state in self.lessons.values() if state.complete)

    @property
    def percent(self) -> int:
        if self.complete:
            return 100
        total = sum(state.total_required for state in self.lessons.values())
        done = sum(state.complete_required for state in self.lessons.values())
        return round(100 * done / total) if total else 0


def course_state(db: Session, user_id: str) -> tuple[list[Module], dict[str, ModuleState]]:
    """Per-user lock/percent/complete state for every module and lesson."""
    modules = sorted(db.execute(select(Module)).scalars().all(), key=lambda m: m.order)
    lessons = db.execute(select(Lesson)).scalars().all()

    states = {m.id: ModuleState() for m in modules}
    lesson_module: dict[str, str] = {}
    for lesson in lessons:
        states[lesson.module_id].lessons[lesson.id] = LessonState()
        lesson_module[lesson.id] = lesson.module_id

    for lesson_id, count in db.execute(
        select(Step.lesson_id, func.count()).where(Step.required.is_(True)).group_by(Step.lesson_id)
    ):
        states[lesson_module[lesson_id]].lessons[lesson_id].total_required = count

    for lesson_id, count in db.execute(
        select(StepEvidence.lesson_id, func.count())
        .join(Step, Step.id == StepEvidence.step_id)
        .where(
            StepEvidence.user_id == user_id,
            StepEvidence.complete.is_(True),
            Step.required.is_(True),
        )
        .group_by(StepEvidence.lesson_id)
    ):
        if lesson_id in lesson_module:
            states[lesson_module[lesson_id]].lessons[lesson_id].complete_required = count

    for row in db.execute(
        select(LessonCompletion.lesson_id).where(LessonCompletion.user_id == user_id)
    ):
        lesson_id = row[0]
        if lesson_id in lesson_module:
            states[lesson_module[lesson_id]].lessons[lesson_id].complete = True

    complete_modules = _completed_module_ids(db, user_id)
    locked = locked_map(db, user_id, modules)
    for module in modules:
        states[module.id].complete = module.id in complete_modules
        states[module.id].locked = locked[module.id]
    return modules, states


# ── Wire helpers ─────────────────────────────────────────────────────────────


def evidence_out(row: StepEvidence) -> dict:
    return {
        "step_id": row.step_id,
        "kind": row.kind,
        "value": row.value,
        "complete": row.complete,
        "first_attempt_correct": row.first_attempt_correct,
        "updated_at": row.updated_at,
    }


def xp_event_out(row: XpEvent) -> dict:
    return {
        "id": row.id,
        "event": row.event,
        "xp": row.xp,
        "label": row.label,
        "created_at": row.created_at,
    }


def badge_out(row: BadgeAward) -> dict:
    return {
        "id": row.badge_id,
        "name": xp.BADGES.get(row.badge_id, row.badge_id),
        "awarded_at": row.created_at,
    }


# ── The evidence PUT (SPEC-004 §Progress) ────────────────────────────────────


def put_evidence(db: Session, user: User, step_id: str, body: EvidencePutIn) -> dict:
    step = db.get(Step, step_id)
    if step is None:
        raise ApiError(404, "not_found", "That step isn't part of this course.")
    lesson = db.get(Lesson, step.lesson_id)
    module = db.get(Module, lesson.module_id)
    ensure_module_unlocked(db, user.id, module)

    expected = EXPECTED_KIND[step.renderer]
    if body.kind != expected:
        raise _invalid(
            f"A {step.renderer} step takes {expected!r} evidence, not {body.kind!r}."
        )
    if not isinstance(body.value, dict):
        raise _invalid("Evidence value must be an object.")
    _validate_evidence(step, body.value, body.complete)

    now = utc_now_iso()
    row = db.get(StepEvidence, f"{user.id}::{step.id}")
    was_complete = bool(row and row.complete)
    if row is None:
        row = StepEvidence(
            id=f"{user.id}::{step.id}",
            user_id=user.id,
            step_id=step.id,
            lesson_id=lesson.id,
            module_id=module.id,
            kind=body.kind,
            value=body.value,
            complete=body.complete,
        )
        db.add(row)
    else:
        row.kind = body.kind
        row.value = body.value
        # Re-interaction never loses completion (SPEC-007 shared UX).
        row.complete = row.complete or body.complete
    row.updated_at = now
    newly_complete = row.complete and not was_complete

    # First-attempt recording (knowledge checks) — set once, never overwritten.
    if row.first_attempt_correct is None and _is_knowledge_check(step):
        options = (
            step.payload.get("options")
            if step.renderer == "multiple_choice"
            else step.payload.get("inner", {}).get("options", [])
        )
        best = next(o.get("id") for o in options if o.get("isBest") is True)
        first = body.value.get("firstAttemptOptionId") or body.value.get("optionId")
        row.first_attempt_correct = first == best

    # Every PUT — incomplete saves included — is the step-visit signal.
    state = db.get(LearnerState, user.id)
    if state is None:
        db.add(LearnerState(user_id=user.id, last_lesson_id=lesson.id, last_step_id=step.id))
    else:
        state.last_lesson_id = lesson.id
        state.last_step_id = step.id
        state.updated_at = now
    db.flush()  # session autoflush is off; award checks below query these rows

    awarded: list[XpEvent] = []
    badges: list[BadgeAward] = []

    def grant(event: str, label: str, ref: str) -> None:
        earned = xp.award(db, user.id, event, label=label, ref=ref)
        if earned is not None:
            awarded.append(earned)

    def grant_badge(badge: BadgeAward | None) -> None:
        if badge is not None:
            badges.append(badge)

    if newly_complete and step.required:
        grant("step_complete", f"Step complete: {step.title}", f"step:{step.id}")
    if newly_complete and step.renderer == "lab_objective":
        grant("lab_objectives_met", f"Lab objectives met: {step.title}", f"lab:{step.id}")
    if step.renderer == "branching_decision" and xp.best_path_traversed(
        step.payload, body.value.get("path") or []
    ):
        grant("scenario_best_path", f"Strongest path: {step.title}", f"scenario:{step.id}")
    if step.renderer == "journal_builder":
        _upsert_artifact_from_step(db, user, step, module, row, grant, grant_badge)
    if step.renderer == "checkpoint" and row.complete and row.first_attempt_correct:
        grant_badge(xp.check_scholar_badge(db, user.id))

    lesson_done = module_done = False
    if row.complete and db.get(LessonCompletion, f"{user.id}::{lesson.id}") is None:
        lesson_done = _try_complete_lesson(db, user, lesson, module, grant)
        if lesson_done:
            module_done = _try_complete_module(db, user, module, grant, grant_badge)

    db.commit()
    return {
        "evidence": evidence_out(row),
        "lesson_complete": True if lesson_done else None,
        "module_complete": True if module_done else None,
        "xp_awarded": [xp_event_out(e) for e in awarded],
        "badges_awarded": [badge_out(b) for b in badges],
    }


def _is_knowledge_check(step: Step) -> bool:
    return step.renderer == "multiple_choice" or (
        step.renderer == "checkpoint" and step.payload.get("mode") == "multiple_choice"
    )


def _upsert_artifact_from_step(db, user, step, module, row, grant, grant_badge) -> None:
    payload = step.payload
    artifact_type = payload.get("artifactType")
    art = db.get(JournalArtifact, f"{user.id}::{artifact_type}")
    was = art.status if art else None
    fields = row.value.get("fields") or {}
    if art is None:
        art = JournalArtifact(
            id=f"{user.id}::{artifact_type}",
            user_id=user.id,
            artifact_type=artifact_type,
            title=payload.get("title", step.title),
            fields=fields,
            status="complete" if row.complete else "draft",
            module_id=module.id,
        )
        db.add(art)
    else:
        art.fields = fields
        if row.complete:
            art.status = "complete"
        art.updated_at = utc_now_iso()
    db.flush()
    if art.status == "complete" and was != "complete":
        grant(
            "journal_artifact_complete",
            f"Field Journal: {art.title}",
            f"journal:{artifact_type}",
        )
        if artifact_type == "ride_plan":
            grant("capstone_complete", "Capstone complete: The Ride Plan", "capstone")
        grant_badge(xp.check_journal_badge(db, user.id))


def _try_complete_lesson(db, user, lesson, module, grant) -> bool:
    required_ids = {
        row[0]
        for row in db.execute(
            select(Step.id).where(Step.lesson_id == lesson.id, Step.required.is_(True))
        )
    }
    complete_ids = {
        row[0]
        for row in db.execute(
            select(StepEvidence.step_id).where(
                StepEvidence.user_id == user.id,
                StepEvidence.lesson_id == lesson.id,
                StepEvidence.complete.is_(True),
            )
        )
    }
    if not required_ids <= complete_ids:
        return False
    db.add(
        LessonCompletion(
            id=f"{user.id}::{lesson.id}",
            user_id=user.id,
            lesson_id=lesson.id,
            module_id=module.id,
        )
    )
    db.flush()
    grant("lesson_complete", f"Lesson complete: {lesson.title}", f"lesson:{lesson.id}")
    checkpoint = db.execute(
        select(Step).where(Step.lesson_id == lesson.id, Step.renderer == "checkpoint")
    ).scalar_one_or_none()
    if checkpoint is not None and checkpoint.payload.get("mode") == "multiple_choice":
        evidence = db.get(StepEvidence, f"{user.id}::{checkpoint.id}")
        if evidence is not None and evidence.first_attempt_correct:
            grant(
                "checkpoint_first_try",
                f"Checkpoint first try: {lesson.title}",
                f"checkpoint:{checkpoint.id}",
            )
    return True


def _try_complete_module(db, user, module, grant, grant_badge) -> bool:
    if db.get(ModuleCompletion, f"{user.id}::{module.id}") is not None:
        return False
    lesson_ids = {
        row[0]
        for row in db.execute(select(Lesson.id).where(Lesson.module_id == module.id))
    }
    done = {
        row[0]
        for row in db.execute(
            select(LessonCompletion.lesson_id).where(
                LessonCompletion.user_id == user.id,
                LessonCompletion.lesson_id.in_(lesson_ids),
            )
        )
    }
    if lesson_ids != done:
        return False
    db.add(ModuleCompletion(id=f"{user.id}::{module.id}", user_id=user.id, module_id=module.id))
    grant("module_complete", f"Module complete: {module.title}", f"module:{module.id}")
    grant_badge(xp.award_badge(db, user.id, module.badge_id))
    return True
