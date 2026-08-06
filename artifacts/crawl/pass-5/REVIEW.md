# Crawl pass 5 review — Wave 3 full-matrix recapture (run qa/crawl-runs/20260806-075623)

92 screenshots, 0 skips, 0 harness fails. This pass exists because pass 4 found
three manifest states that were not faithfully on film (error-toast eaten by an
Escape press, print-preview byte-identical to issued, a stray 7th tutor exchange
persisted by an unroute-before-reload). All three harness defects were fixed in
pass 4; this run recaptured the full route×state matrix against rebuilt
fixtures. Every PNG was opened and reviewed against DESIGN-006, with the three
recaptured states inspected first.

## The three pass-4 recapture targets — verified faithful

- dashboard--error-toast (desktop): the toast is on frame — "Something broke on
  our side. / Your progress up to now is saved." with mono incident code
  `SLA-2481`, left rule accent, correct tokens. User menu closed (the outside
  click fix worked); the greeting, continue card, and all four tiles render
  normally beneath it.
- certificate--print-preview (desktop): now a genuine `media: print` capture —
  78 KB vs 115 KB for issued, different layout: app chrome gone, certificate
  card alone on the page with seal, mono verification code, and the
  honest-scope fine print. Distinct from certificate--issued in both bytes and
  content.
