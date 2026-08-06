# Crawl pass 6 review — post-defect-fix reconfirmation (run qa/crawl-runs/20260806-143447)

92 screenshots, 0 skips. Pass 5 was the zero-P1/P2 exit pass; this pass exists
because an adversarial verification round afterwards found real defects, and
QA-001's fix-forward rule means a screen changed after an exit pass has to be
re-shot and re-reviewed rather than assumed.

## What changed since pass 5, and what it looks like now

- **Dashboard Continue card (was P2).** It pointed backwards at an already-answered
  step whenever the last-visited lesson was complete, labelling that finished step
  "Up next" and landing the learner in review mode. Now resolved from real course
  data with fall-forward. On film this pass:
  - `dashboard--mid-course-continue-card` — unchanged and correct: Module 3 · Gear Up,
    "Head to Toe", Step 1 of 2, "Up next: Sort the gear", CTA "Pick up the trail".
    This is the R1.2 regression case (mid-lesson resume) and it still deep-links to
    `m3-l2-s1`.
  - `dashboard--graduate` — unchanged: certificate card with the live code, Ride Plan
    card, Ranger prompt, six modules at 100%.
  - `dashboard--first-run` — unchanged first-run welcome.
- **Lesson-complete XP heading.** Read "+N XP this lesson" while counting only the
  current mount's events, so a lesson finished across two sittings under-reported.
  Now reads "+30 XP just now" beside an itemized list of exactly those two events —
  a number that matches what is on screen.
- **Lesson not-found art.** The not-found branch drew the barred-gate `state-locked`
  plate under "No lesson lives at this address"; it now draws `state-404`. Not a
  manifest state, so it is not in this gallery — the fixing lane screenshotted both
  branches before and after and confirmed they now differ correctly.

## Findings

Zero P1, zero P2, zero new P3. Every other state is byte-comparable to pass 5, whose
review stands. The three pass-4 recapture targets (error toast on frame with its mono
incident code, genuine print-media certificate, clean seeded 12-message tutor history)
remain faithful.

## Verdict

Pass 6 confirms the exit still holds after the fixes: full 92-state matrix, zero
P1/P2. Re-verified alongside it — J1–J3 green (15.8s, zero retries), pytest 90,
ruff/tsc/eslint clean, prod build entry chunk 124 KB gzipped.
