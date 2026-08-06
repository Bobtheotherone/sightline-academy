# Crawl pass 4 review — Wave 3 full-matrix pass (run qa/crawl-runs/20260806-073124)

92 screenshots, 0 skips — the first pass in which the FULL route×state matrix of
qa/route-manifest.json was actually reached: every deep state QA-001 §crawl
items 3/5 names is now driven (login rate-limited via 9 spoofed-IP failures,
register validation + duplicate-email, scripted assessment attempts from the
authored answer key, wrong-answer feedback frames, prediction locked+reveal,
section interstitial mid-dwell, lesson-complete, typing bubble, loading
skeletons, error toast, offline banner, focus-visible tab-throughs, real
/verify code). Every PNG was opened and reviewed against DESIGN-006.

An earlier same-day run (20260806-071814, 88 shots / 4 fails) was a harness
shakedown: the forward-only step walk destructively answered activities while
hunting a step BEHIND the frontier (content steps auto-acknowledge on mount,
so fresh@'s frontier moves on first paint). Fixed by teaching `reach_step` to
revisit completed steps through the StepRail (R2.5) before falling back to the
frontier walk. That run's gallery is superseded and was not reviewed further.

## Findings

### P1 — capture integrity (harness, not product)
- tutor conversation shots (desktop set): a stray 7th exchange appears at the
  bottom of mid@'s seeded 12-message history — the mobile typing-bubble
  cleanup called `unroute()` BEFORE reloading, which released the held
  /tutor/ask/stream request to the server and persisted a real turn. The
  seeded fixture state QA-001 specifies was therefore not what desktop shot.
  FIXED in qa/visual_crawl.py (reload first, then unroute). Requires a clean
  recapture → pass 5.

### P2 — states not faithfully captured (harness)
- dashboard--error-toast: toast absent from the frame — the drive pressed
  Escape to close the user-menu popover, but Escape dismissed the focused
  Radix toast instead; shot shows the open menu and no toast. FIXED (outside
  click on the greeting h1 instead of Escape).
- certificate--print-preview: byte-identical to certificate--issued; no print
  emulation existed, so the manifest state was never actually captured (also
  true in passes 1–3). FIXED (page.emulate_media(media="print") + reset).
- root--scrolled-modules: the crop mostly shows the hero; scroll_into_view
  left the trail heading at the viewport bottom. FIXED (scrollIntoView
  block:start for both scrolled states).
- course-moduleid state/param drift vs fixture reality: "not-started" pointed
  at m3 (43% for mid) and "partial" at m2 (100% for mid) — shots captured
  real, coherent states under the wrong names. Manifest remapped:
  not-started→fresh/m1 (true 0%), partial→mid/m3, complete-badge→mid/m2
  (badge + artifact card showcase).

### P3 — product polish (all fixed this pass, component-first)
- Course map (mid): module 6's "60 min" wrapped into two lines when the long
  unlock hint crowded the meta row → ModuleCard duration span made
  shrink-0/nowrap (fix propagates to landing + course map).
- Dashboard journal peek (grad): meta wrapped leaving a lone "Jul 30" on the
  next ruled line → "updated <date>" now wraps as one unit.
- Lesson revisit chip said "Answered — changes are saved" on content/briefing
  steps where nothing is answered → content steps now read "Read — revisit
  freely" (ActivityHost, propagates to every content step).
- structured_response revisit showed "1 of 3 points touched" beside a cleared
  checkpoint — drafting telemetry reading like a failing grade on a complete
  response → after submission the criteria render as a neutral reference list
  (counter hidden, chips un-graded); coaching behavior while drafting is
  unchanged (SPEC-007 criteria remain a nudge, never a gate).
- Course summit card "…80% to earn it." orphaned "it." → text-balance.

### Noted, no change (with reasons)
- Instructor "Certificates issued: 0" while grad@ holds a certificate: correct
  — the crawl env lists grad@ in INSTRUCTOR_EMAILS, so its account is
  role=instructor and SPEC-011's learner-only aggregates rightly exclude it.
- Tutor offline badge on every tutor shot: the crawl API runs with no
  ANTHROPIC_API_KEY (provider=extractive), so the badge is honest everywhere;
  the offline-mode-header state is genuinely covered.
- Auth right-panel quote identical in every shot: RotatingQuote cycles every
  8s; stills always land inside the first interval. Verified in code.
- DESIGN-005 names "three tiles" for the dashboard skeleton; the skeleton
  mirrors the real four-tile layout, which is the same table's stated
  principle ("skeletons mirroring real layout"). Layout wins.
- Fixed bottom tab bar / sticky lesson footer paint mid-image in tall mobile /
  lesson full-page captures — Playwright full-page stitching artifact, not a
  runtime defect (bars sit at the viewport edge live; content carries pb-16).
- progress--early shows 60 XP / m1 partially complete for fresh@: the crawl's
  own earlier lesson driving, honest mid-session state (fresh@'s true
  first-run surfaces — dashboard/journal/tutor — shoot before any lesson
  drive, and mobile runs before desktop for the same reason).
- Certificate issue date renders the fixture backdate (Jul 30) — fixture
  behavior, carried from pass-3.

## Verdict
Product-level: zero P1, zero P2, six P3s — all six swept into the component
system this pass. Harness-level: four capture-integrity defects found and
fixed. Because three manifest states (error-toast, print-preview, clean
12-message tutor history) were not faithfully on film, pass 4 cannot be the
exit pass — pass 5 re-runs the full matrix against rebuilt fixtures.
