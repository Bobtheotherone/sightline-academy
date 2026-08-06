"""XP, levels, badges — SPEC-009 verbatim. Server-authoritative; the client
never self-awards. Unit-tested per QA-003.

The forbidden-signals list is enforced in code: any attempt to award XP whose
event name or metadata carries a speed/streak/rank-style signal raises, and a
`risky` branch choice never awards anything.
"""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import BadgeAward, JournalArtifact, Step, StepEvidence, XpEvent, utc_now_iso

# ── XP rules (SPEC-009 table) ────────────────────────────────────────────────

XP_RULES: dict[str, int] = {
    "step_complete": 5,
    "lesson_complete": 25,
    "checkpoint_first_try": 15,
    "module_complete": 75,
    "journal_artifact_complete": 30,
    "scenario_best_path": 10,
    "lab_objectives_met": 20,
    "capstone_complete": 100,
    "final_assessment_passed": 150,
    "tutor_first_question": 5,
}

FORBIDDEN_SIGNALS = (
    "speed",
    "time_to_complete",
    "fastest",
    "streak",
    "rank",
    "leaderboard",
    "risky_choice_bonus",
)


class ForbiddenSignalError(ValueError):
    """An award attempt carried a pressure signal SPEC-009 bans outright."""


def _scan(text: str, where: str) -> None:
    lowered = text.lower()
    for signal in FORBIDDEN_SIGNALS:
        if signal in lowered:
            raise ForbiddenSignalError(
                f"forbidden signal {signal!r} in {where} — SPEC-009 bans "
                "speed/streak/rank-style XP outright"
            )


def award(
    db: Session,
    user_id: str,
    event: str,
    *,
    label: str,
    ref: str | None = None,
    metadata: dict | None = None,
) -> XpEvent | None:
    """Insert one XP event. Returns None when `ref` was already awarded
    (every rule fires once per subject). Raises on forbidden signals,
    risky-choice awards, and unknown events."""
    _scan(event, "event name")
    if metadata:
        for key, value in metadata.items():
            _scan(str(key), "metadata")
            _scan(str(value), "metadata")
        if str(metadata.get("quality", "")).lower() == "risky":
            raise ForbiddenSignalError(
                "risky branch choices never award XP (SPEC-009)"
            )
    if event not in XP_RULES:
        raise ValueError(f"unknown XP event {event!r}")

    if ref is not None:
        existing = db.execute(
            select(XpEvent.id)
            .where(XpEvent.user_id == user_id, XpEvent.event == event, XpEvent.ref == ref)
            .limit(1)
        ).first()
        if existing is not None:
            return None

    row = XpEvent(
        id=str(uuid.uuid4()),
        user_id=user_id,
        event=event,
        xp=XP_RULES[event],
        label=label,
        ref=ref,
        created_at=utc_now_iso(),
    )
    db.add(row)
    return row


def xp_total(db: Session, user_id: str) -> int:
    total = db.execute(
        select(func.coalesce(func.sum(XpEvent.xp), 0)).where(XpEvent.user_id == user_id)
    ).scalar_one()
    return int(total)


# ── Levels (SPEC-009 §Levels) ────────────────────────────────────────────────

LEVELS: list[tuple[int, str]] = [
    (0, "Trailhead"),
    (100, "Greenhorn"),
    (250, "Pathfinder"),
    (450, "Trailhand"),
    (700, "Ridge Runner"),
    (1000, "Wayfinder"),
    (1400, "Trail Boss"),
]


def level_for(xp: int) -> int:
    """1-based level for a cumulative XP total."""
    level = 1
    for index, (threshold, _title) in enumerate(LEVELS):
        if xp >= threshold:
            level = index + 1
    return level


def level_title(level: int) -> str:
    return LEVELS[min(max(level - 1, 0), len(LEVELS) - 1)][1]


