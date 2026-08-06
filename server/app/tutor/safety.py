"""Safety triage (SPEC-008 §Safety) — regex-first, runs BEFORE retrieval.

The policy file is the verbatim STARTER copy (never edited here). First matching
category wins, in the order the policy lists them (STARTER contract); anything
unmatched proceeds to generation, where the system prompt is the nuanced backstop.
Unit target per QA-003: every testMatch triggers its category, every testNearMiss
triggers none.
"""

import json
import re
from functools import lru_cache
from pathlib import Path

POLICY_PATH = Path(__file__).with_name("safety_policy.json")


@lru_cache
def load_policy() -> dict:
    """Load and cache safety_policy.json once per process."""
    return json.loads(POLICY_PATH.read_text(encoding="utf-8"))


def triage(message: str) -> dict | None:
    """Return the first matching category dict (policy order), or None."""
    for cat in load_policy()["categories"]:
        if any(re.search(pattern, message) for pattern in cat["patterns"]):
            return cat
    return None
