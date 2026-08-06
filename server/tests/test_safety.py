"""Safety-triage unit target (QA-003 §3.4).

For every category in safety_policy.json: each testMatch string must triage as
exactly that category (first-match-wins in policy order, so an earlier category
stealing the hit fails the test), and each testNearMiss must triage as nothing.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest

from app.tutor.safety import load_policy, triage

_CATEGORIES = load_policy()["categories"]

MATCH_CASES = [
    (cat["id"], text) for cat in _CATEGORIES for text in cat["testMatch"]
]
NEAR_MISS_CASES = [
    (cat["id"], text) for cat in _CATEGORIES for text in cat["testNearMiss"]
]


def test_policy_covers_all_expected_categories() -> None:
    assert [cat["id"] for cat in _CATEGORIES] == [
        "self_harm",
        "stunt_technique",
        "impaired_riding",
        "medical",
        "legal_specific",
        "minor_unsupervised",
        "prompt_injection",
    ]


@pytest.mark.parametrize(("category_id", "text"), MATCH_CASES)
def test_match_triggers_exactly_its_category(category_id: str, text: str) -> None:
    hit = triage(text)
    assert hit is not None, f"{text!r} should triage as {category_id}, got no match"
    assert hit["id"] == category_id, (
        f"{text!r} should triage as {category_id}, got {hit['id']} (policy order)"
    )


@pytest.mark.parametrize(("category_id", "text"), NEAR_MISS_CASES)
def test_near_miss_triggers_no_category(category_id: str, text: str) -> None:
    hit = triage(text)
    assert hit is None, (
        f"{text!r} (near-miss for {category_id}) wrongly triaged as {hit and hit['id']}"
    )
