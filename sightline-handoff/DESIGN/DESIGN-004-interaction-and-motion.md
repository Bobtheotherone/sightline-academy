# DESIGN-004 — Interaction & Motion (v2)

> **v2 supersedes v1** (2026-08-10, owner directive). v1 treated motion as six
> exceptions in a still product. v2 treats motion as a layer of the product:
> every surface participates in a small, consistent choreography. The register
> is still *quiet competence* — no spectacle, no scrolljacking — but stillness
> is now the exception that needs justifying, not the default.

## Principles

1. **Motion explains hierarchy.** Things enter in reading order; the thing you
   should look at first moves first. Stagger is information.
2. **Physical but calm.** Small distances (8–16px), real easing, momentum-out.
   Spring overshoot exists only in reward ceremonies.
3. **Ambient life on brand surfaces.** Hero and celebration panels breathe
   (contour drift); the current waypoint's blaze breathes. Everything else
   moves only with cause.
4. **Every earned moment gets a ceremony.** XP, badges, levels, module
   completion, the final pass — if the learner earned it, the interface
   acknowledges it once, warmly, ≤700ms.
5. **Transform and opacity only.** No animating layout (width/height/top),
   with the sole exceptions of progress fills and the landing card
   hover-expand, which must not reflow neighbors. Nothing animates on scroll
   position (no parallax beyond ±8px, no scroll-linked timelines).
6. **Reduced motion is absolute.** The global kill-switch zeroes durations AND
   delays; JS-driven motion checks `matchMedia` and jumps to end state.
   Nothing conveys information through motion alone.

## Tokens (see STARTER/design-tokens.css)

- Durations: `micro 100ms` (press) · `fast 150ms` (hover/focus) · `base 240ms`
  (fades, step transitions) · `slow 400ms` (entrances, draws, fills) ·
  `epic 700ms` (ceremonies). Ceiling: 700ms, except the certificate's one
  900ms draw-in. Stagger unit: 60ms.
- Easing: `--ts-ease-out` (entrances/hovers) · `--ts-ease-in-out` (movement,
  draws) · `--ts-ease-spring` (**ceremonies only**: correct-drop settle, badge
  earn, level-up).

## The choreography layer (applies product-wide)

- **Page enter:** the first 4–6 content blocks rise 12px + fade in at `slow`,
  staggered 60ms, once per navigation. Everything past the sixth participant
  renders instantly. Implemented by one shared `Reveal` primitive
  (DESIGN-002), IntersectionObserver-driven for below-fold blocks.
- **Scroll reveal:** below-fold sections run the same rise once at ~20%
  visibility. Never re-hide; never re-run.
- **Route change:** 150ms stage crossfade (manual `document.startViewTransition`
  where available, CSS fallback). Lesson step advance: 240ms crossfade + 8px
  directional slide (forward = rises, back = descends).
- **Hover physics:** interactive cards lift −3px, shadow-1 → shadow-2, and any
  interior art scales 1.03 (400ms) — all together, one gesture. Buttons lift
  −1px; primary/accent buttons add the clay glow shadow. Arrow icons in CTAs
  nudge +3px. Links slide their underline in (150ms).
- **Press:** scale 0.97, 100ms, everywhere tappable.
- **Numbers count.** Any number that appears by being earned or revealed —
  XP chips and totals, stat bands, completion percentages — counts up 600ms
  (ease-out cubic, `tabular-nums`, no width jitter). One shared `CountUp`.
- **Progress draws.** Bars and rings fill from zero (or from previous value)
  at `slow` on reveal. The trail path draws segment-by-segment
  (stroke-dashoffset, 600ms per segment, 120ms stagger) on the course map and
  landing trail; completed segments draw solid, the frontier blaze settles at
  the draw's end, then breathes.
- **Ambient:** contour drift (80s transform loop) on dark hero/celebration
  panels and the landing hero. The ONLY infinite animations are: contour
  drift, the current-waypoint blaze breathe (3s), Ranger's typing dots, and
  skeleton shimmer (1.6s). Nothing else loops.

## Ceremonies (spring easing lives here and nowhere else)

1. **Correct drop / correct answer** — card settles 1.03→1 (spring), blaze
   check draws (150ms stroke), FeedbackStrip rises 8px + fade (base).
2. **Lesson complete** — XP chips pop in sequence (60ms stagger) and count up;
   totals recount.
3. **Module complete / badge earn** — the medal scales 0.85→1 on spring while
   one gradient **shine sweep** crosses it (700ms, once); its blaze-frame check
   draws; XP continues after. No particles, ever — this is the ceremony.
4. **Level-up toast** — slides in on spring, level ring draws closed, emblem
   ticks over at ring close, 5s dwell, top-right (position is a paid-for fix).
