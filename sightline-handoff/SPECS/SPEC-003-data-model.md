# SPEC-003 — Data Model (SQLAlchemy over SQLite)

Real columns for identity/relations/query fields; JSON columns for authored
payloads that the frontend consumes as-is. Timestamps are UTC ISO strings.

## Identity & auth

**users** — id (uuid pk), email (unique, lowercased), display_name,
password_hash, role ('learner'|'instructor'), created_at, last_login_at.

**sessions** — token_hash (pk), user_id fk, created_at, expires_at, last_seen_at.

## Course content (seeded from content/curriculum/)

**course_meta** — id (pk='course'), title, tagline, version (content hash),
module_order (json list of module ids).

**modules** — id (slug pk, e.g. 'm2-know-your-machine'), order, title,
tagline, mission (1–2 sentence learner mission), estimated_minutes,
objectives (json list), badge_id, hero_slot (illustration slot name).

**lessons** — id (slug pk), module_id fk, order, title, summary,
estimated_minutes, sections_present (json list of section ids).

**steps** — id (slug pk), lesson_id fk, order, section
('briefing'|'learn'|'try'|'debrief'|'journal'|'checkpoint'), renderer
(SPEC-007 type), title, minutes, required (bool), payload (json — the full
renderer contract data incl. instructions, options, feedback, asset slots).

## Learner progress

**step_evidence** — id (pk = user_id::step_id), user_id, step_id, lesson_id,
module_id, kind, value (json), complete (bool), first_attempt_correct
(bool|null — knowledge checks only), updated_at.

**lesson_completions** — id (pk = user_id::lesson_id), user_id, lesson_id,
module_id, completed_at.

**module_completions** — id (pk = user_id::module_id), user_id, module_id,
completed_at.

**learner_state** — user_id pk, last_lesson_id, last_step_id, updated_at.

**xp_events** — id uuid, user_id, event (rule name), xp, label, created_at.

**badge_awards** — id (pk = user_id::badge_id), user_id, badge_id, created_at.

**journal_artifacts** — id (pk = user_id::artifact_type), user_id,
artifact_type, title, fields (json map), status ('draft'|'complete'),
module_id, updated_at.

**assessment_attempts** — id uuid, user_id, kind ('final'), score_pct,
passed (bool), answers (json), created_at.

**certificates** — code (pk, 10-char base32), user_id, issued_at, name_on_cert.

## Tutor

**tutor_messages** — id uuid, user_id, role ('user'|'assistant'), content
(markdown), grounding, sources (json list of chunk ids), triage_category
(nullable), created_at. (History endpoint reads last 50; context uses last 10.)

## Seed pipeline rules

- Deterministic ids from content front-matter; re-seeding with unchanged content
  is a no-op; changed content upserts and bumps course_meta.version.
- Parser validations (fail-loud): every activity JSON block validates against
  its SPEC-007 contract; every knowledge check has exactly one `isBest`; every
  lesson has a checkpoint step; module/lesson/step ids unique.
