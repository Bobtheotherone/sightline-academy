# SPEC-006 — Learning Engine

The learning engine turns CURRICULUM/ content into a progressing, resumable,
rewarding experience. It is the product's core.

## Hierarchy & unlocking

- Course → 6 modules → 3–4 lessons each → 4–9 steps each.
- Module 1 starts unlocked. Module N+1 unlocks when Module N's lessons are all
  complete. Lessons inside a module are sequenced but a completed module's
  lessons are freely revisitable (review mode, R2.5).
- The final assessment unlocks when Modules 1–6 are complete. The certificate
  issues on a passing attempt (≥80%); retakes allowed after a designed
  "review these modules" interstitial listing weak areas (from perQuestion
  results mapped to modules).

## The lesson player

One route (`/learn/:lessonId`) hosting the step sequence:

- **Progress rail** (left on desktop, top on mobile): section-grouped step dots
  with the six-section arc labeled; current step highlighted; completed steps
  checked; clicking a completed step revisits it.
- **Stage**: renders the current step via its renderer component (SPEC-007).
- **Footer bar**: back / continue. Continue is disabled until required evidence
  exists; disabled state shows *why* ("Choose an option and a reason to
  continue") — never a mute dead button.
- **Persistence**: every evidence change PUTs immediately (debounced 400ms for
  text); the player restores from server evidence on load (R2.3).
- **Section transitions**: brief designed interstitial when the section changes
  (e.g., Learn → Try): section name, one-line purpose, subtle motion. Skippable,
  respects reduced-motion.
- **Lesson complete**: summary screen — XP earned itemized, checkpoint result,
  journal artifact card if one was built, primary CTA to next lesson.

## Evidence semantics (per renderer; contracts in SPEC-007)

Evidence `kind` mirrors the renderer. Server-side completion validation:
- choice-type: a valid option id (+ reason chip when the payload requires one).
- classification/match/hotspot: full correct mapping achieved (the UI lets the
  learner iterate until correct — completion means "reached correct state", and
  attempts are not penalized).
- written: min length from payload (default 120 chars) — quality is coached by
  inline guidance, not gated by AI scoring.
- knowledge check: any attempt records first_attempt_correct; completion when
  best answer found.

## Field Journal

Artifact types this course uses (definitions live in the curriculum content):
`risk_profile` (M1), `gear_card` (M3), `inspection_log` (M2), `hazard_brief`
(M4), `readiness_plan` (M5), `ride_plan` (M6 capstone). Journal steps open the
journal_builder renderer scaffolded with the artifact's fields; drafts autosave;
completing the step marks the artifact complete. The Journal page (R4.2) is a
first-class designed surface, and the Ride Plan builder embeds read-only views
of prior artifacts (R4.3).

## The capstone (Module 6, Lesson 4 — "The Ride Plan")

A multi-step builder producing the `ride_plan` artifact: route & terrain
expectations, gear list (pre-filled from gear_card), machine inspection plan
(from inspection_log), hazard anticipation (from hazard_brief), communication &
emergency plan (from readiness_plan), and a go/no-go decision framework. The
completed Ride Plan gets a polished shareable/printable layout — it's the
course's tangible takeaway alongside the certificate.

## Resume & continuity

- `learner_state` updates on every step visit; Dashboard "Continue" uses it.
- Deep links to any unlocked lesson/step are valid URLs (hard refresh safe).
- Completing everything flips the Dashboard into "graduate" state: certificate
  card, Ride Plan card, "keep exploring with Ranger" prompt.
