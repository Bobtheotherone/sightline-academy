"""QA-001 crawl fixture accounts (dev-only; created when FIXTURES=1).

Three accounts whose seeded state makes every route-manifest state reachable:
fresh@ (zero progress), mid@ (Modules 1-2 complete, mid-Module-3, 340 XP,
12-message tutor history), grad@ (everything complete, certificate issued).

Step lists and payloads are derived from the seeded course tables — nothing
here hardcodes step structure, only the hand-written learner prose. Rebuilt
idempotently on every FIXTURES=1 boot so the crawl always sees the same state.
"""

import hashlib
import logging
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import hash_password
from ..models import (
    AssessmentAttempt,
    BadgeAward,
    Certificate,
    CourseMeta,
    JournalArtifact,
    LearnerState,
    Lesson,
    LessonCompletion,
    Module,
    ModuleCompletion,
    Step,
    StepEvidence,
    TutorMessage,
    User,
    XpEvent,
    utc_now_iso,
)
from . import xp
from .seed import COURSE_ID

logger = logging.getLogger("sightline.fixtures")

FIXTURE_PASSWORD = "crawl-pass"
CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


# ── Hand-written learner prose (authored voice; no placeholders) ─────────────

ARTIFACT_FIELDS: dict[str, dict[str, object]] = {
    "risk_profile": {
        "experience": "Some rides, still learning the machine",
        "likely_leak": (
            "Group gravity. When everyone else rolls through something, stopping "
            "feels like a big statement — especially when I'm at the back."
        ),
        "riding_context": (
            "Wooded farm trails and gravel connectors, usually two of us, "
            "20-40 minutes from a road with cell signal."
        ),
        "commitments": (
            "1) Helmet fastened before the engine starts, even to move it across "
            "the yard. 2) If I can't see the bottom of a water crossing, I don't "
            "cross it."
        ),
    },
    "inspection_log": {
        "sequence": (
            "Tires first — press each one, look for anything soft or new damage. "
            "Controls — throttle snaps back, both brakes feel firm. Lights — head "
            "and tail actually on. Oil & fuel — level, and a look under for drips. "
            "Chassis — grab and shake the racks, scan for anything loose or cracked."
        ),
        "no_go": (
            "A spongy brake lever, a tire that's visibly lower than yesterday, or "
            "any fresh drip under the engine. Any one of those parks it."
        ),
        "defer": (
            "I do pressure, bulbs, and tightening. Brakes, leaks, and anything "
            "inside the engine go to the shop."
        ),
    },
    "gear_card": {
        "every_ride": (
            "DOT helmet — the matte gray one that actually fits, strap snug. "
            "Clear goggles. Over-ankle leather boots. Full-finger gloves. Long "
            "sleeves and pants, no exceptions for heat."
        ),
        "conditional": (
            "Rain shell and spare gloves when the forecast shows any chance of "
            "rain; high-vis vest for the gravel connector near the county road."
        ),
        "condition_check": (
            "Helmet is three seasons old — check the liner this fall. Goggle "
            "strap is fraying."
        ),
        "gap": "Chest protection",
    },
    "hazard_brief": {
        "top_hazards": (
            "1) Washouts on the creek-side trail after storms — cue is fresh "
            "gravel fans across the track. 2) Wet leaf-covered clay on the north "
            "slope — cue is shade plus recent rain. 3) Farm equipment on the "
            "gravel connector — cue is fresh wide tire prints."
        ),
        "envelope_rule": (
            "If I catch myself wondering whether the side-slope is too steep, "
            "it already is — find different ground."
        ),
        "scan_habit": (
            "I stop scanning when I'm following someone. Reset cue: every time "
            "their dust or distance changes, eyes back up to my own line."
        ),
    },
    "readiness_plan": {
        "contact": (
            "Sam gets the route and window by text before I leave. Check-in is a "
            "text by 6pm; if it's missed, call twice, then call the county "
            "non-emergency line with my route card."
        ),
        "turnaround": (
            "Halfway to sunset minus an hour, set before I leave the driveway — "
            "the phone alarm is the decision, not me."
        ),
        "kit": (
            "Tow strap, first-aid kit, headlamp, lighter, water, multi-tool, "
            "phone in a chest pocket, and a paper card with Sam's number. To "
            "add: a proper pressure gauge."
        ),
        "first_minutes": (
            "Stop — engines off, make the scene safe. Assess — people first, "
            "believe symptoms over 'I'm fine'. Communicate — call early, while "
            "choices still exist."
        ),
    },
    "ride_plan": {
        "ride": (
            "Saturday morning loop: creek-side trail to the ridge cut, back on "
            "the gravel connector. Riding with Sam. Wooded single-track, one "
            "water crossing, two hours planned."
        ),
        "machine": (
            "The 450 utility — fit checked this spring, reach and stance both "
            "pass. Walkaround before start: tires, controls, lights, oil & fuel, "
            "chassis — same order every time, no skipping the shake test."
        ),
        "gear": (
            "Every-ride set: gray DOT helmet snugged, clear goggles, over-ankle "
            "boots, gloves, long sleeves and pants. This ride adds the rain "
            "shell and the high-vis vest for the connector."
        ),
        "hazards": (
            "Washouts near the creek — watching for gravel fans; shaded clay on "
            "the north slope stays no-go if it rained overnight. Envelope rule "
            "rides along: if I'm wondering about the side-slope, it's too steep."
        ),
        "conditions": (
            "What's different today gets asked in the driveway. Turnaround is "
            "11:30, set before leaving — halfway to lunch commitments minus "
            "margin, alarm on the phone."
        ),
        "comms": (
            "Sam has the route card; check-in text by 1pm. Missed check-in: two "
            "calls, then the county non-emergency line. Kit rides in the rear "
            "bag: tow strap, first aid, headlamp, water, multi-tool."
        ),
        "lines": (
            "Helmet fastened before the engine starts, every time. No crossing "
            "water I can't see the bottom of. Go/no-go: standing water in the "
            "yard's low spot cancels the creek trail outright."
        ),
    },
}

