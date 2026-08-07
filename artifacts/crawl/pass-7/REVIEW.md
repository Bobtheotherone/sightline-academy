# Crawl pass 7 review — the asset program in place (run qa/crawl-runs/20260806-215616)

89 screenshots, 3 transient navigation failures (dev-server races, not product
defects). This is the first crawl taken with the full asset program wired:
**172 slots, 169 real, 169 wired, 0 orphaned, 0 lint problems.**

The manifest went from 27 slots to 172. SPEC-007's `figure` block went from
**used zero times across 18 content steps** to carrying teaching weight in 13.

## What changed on screen

| Surface | Before | Now |
| --- | --- | --- |
| Content steps | Prose + keylist only | 13 steps carry a structural diagram with a caption that adds what the plate cannot say |
| Sort activities | Text cards | Icons leading each card, with the category colour rule doing teaching work |
| Match activities | Text columns | Icons on the term column |
| Hotspot panels | Text only | A detail inset per waypoint, drawn as a zoom of the same machine |
| StepRail | Section labels | Section glyphs tinted by state via `currentColor` |
| Activity headers | Title only | Renderer-type glyph in a tile |
| Tutor source chips | Title + module | Leading topic mark derived from the chunk-id prefix |
| Lesson rows | Text | Card thumbnail, greyed when locked |
| /progress | Ring + number | Level emblem beside the ring; XP marks giving each feed row a distinct silhouette |
| /journal | Text cards | Artifact covers laid on the ruled page |
| Branching scenarios | Text field report | One plate per narrative beat, swapping on the decision change |
| Instructor 403 | `state-locked` | `state-403` — a warden barrier beside your own open trail, not a gate across it |

## Findings

**Zero P1. Zero P2.** Spot findings carried forward as P3:

- `sort-gear-chest` reads as a beehive at 40 px (lane self-flagged).
- `sort-cond-cold-hands` compresses to a red mass at 40 px; the category signal
  survives, the specific object does not (lane self-flagged, reworked twice).
- Scenario mounted riders are ~30 px at plate scale, so the figure redraw is
  real work with low visible return in situ. Recorded, not iterated further.

## The methodological finding of this pass

**I judged the scenario water too harshly in a gallery.** At 620 px in a review
sheet the creek read as dominating; at its real ~510 px render inside the
field-report card it reads as restrained and the eye lands on the riders, which
is what the fix intended. My gallery critique was taken at a size the asset
never renders at.

> A gallery answers "is this a good drawing". Only the crawl answers "is this
> the right drawing, at the right size, in the right place". They disagree, and
> when they do, **the crawl wins**.

This is the same reason [§10.4](../../VISUAL_ASSETS.md)'s asset lint is
explicitly documented as necessary-but-not-sufficient: it proves a slot is
*referenced*, never that it *renders*.

## Verdict

The asset program is in place and judged in place. Zero P1/P2 across the wired
matrix; three P3s recorded with reasons. Gates green throughout: tsc 0,
eslint 0, pytest 90, ruff clean, entry chunk unchanged at 124 kB gz against
the 350 kB R9.2 budget.
