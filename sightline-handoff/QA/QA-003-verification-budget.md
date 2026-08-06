# QA-003 — Verification Budget (binding; see ADR-007, NON_GOALS §1)

## The complete allowed test surface
1. Visual crawl + review (QA-001) — unbounded iterations; this is where
   quality time goes.
2. Journeys J1–J3 + API smoke (QA-002).
3. Unit tests for exactly four targets:
   - `services/seed.py` parser (malformed content fails loudly; good content
     round-trips; knowledge-check single-isBest rule).
   - `services/xp.py` (rules fire once; forbidden signals throw; risky-choice
     never awards).
   - `tutor/retrieval.py` shaping (floor, topic-dedupe, grounding
     classification boundaries).
   - `tutor/safety.py` (each category: 3 matching + 2 near-miss non-matching
     inputs from safety_policy.json's test lists).
4. `tsc --noEmit`, `eslint` (default config), `ruff check` — clean, not tuned.

## Explicitly out of budget
Component snapshot tests, storybook, coverage thresholds, mutation testing,
contract-test frameworks, mypy strict, custom lint rules, load testing,
dependency-audit automation, pre-commit hook engineering. If something here
seems necessary, it isn't; note the urge in BUILDLOG and move on.

## The 15% alarm (from AGENT_OPERATIONS)
If verification/infra work exceeds ~15% of a wave, stop, ship learner-visible
work until the ratio recovers. The product being beautiful and complete IS the
quality strategy.