- tutor conversation shots (desktop + mobile): exactly the seeded 12-message
  history QA-001 specifies — six exchanges: T-CLOC ("From the course", Module 2
  chip), tire PSI ("From the course", Module 2 chip), SxS vs ATV ("Ranger's
  general knowledge", two source chips), drivers' perspective ("Course +
  Ranger's knowledge", Module 6 + corpus chip), wheelie request ("Not something
  I coach" triage decline), and the practice follow-up ("Ranger's general
  knowledge"). No stray 7th exchange. Offline badge in header, suggestion
  chips and 0/2000 mono counter at rest.

## Findings

### P1 — none.

### P2 — none.

### P3 — none new. Nothing risen to a change this pass.

## Noted, no change (carried or newly examined, with reasons)

- The five tutor conversation-state files per viewport
  (grounding-curriculum/mixed/general, triage-decline, offline-mode-header)
  are byte-identical by MD5. Expected: all five manifest states name
  exchanges within the same seeded 12-message history, and the full-page
  capture contains every one of them plus the offline header badge, which the
  review verified individually. One faithful capture serves five states.
- Grad dashboard journal peek wraps "Complete ·" / "updated Jul 30" with the
  separator dot ending the first ruled line. This is the pass-4 fix rendering
  as designed ("updated <date>" kept as one unit); a line-end separator is
  typographically standard, and moving the dot into the wrapping unit would
  just orphan it at the start of line 2 instead. Accepted.
- Fixed bottom tab bar / sticky lesson footer / sticky app header paint
  mid-image in tall full-page captures (mobile sets, journal-builder,
  stability-explorer, account delete-confirm-modal). Playwright full-page
  stitching artifact, not a runtime defect — bars sit at the viewport edge
  live; content carries the compensating padding. Carried from pass 4.
- Tutor offline badge on every tutor shot: crawl API runs with no
  ANTHROPIC_API_KEY (provider=extractive); the badge is honest everywhere and
  offline-mode-header is genuinely covered. Carried from pass 4.
- progress--early shows 60 XP / Module 1 at 70% for fresh@: the crawl's own
  earlier lesson driving — honest mid-session state; fresh@'s true first-run
  surfaces (dashboard/journal/tutor first-run shots) shoot before any lesson
  drive. Carried from pass 4.
- Instructor "Certificates issued: 0" while grad@ holds a certificate:
  correct — grad@ is in INSTRUCTOR_EMAILS, role=instructor, and SPEC-011's
  learner-only aggregates rightly exclude it. Carried from pass 4.
- Auth right-panel quote identical across auth shots: RotatingQuote cycles
  every 8s; stills land inside the first interval. Verified in code, pass 4.
- Certificate issue date renders the fixture backdate (Jul 30) — fixture
  behavior, carried from pass 3.

## DESIGN-006 gallery-level check (once per crawl)

One product, one voice, one palette across all 92 frames: contour motif and
blaze markers on every shell; Bricolage display type in every screen's
hierarchy; mono face on numbers/codes/counters (XP, `1F1AM5KCHM`, 0/2000,
"8 of 8 explored"); Lucide-consistent icons; no default browser UI in any
form control (styled selects, custom focus rings on both focus-visible
shots); no placeholder text, no slot labels, no undefined/NaN leaks; empty/
loading/error variants match DESIGN-005 (ruled-paper journal empty state,
skeletons mirroring real layout on all three skeleton shots, designed
403/404, offline banner + reconnect copy, rate-limit voice). The two
showcase surfaces showcase: the course map trail (both fixtures) and the two
labs (walkaround top-down, stability explorer dual-view) are the strongest
frames in the gallery. Mobile 375px holds the bar: no horizontal scroll, no
crushed layouts, tab bar correct, module-card meta rows intact (pass-4 P3
fixes verified propagated on mobile).

## Verdict

Zero P1, zero P2, zero new P3. Pass 5 is the second consecutive
product-clean full pass (pass 4 was product-clean but capture-dirty), the
full matrix is faithfully on film, and QA-001's wave-3 exit bar — one FULL
pass with zero P1 and zero P2, two-pass minimum — is met. Pass 5 is the exit
pass, contingent on the §Traversal audit below.

## Appendix — Traversal audit (QA-001 §Traversal)

Run 2026-08-06 against the live dev stack (API :8000, FIXTURES=1 rebuild —
"fixtures: fresh/mid/grad rebuilt (mid 340 XP, grad 1990 XP)"; vite :5173),
driven by a throwaway Playwright script (scratchpad, not a repo test — QA-003).
Three sessions: logged-out (public shell), mid@crawl.test, grad@crawl.test.
Every manifest route visited; every internal link on every visited page
enumerated and followed to its destination; console + pageerror watched
throughout. 90 page visits, ~120 unique link-destination checks.

### Checklist

- [x] Public shell (logged out): `/`, `/login`, `/register`,
      `/verify/1F1AM5KCHM` (valid), `/verify/AAAAAAAAAA` (designed invalid
      state) — every header/footer link (`/`, `/login`, `/register`) followed;
      landing footer "Create a free account" / "Log in" land correctly.
- [x] Nav items (Course / Journal / Progress / Ranger + logo → dashboard):
      followed from every app page, both fixtures — all land correctly.
- [x] User menu (avatar popover), both fixtures: opens; contains Account and
      Log out; Account link verified.
- [x] Ask Ranger header CTA → `/tutor` (both fixtures).
- [x] Dashboard cards, mid@: continue card →
      `/learn/m3-l2-head-to-toe?step=m3-l2-s1`, trail tile → `/course`,
      journal peek → `/journal/gear_card`, Recent XP "See all" → `/progress`.
- [x] Dashboard cards, grad@: graduate card → `/certificate`, capstone card →
      `/journal/ride_plan`, all tiles verified.
- [x] Course map cards, mid@: m1/m2/m3 module pages open; locked m4–m6 render
      as cards without dead links; `/course/m6-roads-rules-people` direct
      visit → designed locked page with "Go to Gear Up" →
      `/course/m3-gear-up` (correct unlock target).
- [x] Course map cards, grad@: all six module pages + summit card →
      `/assessment` open.
- [x] Module pages → every lesson row: all 22 lesson pages opened across the
      two fixtures (m1-l1 … m6-l4) — none dead, correct module back-links.
- [x] Module artifact cards → journal artifact pages
      (risk_profile / inspection_log / gear_card / hazard_brief /
      readiness_plan / ride_plan): all open.
- [x] Journal index cards, both fixtures: mid 3 artifacts, grad 6 artifacts —
      every card opens; every "Edit in the lesson" deep link
      (`/learn/…?step=…&edit=1`) lands on the right lesson step.
- [x] Assessment page: mid (locked) → "Continue Module 3 · Gear Up" →
      `/course/m3-gear-up`, "Back to the course map" → `/course`; grad →
      "View your certificate" → `/certificate`.
- [x] Certificate page (grad): "Public verification page" →
      `/verify/1F1AM5KCHM` (renders "This certificate is genuine").
- [x] Tutor source chips (mid@'s seeded history): chip click navigates to
      `/course/m2-know-your-machine` — correct destination, no 404.
- [x] Tutor suggestion chips (grad@, empty history): chip click sends the
      question; extractive answer with grounding label renders; no errors.
- [x] Account page: "Export my data" (`/api/auth/export`) → HTTP 200 (both
      fixtures).
- [x] Instructor page: grad@ (role=instructor) sees dashboard; "Export CSV"
      (`/api/instructor/export.csv`) → HTTP 200; mid@ → designed 403 with
      "Back to your dashboard".
- [x] `/definitely-not-a-trail` → designed 404 with "Back to your dashboard".
- [x] Console/pageerror watch across all 90 visits: **zero uncaught JS
      errors, zero pageerrors.**

### Findings

- Dead links: **0**. Wrong destinations: **0**. JS/console errors thrown by
  the app: **0**.
- Five browser network-log entries ("Failed to load resource") were examined
  and classified as designed status probes, not defects: GET `/api/auth/me`
  → 401 on signed-out page boots (SPEC-005 session probe — the SPA renders
  the public shell from it), and GET `/api/certificate` → 404 for a
  non-graduate (renders the designed "frame is waiting" state the crawl
  shot). Chromium logs any non-2xx response regardless of JS handling; these
  are unsuppressable client-side and are the same handled probes every prior
  pass ran on.

### Traversal verdict

PASS — no P1s. Combined with the zero-P1/zero-P2 screenshot review above,
pass 5 is the wave-3 exit pass.
