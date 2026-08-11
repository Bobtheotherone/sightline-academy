# DESIGN-002 — Component Inventory (v2)

> **v2 supersedes v1** (2026-08-10, owner directive). Component NAMES are
> retained — the codebase implements them and crawl reviews reference them.
> What changes is each component's treatment (depth, motion, density) plus
> four new primitives the v2 system needs. Radix primitives noted where used.

## New in v2 (build these first — everything else consumes them)

- **Reveal** — the entrance/scroll-reveal primitive (DESIGN-004): rise 12px +
  fade at `slow`, 60ms sibling stagger via index prop, IntersectionObserver
  below the fold, fires once, renders instantly under reduced motion (JS
  matchMedia check, not CSS-only). Transform/opacity only.
- **CountUp** — mono `tabular-nums` number that counts to value over 600ms on
  reveal (generalizes XpChip's rAF logic; XpChip becomes a consumer).
- **StatStrip** — row of mono stat items (value + label), used on landing hero,
  course header, assessment intro, instructor tiles. Values use CountUp.
- **AppFooter** — two variants: `marketing` (pine-950 contour ground, display
  wordmark, four link columns, blaze divider, mono fine print) and `app`
  (one-line: hairline top, small wordmark, mono fine print, verify link).
  Every page ends with one of them.

## Foundation (retained names, v2 treatments)

- **Button** — variants kept (primary pine / secondary outline / ghost /
  danger / accent clay). v2: hover lifts −1px; primary + accent gain
  `--ts-shadow-glow-clay` on hover; press 0.97; arrow icons nudge +3px on
  hover; loading spinner kept. Focus ring per token.
- **Input / Textarea / PasswordInput** — kept; focus border animates at
  `fast`; error shake (±4px, once) on submit-with-error.
- **SelectChips** — pill radius, selected = pine-100 tint + blaze dot,
  settle on select.
- **Card** — v2 surface: paper-50, radius-md, **shadow-1 resting** on the
  ground wash (hairline optional, no longer the sole depth cue); `interactive`
  = hover lift −3px + shadow-2 + interior art zoom 1.03. Internal layout is
  always composed: media / body / action rows, actions pinned to a shared
  baseline in grids.
- **CalloutCard** — kept (3px semantic bar, icon, title, md body) + tinted
  ground per semantic (`sky-100`/`sun-100`/`danger-100`/`pine-100` at low mix).
- **BlazeMarker** — states kept (todo/active/done/locked). v2: `done` draws its
  check on first render in a completed context; `active` breathes (3s);
  `current` prop for the breathing waypoint.
- **ContourPanel** — variants kept (light/dark). v2: dark uses
  `--ts-grad-panel`; optional `drift` prop mounts the animated contour layer;
  optional `glow` prop places one radial glow behind a named child.
- **ProgressRing / ProgressBar** — kept; v2: fill/draw from previous value on
  reveal (never pre-filled on first paint); bar gains optional mono CountUp
  label pairing.
- **Toast** (Radix) — kept, top-right. v2: enters on spring for `levelUp`
  (ring draw + emblem tick), `base` slide for the rest.
- **Modal / SlideOver** (Radix Dialog) — kept; shadow-3; scale 0.96→1 + fade
  at `base`; SlideOver slide kept at `slow`.
- **Tabs / Popover / Tooltip** (Radix) — kept; ALL get fade + 4px rise at
  `fast` (nothing appears instantly).
- **EmptyState** — kept structure (art slot + heading + one-line + action);
  v2: art rises first, text staggers after.
- **Skeleton** — kept (layout-shaped, 150ms delay, height-reserving);
  content swap = 240ms crossfade.
- **AppShell / PublicShell** — sticky translucent header (blur 12px, shadow-2
  when scrolled), active-nav pill tint, AppFooter mounted on every route,
  bottom tab bar kept on mobile.

## Learning (retained names, v2 treatments)

- **ModuleCard** — hero art kept; v2: shadow-1 + hover lift/zoom; locked =
  grayscale + scrim (kept); current = clay edge glow + breathing blaze;
  `expandOnHover` variant for the landing trail (summary unfolds 240ms, must
  not reflow neighbors).
- **LessonRow** — becomes an elevated card row; order blaze draws when
  complete; hover lift.
- **StepRail** — kept geometry; v2: section spine is a progress line that
  draws as steps complete; current blaze breathes.
- **SectionInterstitial** — kept exactly (drift + title rise, auto-continue,
  skippable, no entry delay).
- **ActivityHost** + per-renderer components — kept; ceremonies per
  DESIGN-004 (settle/shake/check-draw retained; StabilityScene groups gain a
  150ms transform tween so the machine leans, not snaps).
- **FeedbackStrip** — kept (rise 8px + fade).
- **KnowledgeOption** — states kept; selected draws a blaze check; `best`
  reveal keeps the unmask wipe.
- **XpChip** — kept look; count-up now via CountUp; pop-in on spring within
  ceremonies only.
- **BadgeMedal** — earned/unearned kept; v2 adds the earn ceremony (spring
  scale + one shine sweep, DESIGN-004 §Ceremonies) triggered only at earn
  time.
- **CertificateLayout** — kept (print-grade, 900ms reveal).

## Journal / Tutor (retained)

- **JournalCard** — ruled texture kept; + shadow-1, hover lift, reveal stagger.
- **ArtifactPreview** — kept, on an elevated sheet.
- **ChatMessage / GroundingLabel / SourceChip / SuggestionButtons /
  TutorComposer** — all kept as specced in v1 (they are product signatures);
  v2 adds: message rise-once on entry, suggestion chips as pill buttons with
  hover lift, composer sticky-translucent. No typewriter effect (law).

## Illustration slots (UNCHANGED — binding)

The assetSlot registry is untouched by v2; `web/src/assets/manifest.json`
remains the runtime source of truth and `VISUAL_ASSETS.md` the generation
authority: `hero-landing`, `hero-m1-mindset` … `hero-m6-roads`,
`hero-assessment`, `hero-graduate`, `scene-atv-anatomy` (hotspot base —
coordinate contract absolute), `scene-walkaround-top` (lab-owned),
`scene-helmet-fit`, `scene-trail-hazards` (hotspot base), `scene-crossing`,
`scene-loading-cargo`, `badge-*` (9), `empty-journal`, `empty-tutor`,
`state-404`, `state-403`, `state-locked`, `cert-seal`, plus the shipped
sort/match/lesson-card/level icon families. v2 changes how slots are STAGED
(bleeds, scrims, glows — DESIGN-001/003), never their content or contracts.
