"""Reference implementation: Ranger's answer pipeline (SPEC-008, ADR-004/005).

Copy to server/app/tutor/pipeline.py and wire to the FastAPI router. This file
is the CONTRACT for the pipeline's stages and their order; the streaming
variant (SSE, SPEC-004) wraps stage 5 without changing anything else.

Stages: normalize -> triage -> retrieve -> compose -> generate -> shape -> persist

Key behaviors this file pins down (do not renegotiate):
- Triage runs BEFORE retrieval; a hard-triage hit answers from the policy
  template (legal_specific still retrieves — it's a shaped answer, ADR-005).
- Retrieval shaping: top-k=6 -> drop below SOFT_FLOOR -> dedupe to <=2 per
  topic -> keep <=4. The floor is SOFT: an empty result changes the grounding
  label, never the willingness to answer.
- Grounding: >=2 kept chunks -> "curriculum"; 1 -> "mixed"; 0 -> "general".
  (Unit-tested; ADR-007 target #3.)
- Provider adapter: "anthropic" when ANTHROPIC_API_KEY is set, else
  "extractive" — the app must be fully demo-able keyless.
- Suggestions arrive in-band as a trailing fenced json block and are stripped
  from the displayed text (SPEC-008).
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field

TOP_K = 6
SOFT_FLOOR = 0.30        # cosine similarity; tune once against acceptance Qs
MAX_PER_TOPIC = 2
MAX_KEPT = 4
HISTORY_TURNS = 10

SUGGESTIONS_RE = re.compile(r"```json\s*(\{.*?\})\s*```\s*$", re.S)


@dataclass
class Chunk:
    id: str
    title: str
    topic: str
    body: str
    score: float


@dataclass
class TutorReply:
    text: str
    grounding: str                    # "curriculum" | "mixed" | "general" | "triage"
    triage_category: str | None
    sources: list[dict]               # [{id, title}] for SourceChips
    suggestions: list[str]
    provider: str                     # "anthropic" | "extractive" | "policy"
    extra: dict = field(default_factory=dict)


# --------------------------------------------------------------------------- #
# Stage 2 — triage (policy loaded from safety_policy.json at startup)
# --------------------------------------------------------------------------- #

def triage(message: str, policy: dict) -> dict | None:
    """First matching category wins, in policy order. Returns category or None."""
    for cat in policy["categories"]:
        if any(re.search(p, message) for p in cat["patterns"]):
            return cat
    return None


# --------------------------------------------------------------------------- #
# Stage 3 — retrieve + shape (ADR-004)
# --------------------------------------------------------------------------- #

def shape_retrieval(raw: list[Chunk]) -> list[Chunk]:
    """top-k in -> floored, topic-deduped, capped out. Pure; unit-test target."""
    floored = [c for c in raw if c.score >= SOFT_FLOOR]
    kept: list[Chunk] = []
    per_topic: dict[str, int] = {}
    for c in sorted(floored, key=lambda c: c.score, reverse=True):
        if per_topic.get(c.topic, 0) >= MAX_PER_TOPIC:
            continue
        kept.append(c)
        per_topic[c.topic] = per_topic.get(c.topic, 0) + 1
        if len(kept) == MAX_KEPT:
            break
    return kept


def grounding_label(kept: list[Chunk]) -> str:
    """Unit-test target (ADR-007 #3): 2+ curriculum / 1 mixed / 0 general."""
    if len(kept) >= 2:
        return "curriculum"
    if len(kept) == 1:
        return "mixed"
    return "general"


# --------------------------------------------------------------------------- #
# Stage 5 fallback — extractive offline provider (no API key)
# --------------------------------------------------------------------------- #

def extractive_answer(message: str, kept: list[Chunk]) -> str:
    """Keyless mode: honest, useful, obviously non-generative.

    Composes from the retrieved chunks' own prose. The UI shows the
    offline-mode header (SPEC-010) so nobody mistakes this for the full tutor.
    """
    if not kept:
        return (
            "I'm running in offline mode right now, and I don't have course "
            "notes matching that question — so rather than guess, here's my "
            "suggestion: try rephrasing with the machine, terrain, gear, or "
            "road topic you're after, or browse the course modules directly. "
            "When my full connection is back I can answer this properly."
        )
    parts = [
        "I'm in offline mode, so here's what the course notes say directly:"
    ]
    for c in kept[:2]:
        # First 2 sentences of each kept chunk — extractive, not generative.
        sentences = re.split(r"(?<=[.!?])\s+", c.body.strip())
        excerpt = " ".join(sentences[:2])
        parts.append(f"From \u201c{c.title}\u201d: {excerpt}")
    parts.append(
        "That's the extract — the relevant lesson has the full picture, and "
        "the source chips below link what I drew from."
    )
    return "\n\n".join(parts)


# --------------------------------------------------------------------------- #
# Stage 6 — shape reply (strip in-band suggestions)
# --------------------------------------------------------------------------- #

def split_suggestions(raw_text: str) -> tuple[str, list[str]]:
    m = SUGGESTIONS_RE.search(raw_text)
    if not m:
        return raw_text.strip(), []
    try:
        suggestions = json.loads(m.group(1)).get("suggestions", [])[:3]
    except json.JSONDecodeError:
        suggestions = []
    return raw_text[: m.start()].strip(), [s for s in suggestions if isinstance(s, str)]


# --------------------------------------------------------------------------- #
# The pipeline
# --------------------------------------------------------------------------- #

def answer(message: str, *, user, db, chroma, llm, policy: dict) -> TutorReply:
    msg = " ".join(message.split())[:2000]                       # 1 normalize

    cat = triage(msg, policy)                                    # 2 triage
    if cat and cat["id"] != "legal_specific":
        reply = TutorReply(
            text=cat["template"], grounding="triage",
            triage_category=cat["id"], sources=[], provider="policy",
            suggestions=_triage_suggestions(cat["id"]),
        )
        _persist(db, user, msg, reply)                           # 7 persist
        return reply

    raw = _query_chroma(chroma, msg, k=TOP_K)                    # 3 retrieve
    kept = shape_retrieval(raw)
    grounding = grounding_label(kept)

    if llm.provider == "anthropic":                              # 4-5 compose+generate
        prompt_vars = {
            "curriculum_map": _curriculum_map(db),
            "learner_position": _learner_position(db, user),
            "retrieved_chunks": _format_chunks(kept),
        }
        history = _history(db, user, turns=HISTORY_TURNS)
        raw_text = llm.complete(system=prompt_vars, history=history, user=msg,
                                shaped_by=cat)   # legal_specific shaping hint
        provider = "anthropic"
    else:
        raw_text = extractive_answer(msg, kept)
        provider = "extractive"

    text, suggestions = split_suggestions(raw_text)              # 6 shape
    if not suggestions:
        suggestions = _default_suggestions(grounding, kept)

    reply = TutorReply(
        text=text, grounding=grounding,
        triage_category=cat["id"] if cat else None,
        sources=[{"id": c.id, "title": c.title} for c in kept],
        suggestions=suggestions, provider=provider,
    )
    _persist(db, user, msg, reply)                               # 7 persist
    return reply


# --------------------------------------------------------------------------- #
# Helpers the app supplies (signatures pinned; bodies are the Tutor agent's)
# --------------------------------------------------------------------------- #

def _query_chroma(chroma, msg: str, k: int) -> list[Chunk]: ...
def _curriculum_map(db) -> str: ...
def _learner_position(db, user) -> str: ...
def _format_chunks(kept: list[Chunk]) -> str: ...
def _history(db, user, turns: int) -> list[dict]: ...
def _persist(db, user, msg: str, reply: TutorReply) -> None: ...
def _triage_suggestions(category_id: str) -> list[str]: ...
def _default_suggestions(grounding: str, kept: list[Chunk]) -> list[str]: ...