# Mid has two authored drafts (manifest: inspection_log + gear_card in draft).
DRAFT_FIELDS: dict[str, dict[str, object]] = {
    "inspection_log": {
        "sequence": (
            "Tires first — press each one, look for anything soft. Controls — "
            "throttle snaps back, brakes firm. Still writing the last three zones."
        ),
    },
    "gear_card": {
        "every_ride": (
            "DOT helmet — the matte gray one that actually fits. Goggles, "
            "over-ankle boots, gloves, long sleeves."
        ),
    },
}

STEP_TEXTS: dict[str, str] = {
    # m6-l4-s3 — final structured checkpoint (minLength 200).
    "m6-l4-s3": (
        "1) If the creek at the first crossing is higher than the flat rock I "
        "use as a gauge, the loop becomes the ridge out-and-back — I decide "
        "right there on the bank, before wheels touch water. 2) If Sam cancels, "
        "the ride shortens to the front pasture trails where I'm never more "
        "than ten minutes from the house — I decide the moment the text "
        "arrives, and I re-send the new plan to my contact before leaving."
    ),
}

TUTOR_SCRIPT: list[dict] = [
    {"role": "user", "content": "What's the T-CLOC walkaround again?"},
    {
        "role": "assistant",
        "grounding": "curriculum",
        "sources": ["machine-tclot-walkaround"],
        "content": (
            "Five zones, same order every time: **T**ires & wheels, **C**ontrols "
            "& cables, **L**ights & electrics, **O**il & fuel, **C**hassis. The "
            "order is the point — a ritual catches what a glance misses. Module "
            "2's walkaround lab lets you practice placing all five zones."
        ),
    },
    {"role": "user", "content": "Does a few PSI of tire pressure really matter?"},
    {
        "role": "assistant",
        "grounding": "curriculum",
        "sources": ["machine-tire-pressure"],
        "content": (
            "On these tires, yes. ATV grip comes from low-pressure tires "
            "deforming around terrain — change the squish and you change how "
            "the whole machine handles. A few PSI is a handling variable, not "
            "a comfort setting. It's why tires open the walkaround."
        ),
    },
    {"role": "user", "content": "Is a side-by-side a better first machine than an ATV?"},
    {
        "role": "assistant",
        "grounding": "general",
        "sources": ["general-atv-vs-sxs", "general-first-machine"],
        "content": (
            "They're different machines with different demands. A side-by-side "
            "gives you a cage, belts, and a steering wheel; an ATV asks you to "
            "be part of the suspension. Neither is 'safer' if the rider skips "
            "fit, gear, or judgment — but for brand-new riders, seat time on a "
            "right-sized machine with hands-on training matters more than the "
            "category."
        ),
    },
    {"role": "user", "content": "What do drivers on the road wish ATV riders knew?"},
    {
        "role": "assistant",
        "grounding": "mixed",
        "sources": ["roads-crossing-procedure", "general-drivers-perspective"],
        "content": (
            "Mostly that they can't see you as early as you see them. From the "
            "driver's seat an ATV at a crossing is small, low, and unexpected. "
            "That's why the course's crossing procedure is a full stop, a "
            "both-direction look, and a square, brisk line — minimum pavement "
            "time, and never borrowing someone else's gap."
        ),
    },
    {"role": "user", "content": "Can you teach me to wheelie over a ditch?"},
    {
        "role": "assistant",
        "grounding": "general",
        "sources": [],
        "triage": "stunt_technique",
        "content": (
            "That one I won't coach — lifting a wheel on purpose is stunt "
            "territory, and it's exactly the kind of move that turns a ditch "
            "into an incident report. What I can do: help you read ditches so "
            "they never surprise you, or point you at hands-on training where "
            "machine-handling skills are taught with spotters and soft ground."
        ),
    },
    {"role": "user", "content": "Fair enough. What's actually worth practicing first?"},
    {
        "role": "assistant",
        "grounding": "general",
        "sources": ["general-hands-on-training"],
        "content": (
            "Slow-speed control in an open area: smooth throttle, both brakes, "
            "standing on the pegs, and tight figure-eights. Boring on purpose — "
            "those are the moves every trail situation is built from. A "
            "hands-on course compresses months of guesswork into a weekend, "
            "and it's the single best next step after this course."
        ),
    },
]


