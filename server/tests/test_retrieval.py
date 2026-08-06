"""Retrieval-shaping unit target (QA-003 §3.3).

Covers the soft-floor boundary, topic dedupe (<=2 per topic, by score order),
the kept cap of 4, and the grounding-label boundaries at 0/1/2 kept chunks.
Pure functions only — nothing here touches Chroma.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.tutor.retrieval import (
    MAX_KEPT,
    SOFT_FLOOR,
    Chunk,
    grounding_label,
    shape_retrieval,
)


def make_chunk(chunk_id: str, topic: str, score: float) -> Chunk:
    return Chunk(id=chunk_id, title=chunk_id, topic=topic, body="Body prose.", score=score)


# ── Soft floor ───────────────────────────────────────────────────────────────


def test_floor_keeps_scores_at_and_above_boundary() -> None:
    raw = [
        make_chunk("at-floor", "machine", SOFT_FLOOR),
        make_chunk("above", "gear", SOFT_FLOOR + 0.2),
    ]
    kept = shape_retrieval(raw)
    assert {c.id for c in kept} == {"at-floor", "above"}


def test_floor_drops_scores_just_below_boundary() -> None:
    raw = [
        make_chunk("below", "machine", SOFT_FLOOR - 0.001),
        make_chunk("above", "gear", SOFT_FLOOR + 0.1),
    ]
    kept = shape_retrieval(raw)
    assert [c.id for c in kept] == ["above"]


def test_all_below_floor_yields_empty_not_error() -> None:
    raw = [make_chunk(f"c{i}", "roads", 0.05 * i) for i in range(1, 5)]
    assert shape_retrieval(raw) == []


# ── Topic dedupe ─────────────────────────────────────────────────────────────


def test_topic_dedupe_keeps_top_two_per_topic_by_score() -> None:
    raw = [
        make_chunk("machine-low", "machine", 0.5),
        make_chunk("machine-top", "machine", 0.9),
        make_chunk("machine-mid", "machine", 0.7),
    ]
    kept = shape_retrieval(raw)
    assert [c.id for c in kept] == ["machine-top", "machine-mid"]


def test_topic_dedupe_lets_other_topics_through() -> None:
    raw = [
        make_chunk("m1", "machine", 0.9),
        make_chunk("m2", "machine", 0.8),
        make_chunk("m3", "machine", 0.7),
        make_chunk("r1", "roads", 0.6),
    ]
    kept = shape_retrieval(raw)
    assert [c.id for c in kept] == ["m1", "m2", "r1"]


# ── Cap ──────────────────────────────────────────────────────────────────────


def test_cap_keeps_at_most_four_highest_scoring() -> None:
    raw = [
        make_chunk("a", "mindset", 0.95),
        make_chunk("b", "machine", 0.90),
        make_chunk("c", "gear", 0.85),
        make_chunk("d", "terrain", 0.80),
        make_chunk("e", "roads", 0.75),
        make_chunk("f", "environment", 0.70),
    ]
    kept = shape_retrieval(raw)
    assert len(kept) == MAX_KEPT
    assert [c.id for c in kept] == ["a", "b", "c", "d"]


# ── Grounding label boundaries ───────────────────────────────────────────────


def test_grounding_zero_kept_is_general() -> None:
    assert grounding_label([]) == "general"


def test_grounding_one_kept_is_mixed() -> None:
    assert grounding_label([make_chunk("only", "gear", 0.6)]) == "mixed"


def test_grounding_two_or_more_kept_is_curriculum() -> None:
    two = [make_chunk("a", "gear", 0.6), make_chunk("b", "roads", 0.5)]
    assert grounding_label(two) == "curriculum"
    four = [*two, make_chunk("c", "machine", 0.4), make_chunk("d", "terrain", 0.35)]
    assert grounding_label(four) == "curriculum"
