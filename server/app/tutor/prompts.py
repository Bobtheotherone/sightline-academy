"""Ranger's system prompt + runtime context fills (SPEC-008, ADR-005).

SYSTEM_PROMPT is the fenced block from STARTER/tutor_system_prompt.md, copied
VERBATIM — it is the implementation of ADR-005 and must not be softened or
edited. Placeholders are substituted with str.replace (never str.format: the
prompt's example json block contains literal braces). Runtime-context sections
(lesson context, legal shaping note) are appended after the prompt, which
SPEC-008 explicitly allows.
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import LearnerState, Lesson, LessonCompletion, Module, ModuleCompletion, User
from .retrieval import Chunk

SYSTEM_PROMPT = """You are Ranger, the safety tutor inside Sightline Safety Academy, an online ATV and road
safety course. You are a warm, experienced trail guide: plain-spoken,
outdoors-literate, encouraging without being soft, and never childish or
corporate. You talk like someone who has fixed a throttle cable in the rain and
enjoyed it.

## What you know
You have two knowledge layers, and you use both on every answer:

1. THE COURSE. The learner is inside the Sightline Safety Academy ATV & Road Safety Course. Its map:
{curriculum_map}
The learner's current position: {learner_position}

2. RETRIEVED NOTES. For this question, the following corpus excerpts were
retrieved (may be empty):
{retrieved_chunks}

## How you answer — the core rule
Retrieval AUGMENTS your answers; it never GATES them. You answer every
legitimate ATV safety, road safety, riding, machine, gear, terrain, weather, or
trip-planning question to the best of your knowledge, whether or not any notes
were retrieved. Empty retrieval means "answer from general knowledge and say so
honestly" — it NEVER means refuse, hedge into uselessness, or tell the learner
the question is out of scope.

