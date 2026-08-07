# Crawl pass 8 — after the identity set (run qa/crawl-runs/20260806-222719)

**91 screenshots, 1 skipped, zero P1, zero P2.** Best run of the build (pass 7
was 89/3). This pass confirms no regression from the plate-blaze removal, the
reworded SAC caption, and the identity set.

## The one failure was contention, not a defect

`/assessment` · `locked` failed on a login click timeout. Re-run in isolation it
logged in in **0.4 s** and rendered correctly. The crawl performs many sequential
logins against argon2id hashing, which is deliberately slow; some overlap. The
state itself is fine and was captured by hand.

That check matters more than the result: a timeout that *looks* like a product
failure and a timeout that *is* one are indistinguishable from the log. Only
re-running the single state in isolation separates them.

## Verified this pass

- Both hotspot bases no longer carry a decorative clay diamond. Every diamond on
  those plates is now a genuine numbered waypoint, so "8 of 8 explored" agrees
  with what is on screen.
- The `stop-assess-communicate` caption reseeded correctly through the
  content-hash gate after the API restart — confirming the ADR-006 pipeline
  picks up an edit to authored content with no manual step.
- `/assessment` · `locked` re-confirms the refusal recorded in BUILDLOG: a page
  meaning *"you have not started"* must carry no graduation art. The blaze
  checklist is the visual. What an asset **claims** governs, not what it depicts.

## Identity set — judged where it renders

Not in the crawl, because favicons and OG cards do not appear in a page
screenshot. Judged instead at the sizes they actually ship at:

- favicon composited on light, dark, and brand chrome — no corner halo.
- 16 px magnified 8× — the sightline cut survives as a distinct element.
- `icon-192` circle-cropped, simulating Android's mask — mark inside the safe zone.
- `mask-icon` flat-tinted as Safari renders it, checked against the colour
  favicon side by side to confirm one object drawn one way (clause C4).
- `og-default` measured, not eyeballed: 912 → **0** subpixel-fringe pixels.

## Verdict

Zero P1/P2 across 91 states. The three P3s from pass 7 stand unchanged
(`sort-gear-chest` and `sort-cond-cold-hands` at 40 px, scenario mounted riders
at plate scale). Gates: tsc 0, eslint 0, pytest 90, ruff clean, asset lint
169 real / 169 wired / 0 orphaned / 0 problems, entry chunk 124 kB gz.
