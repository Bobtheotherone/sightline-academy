# NON-GOALS — Binding Exclusions

These are not suggestions. If you find yourself building any of the following,
stop, delete it, and note the near-miss in `BUILDLOG.md`.

## 1. No governance apparatus (the v1 disease)

v1 drowned in its own review machinery: fifteen review-status labels on every row
of content, an approval ledger with signed external gates, a tutor that refused
almost everything, and review dashboards nobody asked for. **None of that comes
back.** Specifically excluded:

- ❌ Review-status fields on content records (`reviewStatus`, approval ledgers,
  release gates, signoff workflows, "blocked_from_student_release" states).
- ❌ A review/approvals UI of any kind.
- ❌ Meta-processes: process documents about how to follow process documents,
  checklists that verify other checklists, tests that test the test harness.
- ❌ Recursive quality spirals: if you catch a real bug, fix it and move on. Do not
  generalize one bug into a new validation framework, a new lint rule campaign, or
  a sweep of the codebase for hypothetical siblings unless the same bug has
  actually appeared 3+ times.
- ❌ Exhaustive unit-test pyramids. The verification budget (QA-003) allows: the
  visual crawl, three E2E journeys, one API smoke suite, and targeted tests for
  the four genuinely tricky pure functions named in QA-003. That's the ceiling.
- ❌ Type gymnastics. `tsc --noEmit` clean and `ruff check` clean are sufficient.
  No mypy strict-mode campaigns, no branded-type refactors, no "represent this
  boolean as a proper enum" passes. If it type-checks and works, ship it.

**The test:** every hour spent must move a learner-visible or tutor-visible
outcome. Hours that only move internal confidence metrics are budget violations.

## 2. No scope beyond the specs

- ❌ Native mobile apps (the web app must be responsive; that is all).
- ❌ Payments, subscriptions, marketing pages beyond the single public landing page.
- ❌ Social features: leaderboards, public profiles, comments, sharing feeds.
  (Public ranking is also a safety non-goal — see SPEC-009.)
- ❌ Multi-language i18n scaffolding. English only; write copy directly.
- ❌ Real-time multiplayer/classroom activities (v1's "classwide activity" host
  mode). The instructor view in SPEC-011 is read-only analytics, nothing live.
- ❌ Video hosting/production. Visual richness comes from illustration, layout,
  and interaction — not embedded video.
- ❌ A CMS or content-editing UI. Content is code (`ADR-006`); edits are commits.
- ❌ Email verification/sending infrastructure. Registration is immediate;
  password reset is deferred to the post-launch list (document it, don't build it).

## 3. No unsafe or off-mission content behavior

- ❌ The tutor never provides stunt/racing/thrill techniques, never coaches
  evading supervision or law, never gives specific medical dosing/diagnosis or
  jurisdiction-specific legal rulings. (Redirect templates: SPEC-008 §Safety.)
- ❌ XP/badges never reward speed of completion, streak pressure, or risky choices
  in scenarios (SPEC-009 forbidden-signals list — this v1 idea survives).
- ❌ No dark patterns: no fake urgency, no manipulative retention mechanics.

## 4. No relitigating decided architecture

The ADRs are final for this build. Do not swap FastAPI for Node "for consistency,"
do not replace Chroma with pgvector "for simplicity," do not introduce Next.js.
If an ADR truly cannot be implemented as written (a real technical impossibility,
not a preference), implement the nearest workable alternative and record exactly
what and why in `BUILDLOG.md` — one paragraph, then back to building.