def level_progress(xp: int) -> float:
    """0..1 progress toward the next level threshold; 1.0 at Trail Boss."""
    level = level_for(xp)
    if level >= len(LEVELS):
        return 1.0
    floor = LEVELS[level - 1][0]
    ceiling = LEVELS[level][0]
    return round((xp - floor) / (ceiling - floor), 4)


# ── Scenario paths (branching_decision, SPEC-007 §7) ─────────────────────────


def best_path_traversed(payload: dict, path: list[dict]) -> bool:
    """True when the learner has, at some point in this traversal, taken the
    best choice at every node on the authored best chain (revisits count).
    Risky picks never contribute — only quality == 'best' choices qualify."""
    nodes = {n.get("id"): n for n in payload.get("nodes", [])}
    taken = {(entry.get("nodeId"), entry.get("choiceId")) for entry in path}
    node_id = payload.get("startNode")
    visited: set[str] = set()
    while node_id is not None and node_id not in visited:
        visited.add(node_id)
        node = nodes.get(node_id)
        if node is None:
            return False
        best = next(
            (c for c in node.get("choices", []) if c.get("quality") == "best"), None
        )
        if best is None or (node_id, best.get("id")) not in taken:
            return False
        node_id = best.get("next")
    return True


# ── Badges (SPEC-009 §Badges) ────────────────────────────────────────────────

BADGES: dict[str, str] = {
    "b-mindset": "Clear Eyes",
    "b-mechanic": "Walkaround Ready",
    "b-geared": "Geared Up",
    "b-terrain": "Terrain Reader",
    "b-prepared": "Storm Smart",
    "b-roadwise": "Road Wise",
    "b-journal": "Field Scribe",
    "b-scholar": "Sharp Eye",
    "b-graduate": "Sightline Safety Academy Graduate",
}

ARTIFACT_TYPES = (
    "risk_profile",
    "inspection_log",
    "gear_card",
    "hazard_brief",
    "readiness_plan",
    "ride_plan",
)

SCHOLAR_TARGET = 10  # checkpoint first-try bests for b-scholar


def award_badge(db: Session, user_id: str, badge_id: str) -> BadgeAward | None:
    """Idempotent badge award (pk user::badge). Returns None when already held."""
    if badge_id not in BADGES:
        raise ValueError(f"unknown badge {badge_id!r}")
    row_id = f"{user_id}::{badge_id}"
    if db.get(BadgeAward, row_id) is not None:
        return None
    row = BadgeAward(
        id=row_id, user_id=user_id, badge_id=badge_id, created_at=utc_now_iso()
    )
    db.add(row)
    return row


def check_journal_badge(db: Session, user_id: str) -> BadgeAward | None:
    """b-journal (Field Scribe): all 6 artifacts complete."""
    complete = db.execute(
        select(func.count()).select_from(JournalArtifact).where(
            JournalArtifact.user_id == user_id, JournalArtifact.status == "complete"
        )
    ).scalar_one()
    if complete >= len(ARTIFACT_TYPES):
        return award_badge(db, user_id, "b-journal")
    return None


def check_scholar_badge(db: Session, user_id: str) -> BadgeAward | None:
    """b-scholar (Sharp Eye): 10 checkpoint first-try bests."""
    count = db.execute(
        select(func.count())
        .select_from(StepEvidence)
        .join(Step, Step.id == StepEvidence.step_id)
        .where(
            StepEvidence.user_id == user_id,
            StepEvidence.first_attempt_correct.is_(True),
            Step.renderer == "checkpoint",
        )
    ).scalar_one()
    if count >= SCHOLAR_TARGET:
        return award_badge(db, user_id, "b-scholar")
    return None


def on_certificate_issued(db: Session, user_id: str) -> BadgeAward | None:
    """b-graduate fires when the certificate issues — the Wave 2 assessment
    endpoint calls this after inserting the certificates row."""
    return award_badge(db, user_id, "b-graduate")