# ── Derived evidence values (from seeded payloads — never hardcoded) ─────────


def _best_path(payload: dict) -> list[dict]:
    nodes = {n["id"]: n for n in payload.get("nodes", [])}
    path: list[dict] = []
    node_id = payload.get("startNode")
    while node_id is not None:
        node = nodes[node_id]
        best = next(c for c in node["choices"] if c.get("quality") == "best")
        path.append({"nodeId": node_id, "choiceId": best["id"]})
        node_id = best.get("next")
    return path


def _written_text(payload: dict, step_id: str, min_length: int) -> str:
    if step_id in STEP_TEXTS:
        return STEP_TEXTS[step_id]
    base = (
        "Writing it down to make it stick: the judgment layer is the part I "
        "control on every single ride, and the plan is decided before the "
        "wheels turn — that's the habit I'm building here."
    )
    while len(base) < min_length:
        base += " Specific beats aspirational, so I'm keeping this in my own words."
    return base


def complete_value(step: Step, first_try: bool = True) -> tuple[str, dict, bool | None]:
    """A plausible, contract-valid complete evidence value for any step."""
    p = step.payload
    r = step.renderer
    if r == "content":
        return "acknowledgement", {"seen": True}, None
    if r == "prediction_reveal":
        return "prediction", {"optionId": p["options"][0]["id"]}, None
    if r in ("multiple_choice", "checkpoint") and (
        r == "multiple_choice" or p.get("mode") == "multiple_choice"
    ):
        options = p["options"] if r == "multiple_choice" else p["inner"]["options"]
        best = next(o["id"] for o in options if o.get("isBest"))
        first = best if first_try else next(o["id"] for o in options if not o.get("isBest"))
        kind = "choice" if r == "multiple_choice" else "checkpoint_response"
        return kind, {"optionId": best, "firstAttemptOptionId": first}, first == best
    if r == "checkpoint":  # structured_response mode
        min_length = int(p.get("inner", {}).get("minLength", 120))
        return "checkpoint_response", {"text": _written_text(p, step.id, min_length)}, None
    if r == "sort_categorize":
        return "classification", {
            "placements": {i["id"]: i["categoryId"] for i in p["items"]}
        }, None
    if r == "match":
        return "matches", {"matches": {pair["id"]: True for pair in p["pairs"]}}, None
    if r == "hotspot_list":
        return "hotspots", {"visited": [h["id"] for h in p["hotspots"]]}, None
    if r == "branching_decision":
        return "decision_path", {"path": _best_path(p)}, None
    if r == "structured_response":
        return "written_response", {
            "text": _written_text(p, step.id, int(p.get("minLength", 120)))
        }, None
    if r == "reflection":
        chips = p.get("chips") or []
        value = {"chip": chips[0]} if chips else {"text": _written_text(p, step.id, 40)}
        return "written_response", value, None
    if r == "journal_builder":
        return "journal_artifact", {"fields": ARTIFACT_FIELDS[p["artifactType"]]}, None
    if r == "lab_objective":
        return "lab_result", {"objectivesMet": [o["id"] for o in p["objectives"]]}, None
    raise ValueError(f"fixtures: unknown renderer {r!r}")


