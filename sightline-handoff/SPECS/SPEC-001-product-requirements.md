# SPEC-001 — Product Requirements

Requirements use EARS-style phrasing. Every REQ has acceptance criteria (AC)
that are individually verifiable by a human or by the QA suite. IDs are stable —
reference them in commits and BUILDLOG entries.

Priority: **P0** = launch-blocking, **P1** = required before "done", **P2** =
build if wave schedule allows, otherwise add to the deferred list in README.

---

## R1 — Accounts & Access (P0)

- **R1.1** WHEN a visitor submits a valid email + password (≥10 chars) + display
  name on the register screen, THE SYSTEM SHALL create a learner account, start a
  session, and land them on the Dashboard with a first-run welcome state.
  - AC: duplicate email → inline error "That email already has an account. Log in
    instead?" with a link; weak password → inline requirement hint; success →
    Dashboard shows the learner's display name.
- **R1.2** WHEN a returning user logs in with correct credentials, THE SYSTEM
  SHALL restore their exact position (last module/lesson, journal, XP).
  - AC: log in on a second browser; Dashboard "Continue" deep-links to the exact
    lesson step they left.
- **R1.3** WHEN login or registration fails 8 times from one IP within 5
  minutes, THE SYSTEM SHALL rate-limit further attempts for 10 minutes (HTTP 429
  with a friendly UI message).
- **R1.4** WHILE unauthenticated, IF a user requests any authenticated route,
  THE SYSTEM SHALL redirect to Login preserving the intended destination.
- **R1.5** THE SYSTEM SHALL provide, on the Account page: display-name edit,
  password change, JSON export of the user's data, and account deletion with a
  typed confirmation.

## R2 — Course Structure & Progression (P0)

- **R2.1** THE SYSTEM SHALL present the six modules of CURRICULUM/ as a course
  map with per-module progress, locked/unlocked state, and estimated minutes.
  - AC: Module N+1 unlocks when Module N's required steps are complete; locked
    modules show a designed locked state (not a dead link).
- **R2.2** WHEN a learner opens a lesson, THE SYSTEM SHALL render its steps in
  the Briefing → Learn → Try → Debrief → Journal → Checkpoint arc with a
  persistent progress rail and resume-ability at step granularity.
- **R2.3** WHEN a learner completes a step's required evidence, THE SYSTEM SHALL
  persist the evidence immediately (optimistic UI + server confirm) and advance.
  - AC: hard-refresh mid-lesson returns to the same step with prior inputs shown.
- **R2.4** WHEN all required steps of a lesson are complete, THE SYSTEM SHALL
  mark the lesson complete, award its XP events (SPEC-009), and surface the next
  action (next lesson / module debrief / journal artifact).
- **R2.5** THE SYSTEM SHALL support "review mode": completed lessons reopenable
  with prior answers visible and re-attemptable without losing completion.
- **R2.6 (P1)** WHEN a module completes, THE SYSTEM SHALL show a module-complete
  moment (earned badge, journal artifact recap, next-module teaser) worth a
  screenshot.

## R3 — Interactive Activities (P0)

- **R3.1** THE SYSTEM SHALL implement all twelve renderer types in SPEC-007 with
  the exact data contracts there; every activity instance in CURRICULUM/ renders
  without console errors and is completable.
- **R3.2** WHEN a learner answers a knowledge check option, THE SYSTEM SHALL show
  that option's authored feedback (right or wrong), allow retry until the best
  answer is found, and record first-attempt correctness for the instructor view.
- **R3.3** All activities SHALL be keyboard-operable and function on a 375px
  viewport (sorting and matching may switch to tap-to-assign mode on touch).

## R4 — Field Journal (P0)

- **R4.1** WHEN a lesson's journal step is reached, THE SYSTEM SHALL open the
  journal builder for that artifact type pre-scaffolded per its definition, and
  save drafts continuously.
- **R4.2** THE Field Journal page SHALL display all artifacts (draft or
  complete) as designed cards with type, module origin, updated time, and open
  actions; empty state invites the learner toward Module 1.
- **R4.3** WHEN the learner reaches the Module 6 capstone, THE SYSTEM SHALL
  surface their prior artifacts inside the Ride Plan builder for reference and
  reuse.

## R5 — AI Tutor "Ranger" (P0)

- **R5.1** THE SYSTEM SHALL provide a persistent tutor surface reachable from
  every authenticated page (dedicated route + slide-over on lesson pages) with
  conversation history per user.
- **R5.2** WHEN a learner asks a question, THE SYSTEM SHALL respond per
  SPEC-008's pipeline, rendering markdown, grounding label, source chips
  (deep-linking to modules), and 2–3 tappable follow-up suggestions.
- **R5.3** THE SYSTEM SHALL answer general ATV/road-safety questions not covered
  by the curriculum (grounding label `general`) — never the v1 refusal wall.
- **R5.4** THE SYSTEM SHALL apply the safety triage of SPEC-008 §Safety before
  generation; triaged responses use the authored templates.
- **R5.5** WHILE no `ANTHROPIC_API_KEY` is configured, THE SYSTEM SHALL serve the
  extractive fallback and show a subtle "offline mode" note in the tutor header.
- **R5.6 (P1)** WHEN the provider supports streaming, tokens SHALL stream into
  the UI with a typing affordance.

## R6 — Gamification & Certificate (P1)

- **R6.1** XP, levels, and badges per SPEC-009; visible on Dashboard and a
  Progress page; never rewarding forbidden signals (speed, risk, ranking).
- **R6.2** WHEN the final assessment is passed (≥80%), THE SYSTEM SHALL issue a
  completion certificate page: learner name, date, verification code, the
  disclaimer text of SPEC-009 §Certificate, print stylesheet, and a public
  verification route `/verify/:code`.

## R7 — Public Surface (P0)

- **R7.1** THE SYSTEM SHALL serve an unauthenticated landing page that sells the
  course honestly (hero per DESIGN-003 §Landing, module overview, tutor teaser,
  single CTA to register) and nothing else public except login, register, and
  `/verify/:code`.

## R8 — Instructor View (P2)

- **R8.1** Users whose email is in `INSTRUCTOR_EMAILS` see an Instructor route:
  aggregate stats (registrations, module completion funnel, common wrong answers
  per knowledge check, tutor question themes) — read-only, no PII beyond display
  names, CSV export. See SPEC-011.

## R9 — Quality Bars (P0, cross-cutting)

- **R9.1** Every route in SPEC-010 SHALL have designed loading, empty, and error
  states — zero browser-default surfaces anywhere.
- **R9.2** Initial JS ≤ 350KB gzipped; route-level code splitting; Lighthouse
  performance ≥ 85 desktop on Dashboard and a lesson page.
- **R9.3** WCAG-minded baseline: visible focus states everywhere, semantic
  landmarks, alt text on illustrations, contrast per DESIGN-001 pairings,
  `prefers-reduced-motion` respected.
- **R9.4** All API errors reach the UI as designed toasts/inline states with
  human copy per DESIGN-005 — never raw JSON or stack traces.
