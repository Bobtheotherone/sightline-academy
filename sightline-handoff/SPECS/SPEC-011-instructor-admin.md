# SPEC-011 — Instructor View (P2, deliberately small)

One read-only analytics page for `instructor`-role users (ADR-003). This exists
so the professor can see the module working; it is not an LMS.

## `/instructor` content (single page, four sections)
1. **Topline cards:** total learners, active last 7 days, certificates issued,
   median modules completed.
2. **Module funnel:** horizontal bar per module — started vs completed. Data
   from module_completions + step_evidence existence.
3. **Knowledge check insights:** per checkpoint MC: first-attempt-correct %,
   and the most-picked wrong option with its text — this is the professor's
   misconception radar. Sortable by lowest correct %.
4. **Ranger themes:** count of tutor questions bucketed by matched corpus topic
   (from sources logged on tutor_messages) + count of triage events by
   category. No message text shown (privacy).

CSV export button = GET /instructor/export.csv. No learner emails anywhere in
this view; display names only in no section (aggregate-only — zero per-learner
drill-down in this build).

Non-instructor hitting `/instructor`: designed 403 state ("This area is for
course staff") — never a blank page or redirect loop.