# ── Builders ─────────────────────────────────────────────────────────────────


class _Clock:
    """Monotonic fixture timestamps so recent-XP ordering is deterministic."""

    def __init__(self, start: datetime) -> None:
        self.now = start

    def tick(self) -> str:
        self.now += timedelta(minutes=1)
        return self.now.isoformat()


def _ensure_user(db: Session, email: str, display_name: str) -> User:
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if user is None:
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            display_name=display_name,
            password_hash=hash_password(FIXTURE_PASSWORD),
            role="learner",
            created_at=utc_now_iso(),
        )
        db.add(user)
        db.flush()
    return user


def _wipe(db: Session, user: User) -> None:
    for model in (
        StepEvidence, LessonCompletion, ModuleCompletion, LearnerState, XpEvent,
        BadgeAward, JournalArtifact, AssessmentAttempt, Certificate, TutorMessage,
    ):
        for row in db.execute(select(model).where(model.user_id == user.id)).scalars():
            db.delete(row)
    db.flush()


def _course_tree(db: Session) -> list[tuple[Module, list[tuple[Lesson, list[Step]]]]]:
    modules = sorted(db.execute(select(Module)).scalars(), key=lambda m: m.order)
    tree = []
    for module in modules:
        lessons = sorted(
            db.execute(select(Lesson).where(Lesson.module_id == module.id)).scalars(),
            key=lambda lesson: lesson.order,
        )
        tree.append(
            (
                module,
                [
                    (
                        lesson,
                        sorted(
                            db.execute(
                                select(Step).where(Step.lesson_id == lesson.id)
                            ).scalars(),
                            key=lambda step: step.order,
                        ),
                    )
                    for lesson in lessons
                ],
            )
        )
    return tree


def _add_evidence(db, user, module, lesson, step, clock, first_try=True) -> bool | None:
    kind, value, fa = complete_value(step, first_try=first_try)
    db.add(
        StepEvidence(
            id=f"{user.id}::{step.id}",
            user_id=user.id,
            step_id=step.id,
            lesson_id=lesson.id,
            module_id=module.id,
            kind=kind,
            value=value,
            complete=True,
            first_attempt_correct=fa,
            updated_at=clock.tick(),
        )
    )
    return fa


def _add_artifact(db, user, artifact_type, module_id, title, fields, status, ts) -> None:
    db.add(
        JournalArtifact(
            id=f"{user.id}::{artifact_type}",
            user_id=user.id,
            artifact_type=artifact_type,
            title=title,
            fields=fields,
            status=status,
            module_id=module_id,
            updated_at=ts,
        )
    )


def _grant(db, user, clock, event, label, ref) -> None:
    row = xp.award(db, user.id, event, label=label, ref=ref)
    if row is not None:
        row.created_at = clock.tick()


