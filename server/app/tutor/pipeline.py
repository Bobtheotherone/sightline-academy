"""Ranger's answer pipeline — adapted faithfully from STARTER/tutor_pipeline.py.

Stages: normalize -> triage -> retrieve -> compose -> generate -> shape -> persist

Contract points (STARTER, do not renegotiate):
- Triage runs BEFORE retrieval; a hard hit answers from the policy template and
  stops. legal_specific continues into retrieval + generation — it's a shaped
  answer, not a refusal (ADR-005).
- The soft floor is SOFT: empty retrieval changes the grounding label, never
  the willingness to answer.
- Suggestions arrive in-band as a trailing fenced json block and are stripped
  from the displayed text; static fallbacks cover the extractive provider.
"""

import json
import re
import unicodedata
import uuid
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import TutorMessage, User, utc_now_iso
from . import prompts, providers
from .retrieval import Chunk, grounding_label, query_chroma, shape_retrieval
from .safety import triage

HISTORY_TURNS = 10

SUGGESTIONS_RE = re.compile(r"```json\s*(\{.*?\})\s*```\s*$", re.S)


@dataclass
class TutorReply:
    text: str
    grounding: str                    # "curriculum" | "mixed" | "general" | "triage"
    triage_category: str | None
    sources: list[dict]               # [{id, title, module_ref}] for SourceChips
    suggestions: list[str]
    provider: str                     # "anthropic" | "extractive" | "policy"
    extra: dict = field(default_factory=dict)


def normalize(message: str) -> str:
    """Trim, strip control chars, collapse whitespace, cap 2000 chars (SPEC-008)."""
    cleaned = "".join(
        ch for ch in message if ch in "\n\t " or not unicodedata.category(ch).startswith("C")
    )
    return " ".join(cleaned.split())[:2000]


def split_suggestions(raw_text: str) -> tuple[str, list[str]]:
    """Strip the in-band trailing json block; return (display text, suggestions)."""
    m = SUGGESTIONS_RE.search(raw_text)
    if not m:
        return raw_text.strip(), []
    try:
        suggestions = json.loads(m.group(1)).get("suggestions", [])[:3]
    except json.JSONDecodeError:
        suggestions = []
    return raw_text[: m.start()].strip(), [s for s in suggestions if isinstance(s, str)]


def answer(
    db: Session, user: User, message: str, lesson_id: str | None = None
) -> TutorReply:
    msg = normalize(message)                                     # 1 normalize

    cat = triage(msg)                                            # 2 triage
    if cat and cat["id"] != "legal_specific":
        reply = TutorReply(
            text=cat["template"],
            grounding="triage",
            triage_category=cat["id"],
            sources=[],
            suggestions=_triage_suggestions(cat["id"]),
            provider="policy",
        )
        _persist(db, user, msg, reply)                           # 7 persist
        return reply

    raw = query_chroma(msg)                                      # 3 retrieve
    kept = shape_retrieval(raw)
    grounding = grounding_label(kept)

    if providers.active_provider() == "anthropic":               # 4-5 compose+generate
        system = prompts.render_system(
            prompts.curriculum_map(db),
            prompts.learner_position(db, user),
            prompts.format_chunks(kept),
        )
        if lesson_id:
            system += prompts.lesson_context(db, lesson_id)
        if cat:  # legal_specific: shape the generation, don't refuse (ADR-005)
            system += prompts.LEGAL_SHAPING_NOTE
        history = _history(db, user)
        raw_text = providers.generate_anthropic(system, history, msg)
        provider = "anthropic"
    else:
        if cat:  # legal_specific offline: policy template, rule category filled in
            raw_text = cat["template"].replace("{RULE_CATEGORY}", _rule_category(kept))
        else:
            raw_text = providers.extractive_answer(msg, kept)
        provider = "extractive"

    text, suggestions = split_suggestions(raw_text)              # 6 shape
    if not suggestions:
        suggestions = (
            _triage_suggestions(cat["id"]) if cat else _default_suggestions(grounding, kept)
        )

    reply = TutorReply(
        text=text,
        grounding=grounding,
        triage_category=cat["id"] if cat else None,
        sources=[
            {"id": c.id, "title": c.title, "module_ref": c.module_refs[0] if c.module_refs else ""}
            for c in kept
        ],
        suggestions=suggestions,
        provider=provider,
    )
    _persist(db, user, msg, reply)                               # 7 persist
    return reply


# --------------------------------------------------------------------------- #
# Helpers (signatures pinned by the STARTER)
# --------------------------------------------------------------------------- #


def _history(db: Session, user: User, turns: int = HISTORY_TURNS) -> list[dict]:
    """Last `turns` stored messages, oldest first, trimmed to start on a user turn."""
    rows = (
        db.execute(
            select(TutorMessage)
            .where(TutorMessage.user_id == user.id)
            # role asc breaks created_at ties so a pair never arrives reversed.
            .order_by(TutorMessage.created_at.desc(), TutorMessage.role.asc())
            .limit(turns)
        )
        .scalars()
        .all()
    )
    ordered = list(reversed(rows))
    while ordered and ordered[0].role != "user":
        ordered.pop(0)  # the Messages API requires history to open with a user turn
    return [{"role": row.role, "content": row.content} for row in ordered]


