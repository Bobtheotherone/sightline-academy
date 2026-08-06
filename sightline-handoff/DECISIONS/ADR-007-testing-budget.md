# ADR-007 — Testing Budget

**Status:** Accepted. Enforced by QA-003.

## Decision

The verification suite is capped at:
1. **Visual crawl** (Playwright screenshot pass over SPEC-010's route×state
   matrix) — the primary quality instrument, run repeatedly.
2. **Three E2E journeys** (QA-002): new-learner first session; full-course
   completion (seeded fast-path); tutor conversation covering the four modes.
3. **One API smoke suite**: every SPEC-004 endpoint hit once happy-path + the
   auth failure cases (401/403/422) — table-driven, one file.
4. **Unit tests only for**: seed parser, XP rule engine, retrieval shaping
   (floor/dedupe/grounding classification), and safety triage patterns.

Nothing else. Coverage percentage is not tracked. Type-checking (`tsc`, `ruff`)
plus the above is the whole gate.

## Why

The failure mode we are steering away from is not "too few tests" — it is a
build that spends its schedule proving properties users never see while the
product stays half-styled. The visual crawl finds the defects that matter for
this product class; the journeys prove the money paths; the four unit targets
are the only genuinely intricate pure logic in the system.