5. **Assessment pass** — result banner rises, graduate badge runs ceremony #3,
   `hero-graduate` fades up behind a scrim; question review staggers in after.
6. **Certificate** — the one 900ms moment: sheet fades, seal draws in. Kept.
7. **Section interstitial** — kept (contour drift + title rise, auto-continue,
   skippable). Do not add an entry delay (E2E clicks it inside 2.5s).

## The play layer (§Play)

Lessons carry a game layer built from judgment, never haste — every mechanic
is accuracy-based because the XP law ("never from speed") is also the play
law. All of it derives from existing curriculum payloads; no authored content
is invented and no server contract changes.

1. **Spot mode** (hotspot scenes) — first encounters open the scene unmarked:
   tap where you see a cue; a hit settles a blaze in with the cue's name, a
   miss gets one soft ripple and costs nothing. "Reveal the rest" is always
   one tap away; keyboard riders aim a crosshair with the arrows. Review (the
   classic marked renderer) follows, and completion still means reading every
   waypoint. Resume/revisit skips the hunt. Spotting all cues unaided earns
   the clean-run moment — the hazards scene's own acceptance criterion
   ("name the cues without the markers on") made playable.
2. **Sharp streak** — a lesson-scoped chain of consecutive first-try
   successes (checkpoint answered right first try, sort card placed clean,
   pair matched clean, cue spotted unaided). Mini-blaze chain beside the
   footer's step counter; milestones at 3/5/8 settle in clay. A miss resets
   quietly — no shame UI. Hunt misses are scanning, not answers: they never
   break the chain.
3. **Clean run** — an activity finished with zero misses this session earns a
   badge-gold banner with the badge tier's single shine sweep. Session-local:
   resuming a half-done activity can never claim a run it can't prove.
4. **Field practice — "The range"** (`/games`, SPEC-010) — every unlocked
   module's challenges, replayable outside the lesson flow. Three game kinds,
   all assembled from the module's own authored payloads:
   - *Sharp round* — the module's checkpoint questions re-dealt as a one-shot
     round (up to 5). No clock, no retries; the rail blazes each sharp answer
     and a miss gets its own ✕ mark (never the padlock — lock means locked).
     The authored feedback shows after every pick; a perfect round earns the
     clean-run ceremony.
   - *Walkaround order* — rebuild T-CLOC from memory, tap by tap, from the
     walkaround lab's own zone data. Wrong tap shakes and costs a miss; zero
     misses earns the ceremony.
   - *Replays* — hunt/sort/match/branching steps re-run through the real
     renderers with no evidence in and a no-op sink out, labeled honestly:
     "pure play, nothing is recorded."
   Range rules: locked modules stay locked ("the range only drills what
   you've ridden"); personal bests live in localStorage only
   (`ts-practice:{userId}:{gameId}` — higher score wins, clean breaks ties);
   nothing is sent to the server and lesson evidence is never touched. Nav
   entry "Practice" is desktop-only — the mobile tab bar keeps its four
   designed stops; module pages carry the "Field practice" link instead.

## Micro-interaction defaults

- Focus-visible: 2px pine-300 ring at 2px offset (`--ts-focus-ring` double
  shadow), everywhere, no exceptions.
- Feedback: wrong answer = ±4px shake 300ms (kept). Toasts slide from right at
  `base`, exit by fade. Tooltips/popovers fade + 4px rise at `fast` — nothing
  appears instantly.
- Chat: typing = three-dot pulse; streamed tokens append plainly (**no
  typewriter effect** — kept); each settled message rises 8px once.
- Skeletons: shimmer 1.6s; appear after 150ms; reserve real height (the CLS
  fix stands); content replaces them with a 240ms crossfade.
- Sticky chrome: header/footer gain shadow-2 + translucency + blur once
  `scrollY > 0` (150ms).
- Any action >400ms shows a local pending state; never a global overlay.
  Optimistic UI on evidence writes, rollback via error toast (kept).

## Performance & verification rules

- Transform/opacity only; `will-change` only on the two ambient layers; no
  animation may cause layout shift (CLS budget stands at ≈0).
- Zero animation libraries. The system is CSS + the shared primitives
  (`Reveal`, `CountUp`, existing keyframes). Keyframes live in the stylesheet,
  not in per-component `<style>` tags.
- **The visual crawl must emulate reduced motion** (`reduced_motion="reduce"`
  at Playwright context creation) so every screenshot captures settled end
  states — full-page capture never scrolls, so IO reveals would otherwise ship
  as opacity-0 in the gallery. Motion itself is verified by a human pass over
  the ceremony list above, once per release.

## Sound: none. (Unchanged, deliberate.)
