# Crawl pass 9 — the SDXL hero set in place (run qa/crawl-runs/20260807-023430)

First crawl of the **production build** rather than the dev server, for reasons
below. 89 screenshots, 1 harness timeout, **zero P1, zero P2**.

## What changed

All nine heroes — landing, six modules, assessment, graduate — are now SDXL
renders delivered as raster slots, replacing flat SVG plates. Verified in the
browser negotiating AVIF at the correct srcset rung on every module page.

This is the correction of a scope error recorded in the previous commit: the
finished ATV render from the smoke test had never been wired, and the heroes had
been built as vector on the strength of a diffusion failure that applied to
*scenario plates*, not to heroes.

## The finding that changes how the crawl is run

The dev-server crawl failed **four `/assessment` states** with
`net::ERR_INSUFFICIENT_RESOURCES` and screenshot protocol errors. It reproduced
exactly on freshly restarted servers, so it was not flake.

Cause: `import.meta.glob(..., {eager: true})` over the art directories makes the
**dev server** serve every plate as its own module on every page load — 171 SVG
plus 81 raster rungs. Under crawl load that exhausts Chromium's connection
budget. The production build compiles the same globs to a static URL map, so the
identical crawl against `vite preview` was clean.

> A dev-only failure that presents as a product failure is the most expensive
> kind. **Crawl the build, not the dev server** — it tests what ships and it
> removes this whole class. Recorded in `qa/visual_crawl.py`.

I nearly wrote these off as transient after the first run. They reproduced. The
check that separated the two was re-running on clean servers and then against a
different server — not judgement about how the error "looked".

## Remaining failure — verified not a defect

`/learn` · `checkpoint-wrong-answer-feedback` timed out clicking an option on
`m1-l1-s4`. Driven in isolation the step renders correctly with all three
options present and clickable. Harness timing.

## Judged, not just captured

- `hero-assessment` on the dark panel: the valley and visible summit read as
  "effortful but attainable" beside *"Ready when you are"*.
- `hero-m1-mindset` retouched: the malformed hand is gone and the rider reads
  cleanly at the 318 px the module page actually renders.
- Lesson cards deliberately remain vector — see VISUAL_ASSETS §6.6. At 96 px
  three of four SDXL candidates collapsed to the same white-quad-in-forest, and
  the lesson list's whole job is telling 22 lessons apart.

## Verdict

Zero P1/P2 across 89 states. Gates: tsc 0, eslint 0, asset lint
169 real / 169 wired / 0 orphaned / 0 problems, entry chunk 124 kB gz — raster
assets are not bundled, so the JS budget is untouched.
