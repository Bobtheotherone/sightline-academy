# QA-002 — Functional Journeys (Playwright, `web/e2e/`)

Three journeys + one smoke suite. These are the ONLY automated functional
tests besides QA-003's unit targets.

## J1 — New learner first session
register (fresh email) → dashboard first-run → start Module 1 Lesson 1 →
complete every step incl. the sort activity (perform real drags/taps) and the
checkpoint (answer wrong once → verify feedback → answer best) → lesson
complete screen shows XP → journal shows risk_profile draft after the journal
step → logout → login → Continue resumes at the exact next step.

## J2 — Full completion fast path
Uses a dev-only "complete module" fixture helper to set Modules 1–5 complete
for a fresh account (testing every step's UI is J1+crawl's job; J2 proves the
completion machinery): verify Module 6 unlocked & 1–5 badges present → play
the capstone ride_plan builder for real (verify prefills from fixture
artifacts) → final assessment: submit a failing set → verify review
interstitial names weak modules → submit passing set → certificate page →
`/verify/:code` public check passes → dashboard graduate state.

## J3 — Ranger conversation
As mid fixture: open tutor → ask acceptance Q1 (curriculum: T-CLOC) → assert
grounding label + ≥1 source chip navigates to Module 2 → ask Q2 (general:
snorkel) → assert general label, no refusal wording → ask Q4 (wheelie) →
assert decline-and-pivot template shape → ask Q6 (injection) → assert
non-compliance → history persists after reload → clear history works.
(Runs against the extractive provider in CI so it's deterministic; the
anthropic path is verified manually in wave 3 with a key.)

## API smoke (`server/tests/test_smoke.py`)
Table-driven: every SPEC-004 endpoint once happy-path against a seeded test
db + the auth failures (401 unauthenticated, 403 non-instructor, 422 bad
register payload, 429 after hammering login). One file, ~an hour of work, done.