def _persist(db: Session, user: User, msg: str, reply: TutorReply) -> None:
    """Store both turns; the assistant row id rides along for the router."""
    user_row = TutorMessage(
        id=str(uuid.uuid4()),
        user_id=user.id,
        role="user",
        content=msg,
        grounding="none",
        sources=[],
        triage_category=None,
        created_at=utc_now_iso(),
    )
    assistant_row = TutorMessage(
        id=str(uuid.uuid4()),
        user_id=user.id,
        role="assistant",
        content=reply.text,
        grounding=reply.grounding,
        sources=[source["id"] for source in reply.sources],
        triage_category=reply.triage_category,
        created_at=utc_now_iso(),
    )
    db.add(user_row)
    db.add(assistant_row)
    db.commit()
    reply.extra["message_id"] = assistant_row.id


# In extractive mode the legal_specific template's {RULE_CATEGORY} is filled
# from the top retrieved chunk's topic, mapped to a human phrase.
_RULE_CATEGORY_FALLBACK = "where and how ATVs may operate"
_RULE_CATEGORY_BY_TOPIC = {
    "roads": "where and how ATVs may operate on or near roads",
    "machine": "machine registration, equipment, and operator requirements",
    "gear": "helmet and protective gear mandates",
    "terrain": "where riding is allowed on public land and trails",
    "environment": "seasonal access and land-use rules",
    "mindset": "operator age, certification, and supervision requirements",
}


def _rule_category(kept: list[Chunk]) -> str:
    if kept:
        return _RULE_CATEGORY_BY_TOPIC.get(kept[0].topic, _RULE_CATEGORY_FALLBACK)
    return _RULE_CATEGORY_FALLBACK


# Static suggestion pools (SPEC-008 §Suggestions), learner-voice, under 60 chars.
_TOPIC_SUGGESTIONS = {
    "mindset": "How do risk factors stack up on a ride?",
    "machine": "What's in the T-CLOC pre-ride walkaround?",
    "gear": "What gear belongs on every single ride?",
    "terrain": "How do I read a hill before I commit to it?",
    "environment": "What goes into a solid ride plan?",
    "roads": "Why is pavement riskier than it looks?",
    "general": "How do I keep my machine ready between rides?",
}
_ADJACENT_TOPICS = {
    "mindset": ["machine", "terrain", "environment"],
    "machine": ["gear", "terrain", "roads"],
    "gear": ["machine", "environment", "mindset"],
    "terrain": ["environment", "machine", "mindset"],
    "environment": ["terrain", "gear", "mindset"],
    "roads": ["machine", "mindset", "terrain"],
    "general": ["machine", "gear", "terrain"],
}
_BRIDGE_BACK_SUGGESTIONS = [
    "What does the course say about pre-ride checks?",
    "Which module covers reading terrain?",
    "What gear does the course treat as non-negotiable?",
]

# self_harm intentionally gets no suggestion buttons (policy notes).
_TRIAGE_SUGGESTIONS = {
    "self_harm": [],
    "stunt_technique": [
        "What skills make a rider genuinely good?",
        "How do I place my wheels precisely on a trail?",
        "What does Module 4 teach about reading terrain?",
    ],
    "impaired_riding": [
        "How does alcohol affect hazard perception?",
        "What does Module 6 say about riding days?",
        "What's a pre-commitment and why does it work?",
    ],
    "medical": [
        "What belongs in a trail first-aid kit?",
        "How do I plan for emergencies on a ride?",
        "Why do helmets get retired after one impact?",
    ],
    "legal_specific": [
        "What categories of ATV rules exist?",
        "Why do most places ban ATVs from pavement?",
        "What should I check before riding somewhere new?",
    ],
    "minor_unsupervised": [
        "What makes a machine the right size for me?",
        "What should my supervisor and I practice next?",
        "Why does machine fit matter so much?",
    ],
    "prompt_injection": [
        "What's in the pre-ride walkaround?",
        "Why does gear matter on every ride?",
        "How do I read a hill before I commit to it?",
    ],
}


def _triage_suggestions(category_id: str) -> list[str]:
    return list(_TRIAGE_SUGGESTIONS.get(category_id, _BRIDGE_BACK_SUGGESTIONS))


def _default_suggestions(grounding: str, kept: list[Chunk]) -> list[str]:
    """Curriculum-grounded -> adjacent corpus topics; general -> bridge back."""
    if not kept:
        return list(_BRIDGE_BACK_SUGGESTIONS)
    adjacent = _ADJACENT_TOPICS.get(kept[0].topic, _ADJACENT_TOPICS["general"])
    return [_TOPIC_SUGGESTIONS[topic] for topic in adjacent[:3]]
