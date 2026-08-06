"""Instructor routes (SPEC-004 §Instructor, SPEC-011): one read-only analytics
surface. Aggregate-only by design — no emails, no message text, no per-learner
drill-down anywhere in these payloads.
"""

import csv
import io
import statistics
from collections import Counter
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import auth as auth_svc
from ..db import get_db
from ..models import (
    Certificate,
    Module,
    ModuleCompletion,
    SessionRow,
    Step,
    StepEvidence,
    TutorMessage,
    User,
)
from ..schemas import InstructorOverviewOut
from .tutor import chunk_meta

router = APIRouter(prefix="/instructor", tags=["instructor"])

ACTIVE_WINDOW_DAYS = 7
COMMON_WRONG_LIMIT = 3


def _learner_ids(db: Session) -> set[str]:
    return set(db.execute(select(User.id).where(User.role == "learner")).scalars())


def _active_last_7d(db: Session, learners: set[str]) -> int:
    cutoff = (datetime.now(UTC) - timedelta(days=ACTIVE_WINDOW_DAYS)).isoformat()
    active = set(
        db.execute(
            select(SessionRow.user_id).where(SessionRow.last_seen_at >= cutoff)
        ).scalars()
    ) | set(db.execute(select(User.id).where(User.last_login_at >= cutoff)).scalars())
    return len(active & learners)


def _median_modules_completed(db: Session, learners: set[str]) -> float:
    counts = dict(
        Counter(
            user_id
            for user_id in db.execute(select(ModuleCompletion.user_id)).scalars()
            if user_id in learners
        )
    )
    if not learners:
        return 0.0
    return float(statistics.median(counts.get(user_id, 0) for user_id in learners))


def _module_funnel(db: Session, learners: set[str]) -> list[dict]:
    """Started = any step_evidence in the module; completed = module_completions."""
    modules = db.execute(select(Module).order_by(Module.order)).scalars().all()
    started: dict[str, set[str]] = {}
    for module_id, user_id in db.execute(
        select(StepEvidence.module_id, StepEvidence.user_id).distinct()
    ):
        if user_id in learners:
            started.setdefault(module_id, set()).add(user_id)
    completed = Counter(
        module_id
        for module_id, user_id in db.execute(
            select(ModuleCompletion.module_id, ModuleCompletion.user_id)
        )
        if user_id in learners
    )
    return [
        {
            "module_id": m.id,
            "started": len(started.get(m.id, ())),
            "completed": completed.get(m.id, 0),
        }
        for m in modules
    ]


def _knowledge_check_stats(db: Session, learners: set[str]) -> list[dict]:
    """Per checkpoint MC: first-attempt-correct % + the most-picked wrong
    options with their authored text — the misconception radar (SPEC-011 §3).
    Steps nobody has attempted yet are omitted; sorted lowest-correct-first."""
    checks = [
        step
        for step in db.execute(select(Step).where(Step.renderer == "checkpoint")).scalars()
        if step.payload.get("mode") == "multiple_choice"
    ]
    evidence: dict[str, list[StepEvidence]] = {}
    rows = db.execute(
        select(StepEvidence).where(StepEvidence.step_id.in_([s.id for s in checks]))
    ).scalars()
    for row in rows:
        if row.user_id in learners and row.first_attempt_correct is not None:
            evidence.setdefault(row.step_id, []).append(row)

    stats: list[dict] = []
    for step in checks:
        attempts = evidence.get(step.id, [])
        if not attempts:
            continue
        options = {o["id"]: o for o in step.payload.get("inner", {}).get("options", [])}
        correct = sum(1 for row in attempts if row.first_attempt_correct)
        wrong_picks = Counter(
            pick
            for row in attempts
            if not row.first_attempt_correct
            and (pick := row.value.get("firstAttemptOptionId") or row.value.get("optionId"))
            in options
        )
        stats.append(
            {
                "step_id": step.id,
                "prompt": step.payload.get("inner", {}).get("prompt", step.title),
                "first_attempt_correct_pct": round(100 * correct / len(attempts), 1),
                "common_wrong": [
                    {
                        "option_id": option_id,
                        "text": options[option_id].get("text", option_id),
                        "pct": round(100 * count / len(attempts), 1),
                    }
                    for option_id, count in wrong_picks.most_common(COMMON_WRONG_LIMIT)
                ],
            }
        )
    stats.sort(key=lambda s: s["first_attempt_correct_pct"])
    return stats


def _tutor_themes(db: Session, learners: set[str]) -> tuple[list[dict], list[dict]]:
    """Answered questions bucketed by the matched corpus topic (chunk ids logged
    on tutor_messages, resolved via the corpus front-matter reader); triage
    events tallied separately by category. No message text leaves this function."""
    topics: Counter[str] = Counter()
    triage: Counter[str] = Counter()
    rows = db.execute(
        select(TutorMessage.user_id, TutorMessage.sources, TutorMessage.triage_category)
        .where(TutorMessage.role == "assistant")
    )
    for user_id, sources, triage_category in rows:
        if user_id not in learners:
            continue
        if triage_category:
            triage[triage_category] += 1
            continue
        topic = next(
            (meta[2] for cid in sources or [] if (meta := chunk_meta().get(cid))), "general"
        )
        topics[topic] += 1
    themes = [{"topic": t, "count": n} for t, n in topics.most_common()]
    triage_counts = [{"category": c, "count": n} for c, n in triage.most_common()]
    return themes, triage_counts


@router.get("/overview", response_model=InstructorOverviewOut)
def overview(
    user: User = Depends(auth_svc.require_instructor), db: Session = Depends(get_db)
) -> InstructorOverviewOut:
    learners = _learner_ids(db)
    certificates = sum(
        1
        for user_id in db.execute(select(Certificate.user_id)).scalars()
        if user_id in learners
    )
    themes, triage_counts = _tutor_themes(db, learners)
    return InstructorOverviewOut.model_validate(
        {
            "learners": len(learners),
            "active_last7d": _active_last_7d(db, learners),
            "certificates_issued": certificates,
            "median_modules_completed": _median_modules_completed(db, learners),
            "module_funnel": _module_funnel(db, learners),
            "knowledge_check_stats": _knowledge_check_stats(db, learners),
            "tutor_themes": themes,
            "triage_counts": triage_counts,
        }
    )


@router.get("/export.csv")
def export_csv(
    user: User = Depends(auth_svc.require_instructor), db: Session = Depends(get_db)
) -> Response:
    """CSV of the funnel + check stats (no emails — SPEC-004)."""
    learners = _learner_ids(db)
    titles = {m.id: m.title for m in db.execute(select(Module)).scalars()}

    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\r\n")
    writer.writerow(["module_id", "module_title", "started", "completed"])
    for row in _module_funnel(db, learners):
        writer.writerow(
            [row["module_id"], titles.get(row["module_id"], ""), row["started"], row["completed"]]
        )
    writer.writerow([])
    writer.writerow(
        [
            "step_id",
            "prompt",
            "first_attempt_correct_pct",
            "most_picked_wrong_option",
            "most_picked_wrong_text",
            "most_picked_wrong_pct",
        ]
    )
    for stat in _knowledge_check_stats(db, learners):
        top = stat["common_wrong"][0] if stat["common_wrong"] else None
        writer.writerow(
            [
                stat["step_id"],
                stat["prompt"],
                stat["first_attempt_correct_pct"],
                top["option_id"] if top else "",
                top["text"] if top else "",
                top["pct"] if top else "",
            ]
        )
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="sightline-instructor-export.csv"'
        },
    )