def _build_mid(db: Session, user: User, tree) -> None:
    clock = _Clock(datetime.now(UTC) - timedelta(days=2))
    for module, lessons in tree:
        for lesson, steps in lessons:
            in_scope = module.order in (1, 2) or lesson.id == "m3-l1-helmet"
            if not in_scope:
                continue
            for step in steps:
                first_try = step.id != "m2-l1-s3"  # one honest miss for the stats
                _add_evidence(db, user, module, lesson, step, clock, first_try)
            db.add(
                LessonCompletion(
                    id=f"{user.id}::{lesson.id}", user_id=user.id,
                    lesson_id=lesson.id, module_id=module.id, completed_at=clock.tick(),
                )
            )
        if module.order in (1, 2):
            db.add(
                ModuleCompletion(
                    id=f"{user.id}::{module.id}", user_id=user.id,
                    module_id=module.id, completed_at=clock.tick(),
                )
            )
            badge = xp.award_badge(db, user.id, module.badge_id)
            if badge is not None:
                badge.created_at = clock.tick()
    db.flush()

    db.add(
        LearnerState(
            user_id=user.id,
            last_lesson_id="m3-l2-head-to-toe",
            last_step_id="m3-l2-s1",
            updated_at=clock.tick(),
        )
    )
    _add_artifact(db, user, "risk_profile", "m1-riders-mindset", "My Risk Profile",
                  ARTIFACT_FIELDS["risk_profile"], "complete", clock.tick())
    _add_artifact(db, user, "inspection_log", "m2-know-your-machine", "My Walkaround",
                  DRAFT_FIELDS["inspection_log"], "draft", clock.tick())
    _add_artifact(db, user, "gear_card", "m3-gear-up", "My Gear Card",
                  DRAFT_FIELDS["gear_card"], "draft", clock.tick())

    # Exactly 340 XP, legal rule names only (route-manifest: "340 XP").
    story = [
        ("module_complete", "Module complete: The Rider's Mindset", "module:m1-riders-mindset"),
        ("module_complete", "Module complete: Know Your Machine", "module:m2-know-your-machine"),
        ("journal_artifact_complete", "Field Journal: My Risk Profile", "journal:risk_profile"),
        ("lab_objectives_met", "Lab objectives met: Lab — the walkaround", "lab:m2-l3-s2"),
        ("scenario_best_path", "Strongest path: Scenario — the creek line", "scenario:m1-l2-s2"),
        ("tutor_first_question", "First question to Ranger", "tutor:first"),
        ("checkpoint_first_try", "Checkpoint first try: Why Riders Crash", "checkpoint:m1-l1-s4"),
        ("checkpoint_first_try", "Checkpoint first try: Your Risk Profile", "checkpoint:m1-l3-s3"),
        ("checkpoint_first_try", "Checkpoint first try: Fit Is a Hard Rule", "checkpoint:m2-l4-s2"),
        ("lesson_complete", "Lesson complete: Fit Is a Hard Rule", "lesson:m2-l4-fit"),
        ("lesson_complete", "Lesson complete: The Helmet", "lesson:m3-l1-helmet"),
        ("step_complete", "Step complete: Lab — the walkaround", "step:m2-l3-s2"),
        ("step_complete", "Step complete: Why fit rules exist", "step:m2-l4-s1"),
        ("step_complete", "Step complete: Checkpoint — the borrowed machine", "step:m2-l4-s2"),
        ("step_complete", "Step complete: What a helmet actually does", "step:m3-l1-s1"),
        ("step_complete", "Step complete: Predict — the dropped helmet", "step:m3-l1-s2"),
        ("step_complete", "Step complete: Check — fit call", "step:m3-l1-s3"),
    ]
    for event, label, ref in story:
        _grant(db, user, clock, event, label, ref)

    for entry in TUTOR_SCRIPT:
        db.add(
            TutorMessage(
                id=str(uuid.uuid4()),
                user_id=user.id,
                role=entry["role"],
                content=entry["content"],
                grounding=entry.get("grounding", "general"),
                sources=entry.get("sources", []),
                triage_category=entry.get("triage"),
                created_at=clock.tick(),
            )
        )