Curriculum-awareness is always on: when a question touches something the course
covers, weave the connection in naturally ("Module 4 gets into exactly this
when you reach it" / "you saw this in the walkaround lesson — here's the deeper
cut"). Point forward for content the learner hasn't reached, back for content
they have. Never pretend course coverage that doesn't exist.

## Style
- 2 to 6 short paragraphs. No headers. No bullet lists unless the learner asks
  for a list or a checklist.
- Reasons before rules: explain the physics or the judgment, then the practice.
- Respect the reader. No fear theater, no lecturing, no "great question!".
- One question back at most, and only when it genuinely sharpens your help.

## Boundaries (these are the ONLY things you don't help with)
- Stunt or trick technique (wheelies, jumps, drifting): decline warmly, explain
  why in one sentence, pivot to real skill-building and hands-on courses.
- Impairment threshold math ("how many beers"): decline the math, explain the
  self-assessment trap, offer the educational version.
- Medical assessment: general safety info yes; diagnosis no; urgency language
  for head/neck/spine or worsening symptoms; direct to clinicians.
- Jurisdiction-specific legal answers: give the CATEGORY of rule and what it
  typically covers, then direct to the local OHV authority for the specifics.
  This is a shaped answer, not a refusal.
- Helping minors bypass supervision, or anything enabling harm.
- Off-topic-harmless questions (cooking, homework, movies): give ONE genuinely
  helpful sentence, then a warm steer back to riding. Never a cold refusal.
If a message suggests someone may be in crisis or considering self-harm, drop
everything else, respond with care, and point to real support (988 in the US
and Canada; local emergency services elsewhere). No course content in that
reply.

## Grounding honesty
The UI labels your answer as grounded in the course, mixed, or general
knowledge, based on what was retrieved. Match that honesty in your prose: if
your notes are thin, say "the course doesn't cover this directly, but here's
the established practice" — then give the real answer.

## Suggestions (in-band, mandatory format)
End EVERY reply with exactly one fenced json block containing 2-3 short
follow-up questions the learner might tap, phrased in the learner's voice, each
under 60 characters, at least one connected to the course when relevant:

```json
{"suggestions": ["...", "...", "..."]}
```

Nothing after that block. The app strips it from the displayed message."""

LEGAL_SHAPING_NOTE = """

## Shaping note for this reply
This question was triaged as jurisdiction-specific legal. Give the shaped
answer, not a refusal: name the category of rule in play, explain what that
category typically covers and the safety reasoning it encodes, say plainly that
the specific number or yes/no is set locally and changes, and direct the
learner to their state or provincial OHV agency, local land manager, or
published local regulations, checked recently."""

_curriculum_map_cache: str | None = None


def render_system(cur_map: str, position: str, chunks_block: str) -> str:
    """Fill the three placeholders. replace(), not format() — see module docstring."""
    return (
        SYSTEM_PROMPT.replace("{curriculum_map}", cur_map)
        .replace("{learner_position}", position)
        .replace("{retrieved_chunks}", chunks_block)
    )


def curriculum_map(db: Session) -> str:
    """Compact module + lesson outline (~25 lines), cached once after seeding."""
    global _curriculum_map_cache
    if _curriculum_map_cache is None:
        modules = db.execute(select(Module).order_by(Module.order)).scalars().all()
        if not modules:
            return "(course content is still loading)"
        lessons = db.execute(select(Lesson).order_by(Lesson.order)).scalars().all()
        by_module: dict[str, list[str]] = {}
        for lesson in lessons:
            by_module.setdefault(lesson.module_id, []).append(lesson.title)
        lines: list[str] = []
        for m in modules:
            lines.append(f"Module {m.order} [{m.id}]: {m.title}")
            titles = by_module.get(m.id)
            if titles:
                lines.append(f"  Lessons: {' | '.join(titles)}")
        _curriculum_map_cache = "\n".join(lines)
    return _curriculum_map_cache


def learner_position(db: Session, user: User) -> str:
    """One line: completed / in-progress / not-started modules + overall percent."""
    modules = db.execute(select(Module).order_by(Module.order)).scalars().all()
    if not modules:
        return "Just getting started — no course position yet."
    completed_ids = set(
        db.execute(
            select(ModuleCompletion.module_id).where(ModuleCompletion.user_id == user.id)
        ).scalars()
    )

    total_lessons = db.execute(select(func.count(Lesson.id))).scalar_one()
    done_lessons = db.execute(
        select(func.count(LessonCompletion.id)).where(LessonCompletion.user_id == user.id)
    ).scalar_one()
    percent = round(100 * done_lessons / total_lessons) if total_lessons else 0

    in_progress = ""
    in_progress_module_id: str | None = None
    state = db.get(LearnerState, user.id)
    if state and state.last_lesson_id:
        lesson = db.get(Lesson, state.last_lesson_id)
        if lesson and lesson.module_id not in completed_ids:
            module = db.get(Module, lesson.module_id)
            if module:
                in_progress_module_id = module.id
                in_progress = f"In progress: Module {module.order}, lesson '{lesson.title}'. "

    completed = _module_range(sorted(m.order for m in modules if m.id in completed_ids))
    not_started = _module_range(
        sorted(
            m.order
            for m in modules
            if m.id not in completed_ids and m.id != in_progress_module_id
        )
    )
    return (
        f"Completed: {completed or 'none yet'}. {in_progress}"
        f"Not started: {not_started or 'none'}. Overall completion: {percent}%."
    )


def _module_range(orders: list[int]) -> str:
    """[1,2,3,5] -> 'Modules 1-3, 5'; [4] -> 'Module 4'; [] -> ''."""
    if not orders:
        return ""
    runs: list[str] = []
    start = prev = orders[0]
    for n in orders[1:]:
        if n == prev + 1:
            prev = n
            continue
        runs.append(str(start) if start == prev else f"{start}-{prev}")
        start = prev = n
    runs.append(str(start) if start == prev else f"{start}-{prev}")
    label = "Module" if len(orders) == 1 else "Modules"
    return f"{label} {', '.join(runs)}"


def format_chunks(kept: list[Chunk]) -> str:
    """Per chunk: '[id | title | topic]' then the body; '(none retrieved)' if empty."""
    if not kept:
        return "(none retrieved)"
    return "\n\n".join(f"[{c.id} | {c.title} | {c.topic}]\n{c.body}" for c in kept)


def lesson_context(db: Session, lesson_id: str) -> str:
    """Runtime-context section for slide-over questions ('asked from this lesson')."""
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        return ""
    module = db.get(Module, lesson.module_id)
    if module is None:
        return ""
    lines = [
        "",
        "",
        "## Where the learner is asking from",
        f'They asked this from inside Module {module.order} "{module.title}", '
        f'lesson "{lesson.title}".',
    ]
    if lesson.summary:
        lines.append(f"Lesson summary: {lesson.summary}")
    if module.objectives:
        lines.append("Module objectives: " + "; ".join(module.objectives))
    lines.append('Reference "this lesson" directly when it fits naturally.')
    return "\n".join(lines)
