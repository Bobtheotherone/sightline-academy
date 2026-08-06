"""Seed pipeline: content/curriculum/ -> course tables (ADR-006, SPEC-003).

Implements CURRICULUM-000 §Authoring format exactly:

- module front-matter (YAML between ``---`` fences at the top of the file);
- lessons open with ``# Lesson: <Title>`` + a fenced ``yaml lesson`` block;
- steps open with ``## Step: <Title>`` + a fenced ``yaml step`` block + a
  fenced ``json payload`` block;
- prose between blocks is author commentary and is ignored.

Every validation fails loudly with a message naming the file (and id, when
known) — a content typo should break the boot, not silently drop a lesson.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
from dataclasses import dataclass, field
from pathlib import Path

import yaml
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import CourseMeta, Lesson, Module, Step

logger = logging.getLogger("sightline.seed")

COURSE_ID = "course"
COURSE_TITLE = "Sightline Safety Academy ATV & Road Safety Course"
# Landing thesis headline (DESIGN-003 §Landing) — the one authored course-level
# tagline in the handoff.
COURSE_TAGLINE = "Ride like you've thought it through."

SECTIONS = ("briefing", "learn", "try", "debrief", "journal", "checkpoint")
RENDERERS = (
    "content",
    "prediction_reveal",
    "multiple_choice",
    "sort_categorize",
    "match",
    "hotspot_list",
    "branching_decision",
    "structured_response",
    "journal_builder",
    "reflection",
    "lab_objective",
    "checkpoint",
)
MODULE_KEYS = (
    "id", "order", "title", "tagline", "mission",
    "estimated_minutes", "badge_id", "hero_slot", "objectives",
)
LESSON_KEYS = ("id", "order", "summary", "estimated_minutes")
STEP_KEYS = ("id", "section", "renderer", "minutes", "required")

_FRONT_MATTER_RE = re.compile(r"^---\n(.*?)\n---\n(.*)$", re.S)


class SeedError(Exception):
    """Boot-stopping content problem. Message names file + id + issue."""


@dataclass
class ParsedStep:
    id: str
    order: int
    section: str
    renderer: str
    title: str
    minutes: int
    required: bool
    payload: dict


@dataclass
class ParsedLesson:
    id: str
    order: int
    title: str
    summary: str
    estimated_minutes: int
    steps: list[ParsedStep] = field(default_factory=list)

    @property
    def sections_present(self) -> list[str]:
        seen: list[str] = []
        for step in self.steps:
            if step.section not in seen:
                seen.append(step.section)
        return seen


@dataclass
class ParsedModule:
    id: str
    order: int
    title: str
    tagline: str
    mission: str
    estimated_minutes: int
    badge_id: str
    hero_slot: str
    objectives: list[str]
    lessons: list[ParsedLesson] = field(default_factory=list)


@dataclass
class ParsedCourse:
    modules: list[ParsedModule]
    assessment: dict
    version: str


# ── Parsing ──────────────────────────────────────────────────────────────────


def _tokenize(body: str, name: str) -> list[tuple]:
    """Reduce a module body to ('lesson', title) / ('step', title) /
    ('fence', info, text) tokens; everything else is ignored prose."""
    tokens: list[tuple] = []
    lines = body.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("# Lesson:"):
            tokens.append(("lesson", line.removeprefix("# Lesson:").strip()))
        elif line.startswith("## Step:"):
            tokens.append(("step", line.removeprefix("## Step:").strip()))
        elif line.startswith("```") and line.strip() != "```":
            info = line.removeprefix("```").strip()
            block: list[str] = []
            i += 1
            while i < len(lines) and lines[i].strip() != "```":
                block.append(lines[i])
                i += 1
            if i >= len(lines):
                raise SeedError(f"[seed] {name}: unclosed ``` fence ({info!r})")
            tokens.append(("fence", info, "\n".join(block)))
        i += 1
    return tokens


def _load_yaml(text: str, name: str, what: str) -> dict:
    try:
        data = yaml.safe_load(text)
    except yaml.YAMLError as exc:
        raise SeedError(f"[seed] {name}: bad YAML in {what}: {exc}") from exc
    if not isinstance(data, dict):
        raise SeedError(f"[seed] {name}: {what} is not a YAML mapping")
    return data


def _load_kv(text: str, name: str, what: str) -> dict[str, str]:
    """Lesson/step blocks are flat key: value lines. Parsed line-wise, not with
    a YAML loader — authored summaries legitimately contain quotes and colons
    (m6-l1, m6-l4) that strict YAML rejects."""
    data: dict[str, str] = {}
    for line in text.splitlines():
        if not line.strip():
            continue
        key, sep, val = line.partition(":")
        if not sep or not key.strip() or " " in key.strip():
            raise SeedError(f"[seed] {name}: {what}: bad line {line!r}")
        val = val.strip()
        if len(val) >= 2 and val[0] == '"' and val[-1] == '"':
            val = val[1:-1]
        data[key.strip()] = val
    return data


def _as_int(raw: object, name: str, what: str) -> int:
    try:
        return int(str(raw))
    except ValueError as exc:
        raise SeedError(f"[seed] {name}: {what}: {raw!r} is not a number") from exc


def _as_bool(raw: str, name: str, what: str) -> bool:
    if raw.lower() not in ("true", "false"):
        raise SeedError(f"[seed] {name}: {what}: required must be true/false, got {raw!r}")
    return raw.lower() == "true"


def _require_keys(data: dict, keys: tuple[str, ...], name: str, what: str) -> None:
    missing = [k for k in keys if k not in data]
    if missing:
        raise SeedError(f"[seed] {name}: {what} missing keys {missing}")


def _check_multiple_choice(options: object, name: str, step_id: str) -> None:
    if not isinstance(options, list) or not options:
        raise SeedError(f"[seed] {name}: step {step_id}: multiple_choice has no options")
    best = [o for o in options if isinstance(o, dict) and o.get("isBest") is True]
    if len(best) != 1:
        raise SeedError(
            f"[seed] {name}: step {step_id}: multiple_choice must have exactly one "
            f"isBest option (found {len(best)})"
        )


def _check_branching(payload: dict, name: str, step_id: str) -> None:
    nodes = payload.get("nodes")
    if not isinstance(nodes, list) or not nodes:
        raise SeedError(f"[seed] {name}: step {step_id}: branching_decision has no nodes")
    node_ids = {n.get("id") for n in nodes}
    start = payload.get("startNode")
    if start not in node_ids:
        raise SeedError(
            f"[seed] {name}: step {step_id}: startNode {start!r} is not a node id"
        )
    for node in nodes:
        for choice in node.get("choices") or []:
            nxt = choice.get("next")
            if nxt is not None and nxt not in node_ids:
                raise SeedError(
                    f"[seed] {name}: step {step_id}: choice "
                    f"{choice.get('id')!r} points at unknown node {nxt!r}"
                )


def _check_payload(step: ParsedStep, name: str) -> None:
    payload = step.payload
    instructions = payload.get("instructions")
    if not isinstance(instructions, str) or not instructions.strip():
        raise SeedError(f"[seed] {name}: step {step.id}: payload has no instructions")
    if step.renderer == "multiple_choice":
        _check_multiple_choice(payload.get("options"), name, step.id)
    elif step.renderer == "checkpoint":
        mode = payload.get("mode")
        if mode not in ("multiple_choice", "structured_response"):
            raise SeedError(f"[seed] {name}: step {step.id}: bad checkpoint mode {mode!r}")
        inner = payload.get("inner")
        if not isinstance(inner, dict):
            raise SeedError(f"[seed] {name}: step {step.id}: checkpoint has no inner payload")
        if mode == "multiple_choice":
            _check_multiple_choice(inner.get("options"), name, step.id)
    elif step.renderer == "branching_decision":
        _check_branching(payload, name, step.id)


def _check_checkpoint_last(lesson: ParsedLesson, name: str) -> None:
    """A checkpoint, where present, ends the lesson's instructional sequence
    (BUILDLOG W0 deviation). m6-l3 authors a closing debrief reflection after
    its checkpoint, so a debrief coda is the one allowed follower."""
    checkpoint_seen = False
    for step in lesson.steps:
        if checkpoint_seen and step.section != "debrief":
            raise SeedError(
                f"[seed] {name}: lesson {lesson.id}: step {step.id} follows the "
                "checkpoint — a checkpoint must end its lesson (debrief coda excepted)"
            )
        if step.renderer == "checkpoint":
            if checkpoint_seen:
                raise SeedError(
                    f"[seed] {name}: lesson {lesson.id}: more than one checkpoint step"
                )
            checkpoint_seen = True


def parse_module_file(path: Path) -> ParsedModule:
    name = path.name
    text = path.read_text(encoding="utf-8")
    m = _FRONT_MATTER_RE.match(text)
    if not m:
        raise SeedError(f"[seed] {name}: missing module front-matter fences")
    fm_raw, body = m.groups()
    fm = _load_yaml(fm_raw, name, "module front-matter")
    _require_keys(fm, MODULE_KEYS, name, "module front-matter")
    if not isinstance(fm["objectives"], list) or not fm["objectives"]:
        raise SeedError(f"[seed] {name}: module objectives must be a non-empty list")

    module = ParsedModule(
        id=str(fm["id"]),
        order=int(fm["order"]),
        title=str(fm["title"]),
        tagline=str(fm["tagline"]),
        mission=str(fm["mission"]),
        estimated_minutes=int(fm["estimated_minutes"]),
        badge_id=str(fm["badge_id"]),
        hero_slot=str(fm["hero_slot"]),
        objectives=[str(o) for o in fm["objectives"]],
    )

    tokens = _tokenize(body, name)
    i = 0
    while i < len(tokens):
        token = tokens[i]
        if token[0] == "lesson":
            if i + 1 >= len(tokens) or tokens[i + 1][0] != "fence" or tokens[i + 1][1] != "yaml lesson":
                raise SeedError(f"[seed] {name}: lesson {token[1]!r} has no `yaml lesson` block")
            data = _load_kv(tokens[i + 1][2], name, f"lesson {token[1]!r}")
            _require_keys(data, LESSON_KEYS, name, f"lesson {token[1]!r}")
            module.lessons.append(
                ParsedLesson(
                    id=str(data["id"]),
                    order=_as_int(data["order"], name, f"lesson {token[1]!r}"),
                    title=token[1],
                    summary=str(data["summary"]),
                    estimated_minutes=_as_int(
                        data["estimated_minutes"], name, f"lesson {token[1]!r}"
                    ),
                )
            )
            i += 2
        elif token[0] == "step":
            if not module.lessons:
                raise SeedError(f"[seed] {name}: step {token[1]!r} appears before any lesson")
            if (
                i + 2 >= len(tokens)
                or tokens[i + 1][0] != "fence" or tokens[i + 1][1] != "yaml step"
                or tokens[i + 2][0] != "fence" or tokens[i + 2][1] != "json payload"
            ):
                raise SeedError(
                    f"[seed] {name}: step {token[1]!r} must have a `yaml step` block "
                    "then a `json payload` block"
                )
            data = _load_kv(tokens[i + 1][2], name, f"step {token[1]!r}")
            _require_keys(data, STEP_KEYS, name, f"step {token[1]!r}")
            step_id = str(data["id"])
            if data["section"] not in SECTIONS:
                raise SeedError(f"[seed] {name}: step {step_id}: bad section {data['section']!r}")
            if data["renderer"] not in RENDERERS:
                raise SeedError(f"[seed] {name}: step {step_id}: bad renderer {data['renderer']!r}")
            try:
                payload = json.loads(tokens[i + 2][2])
            except json.JSONDecodeError as exc:
                raise SeedError(f"[seed] {name}: step {step_id}: payload is not valid JSON: {exc}") from exc
            if not isinstance(payload, dict):
                raise SeedError(f"[seed] {name}: step {step_id}: payload must be a JSON object")
            lesson = module.lessons[-1]
            step = ParsedStep(
                id=step_id,
                order=len(lesson.steps) + 1,
                section=str(data["section"]),
                renderer=str(data["renderer"]),
                title=token[1],
                minutes=_as_int(data["minutes"], name, f"step {step_id}"),
                required=_as_bool(data["required"], name, f"step {step_id}"),
                payload=payload,
            )
            _check_payload(step, name)
            lesson.steps.append(step)
            i += 3
        else:  # stray fence outside a heading — author commentary, ignore
            i += 1

    if not module.lessons:
        raise SeedError(f"[seed] {name}: module has no lessons")
    for lesson in module.lessons:
        if not lesson.steps:
            raise SeedError(f"[seed] {name}: lesson {lesson.id} has no steps")
        _check_checkpoint_last(lesson, name)
    return module


def parse_assessment(path: Path, module_ids: set[str]) -> dict:
    name = path.name
    if not path.exists():
        raise SeedError(f"[seed] {name}: file missing from content/curriculum/")
    fences = [t for t in _tokenize(path.read_text(encoding="utf-8"), name) if t[0] == "fence"]
    blocks = [t for t in fences if t[1] == "json assessment"]
    if len(blocks) != 1:
        raise SeedError(f"[seed] {name}: expected exactly one `json assessment` block")
    try:
        bank = json.loads(blocks[0][2])
    except json.JSONDecodeError as exc:
        raise SeedError(f"[seed] {name}: assessment is not valid JSON: {exc}") from exc

    questions = bank.get("questions")
    if not isinstance(questions, list) or len(questions) != 20:
        count = len(questions) if isinstance(questions, list) else 0
        raise SeedError(f"[seed] {name}: assessment must have 20 questions (found {count})")
    seen_ids: set[str] = set()
    for q in questions:
        qid = q.get("id")
        if qid in seen_ids:
            raise SeedError(f"[seed] {name}: duplicate question id {qid!r}")
        seen_ids.add(qid)
        if q.get("module") not in module_ids:
            raise SeedError(
                f"[seed] {name}: question {qid}: unknown module ref {q.get('module')!r}"
            )
        correct = [o for o in q.get("options", []) if o.get("correct") is True]
        if len(correct) != 1:
            raise SeedError(
                f"[seed] {name}: question {qid}: must have exactly one correct "
                f"option (found {len(correct)})"
            )
    return bank


def _content_version(files: list[Path]) -> str:
    digest = hashlib.sha256()
    for path in files:
        digest.update(path.read_bytes())
    return digest.hexdigest()


def parse_course(curriculum_dir: Path) -> ParsedCourse:
    module_files = sorted(curriculum_dir.glob("module-*.md"))
    if not module_files:
        raise SeedError(f"[seed] no module-*.md files in {curriculum_dir} — content missing?")
    modules = [parse_module_file(p) for p in module_files]
    modules.sort(key=lambda m: m.order)

    seen: dict[str, str] = {}
    for module in modules:
        for kind, item_id in (
            [("module", module.id)]
            + [("lesson", les.id) for les in module.lessons]
            + [("step", s.id) for les in module.lessons for s in les.steps]
        ):
            if item_id in seen:
                raise SeedError(
                    f"[seed] duplicate {kind} id {item_id!r} (already used by a {seen[item_id]})"
                )
            seen[item_id] = kind

    assessment_file = curriculum_dir / "final-assessment.md"
    assessment = parse_assessment(assessment_file, {m.id for m in modules})
    version = _content_version([*module_files, assessment_file])
    return ParsedCourse(modules=modules, assessment=assessment, version=version)


# ── DB apply ─────────────────────────────────────────────────────────────────


def _apply(db: Session, course: ParsedCourse) -> None:
    keep_modules = {m.id for m in course.modules}
    keep_lessons = {les.id for m in course.modules for les in m.lessons}
    keep_steps = {s.id for m in course.modules for les in m.lessons for s in les.steps}

    for row in db.execute(select(Step)).scalars():
        if row.id not in keep_steps:
            db.delete(row)
    db.flush()
    for row in db.execute(select(Lesson)).scalars():
        if row.id not in keep_lessons:
            db.delete(row)
    db.flush()
    for row in db.execute(select(Module)).scalars():
        if row.id not in keep_modules:
            db.delete(row)
    db.flush()

    # Flush level by level: the session runs autoflush=False and these mappers
    # carry no relationship() constructs, so one big flush won't FK-order them.
    for m in course.modules:
        db.merge(Module(
            id=m.id, order=m.order, title=m.title, tagline=m.tagline,
            mission=m.mission, estimated_minutes=m.estimated_minutes,
            objectives=m.objectives, badge_id=m.badge_id, hero_slot=m.hero_slot,
        ))
    db.flush()
    for m in course.modules:
        for les in m.lessons:
            db.merge(Lesson(
                id=les.id, module_id=m.id, order=les.order, title=les.title,
                summary=les.summary, estimated_minutes=les.estimated_minutes,
                sections_present=les.sections_present,
            ))
    db.flush()
    for m in course.modules:
        for les in m.lessons:
            for s in les.steps:
                db.merge(Step(
                    id=s.id, lesson_id=les.id, order=s.order, section=s.section,
                    renderer=s.renderer, title=s.title, minutes=s.minutes,
                    required=s.required, payload=s.payload,
                ))
    db.flush()

    db.merge(CourseMeta(
        id=COURSE_ID,
        title=COURSE_TITLE,
        tagline=COURSE_TAGLINE,
        version=course.version,
        module_order=[m.id for m in course.modules],
        assessment_bank=course.assessment,
    ))
    db.commit()


def run_seed(db: Session) -> None:
    """Boot-time entry (SPEC-002 §Startup). Parses at every boot (fail-loud on
    content typos per ADR-006); writes only when tables are empty, content
    changed (hash compare), or SEED_FORCE=1."""
    settings = get_settings()
    course = parse_course(settings.curriculum_path)
    meta = db.get(CourseMeta, COURSE_ID)
    populated = db.execute(select(Module.id).limit(1)).first() is not None

    if (
        meta is not None and populated
        and meta.version == course.version
        and not settings.seed_force
    ):
        logger.info("seed: content unchanged (version %s) — no-op", course.version[:12])
        return

    _apply(db, course)
    n_lessons = sum(len(m.lessons) for m in course.modules)
    n_steps = sum(len(les.steps) for m in course.modules for les in m.lessons)
    logger.info(
        "seed: %d modules / %d lessons / %d steps seeded (version %s)",
        len(course.modules), n_lessons, n_steps, course.version[:12],
    )