def _build_grad(db: Session, user: User, tree) -> None:
    clock = _Clock(datetime.now(UTC) - timedelta(days=7))
    for module, lessons in tree:
        for lesson, steps in lessons:
            checkpoint_first = False
            for step in steps:
                fa = _add_evidence(db, user, module, lesson, step, clock, first_try=True)
                _grant(db, user, clock, "step_complete",
                       f"Step complete: {step.title}", f"step:{step.id}")
                if step.renderer == "lab_objective":
                    _grant(db, user, clock, "lab_objectives_met",
                           f"Lab objectives met: {step.title}", f"lab:{step.id}")
                if step.renderer == "branching_decision":
                    _grant(db, user, clock, "scenario_best_path",
                           f"Strongest path: {step.title}", f"scenario:{step.id}")
                if step.renderer == "checkpoint" and fa:
                    checkpoint_first = True
                    checkpoint_ref = f"checkpoint:{step.id}"
                if step.renderer == "journal_builder":
                    artifact_type = step.payload["artifactType"]
                    _add_artifact(db, user, artifact_type, module.id,
                                  step.payload.get("title", step.title),
                                  ARTIFACT_FIELDS[artifact_type], "complete", clock.tick())
                    _grant(db, user, clock, "journal_artifact_complete",
                           f"Field Journal: {step.payload.get('title', step.title)}",
                           f"journal:{artifact_type}")
                    if artifact_type == "ride_plan":
                        _grant(db, user, clock, "capstone_complete",
                               "Capstone complete: The Ride Plan", "capstone")
            db.add(
                LessonCompletion(
                    id=f"{user.id}::{lesson.id}", user_id=user.id,
                    lesson_id=lesson.id, module_id=module.id, completed_at=clock.tick(),
                )
            )
            _grant(db, user, clock, "lesson_complete",
                   f"Lesson complete: {lesson.title}", f"lesson:{lesson.id}")
            if checkpoint_first:
                _grant(db, user, clock, "checkpoint_first_try",
                       f"Checkpoint first try: {lesson.title}", checkpoint_ref)
        db.add(
            ModuleCompletion(
                id=f"{user.id}::{module.id}", user_id=user.id,
                module_id=module.id, completed_at=clock.tick(),
            )
        )
        _grant(db, user, clock, "module_complete",
               f"Module complete: {module.title}", f"module:{module.id}")
        badge = xp.award_badge(db, user.id, module.badge_id)
        if badge is not None:
            badge.created_at = clock.tick()
    db.flush()

    for badge_id in ("b-journal", "b-scholar"):
        badge = xp.award_badge(db, user.id, badge_id)
        if badge is not None:
            badge.created_at = clock.tick()

    db.add(
        LearnerState(
            user_id=user.id,
            last_lesson_id="m6-l4-ride-plan",
            last_step_id="m6-l4-s3",
            updated_at=clock.tick(),
        )
    )

    # Passed final (18/20 = 90%) + certificate, from the seeded bank.
    bank = db.get(CourseMeta, COURSE_ID).assessment_bank
    wrong = {"q7", "q13"}
    answers = {}
    for q in bank["questions"]:
        options = q["options"]
        pick = next(
            o for o in options if bool(o.get("correct")) != (q["id"] in wrong)
        )
        answers[q["id"]] = pick["id"]
    db.add(
        AssessmentAttempt(
            id=str(uuid.uuid4()), user_id=user.id, kind="final",
            score_pct=90.0, passed=True, answers=answers, created_at=clock.tick(),
        )
    )
    _grant(db, user, clock, "final_assessment_passed", "Final assessment passed", "final")

    digest = hashlib.sha256(user.email.encode()).digest()
    code = "".join(CROCKFORD[b % 32] for b in digest[:10])
    db.add(
        Certificate(
            code=code, user_id=user.id, issued_at=clock.tick(),
            name_on_cert=user.display_name,
        )
    )
    badge = xp.on_certificate_issued(db, user.id)
    if badge is not None:
        badge.created_at = clock.tick()


def create_fixtures(db: Session) -> None:
    """Idempotently (re)build the three crawl accounts. FIXTURES=1 boots only."""
    tree = _course_tree(db)
    if not tree:
        logger.warning("fixtures: course tables empty — run the seed first")
        return
    fresh = _ensure_user(db, "fresh@crawl.test", "Fresh Crawler")
    mid = _ensure_user(db, "mid@crawl.test", "Mid Crawler")
    grad = _ensure_user(db, "grad@crawl.test", "Grad Crawler")
    for user in (fresh, mid, grad):
        _wipe(db, user)
    _build_mid(db, mid, tree)
    _build_grad(db, grad, tree)
    db.commit()
    mid_total = xp.xp_total(db, mid.id)
    grad_total = xp.xp_total(db, grad.id)
    logger.info(
        "fixtures: fresh/mid/grad rebuilt (mid %d XP, grad %d XP)", mid_total, grad_total
    )
