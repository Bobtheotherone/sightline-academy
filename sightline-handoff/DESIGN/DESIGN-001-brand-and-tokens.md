# DESIGN-001 — Brand Direction & Tokens (v2)

> **v2 supersedes v1** (2026-08-10, owner directive). v1 is preserved in git
> history. What carries over from v1, deliberately: the brand hues (the shipped
> 250-asset art library embeds them), the two signature devices, the type faces,
> the illustration style law, and ADR-008's hex-free rule. Everything about
> surfaces, depth, scale, and composition is new. The machine-readable token
> sheet is `STARTER/design-tokens.css` (v2) — import it verbatim.

## Direction: "Living Field Guide"

v1 aimed for a printed field guide: flat plates, hairlines, stillness. v2 keeps
the field-guide *world* — contour lines, trail blazes, dusk-forest color, ink
diagrams — and gives it the presentation of a top-tier modern product: **depth,
light, and motion**. The reference feeling is a premium outdoor-tech brand, not
a printed page: layered surfaces that cast soft forest-tinted shadows, dark
panels with atmosphere and glow, art that bleeds across boundaries, numbers
that count, paths that draw themselves, and a page that acknowledges you
arrived. Calm is still the personality — the product teaches judgment, and the
motion vocabulary is *quiet competence*, never spectacle.

Explicitly still forbidden: SaaS-dashboard genericism, kids'-app bounce, the
stock AI looks (warm-cream + serif + terracotta; black + acid accent;
broadsheet hairlines), and — new in v2 — **wireframe flatness**: a screen where
every element sits at the same visual depth is a defect, not a style.

**The signature devices, promoted:**
- **Contour motif** — topographic lines, now at 8% ink on light surfaces (11%
  on hero bands), 7% paper on dark. On hero and celebration panels the contour
  layer **drifts** (80s transform loop — ambient, near-subliminal). It may be
  gradient-masked so it concentrates around focal areas.
- **Trail-blaze marker** — the rounded diamond stays the only rotated-square
  element in the product, and becomes the motion mascot: it draws its check
  when things complete, settles when things land, and breathes (3s pulse) at
  the learner's current waypoint.

Spend boldness on: the two devices, the dark atmospheric panels, the reward
ceremonies, and display typography. Keep everything else disciplined.

## Palette

Core hues are UNCHANGED from v1 (`pine-950/700/300`, `moss-100`, `paper-0`,
`clay-500`, `sky-600`, `sun-400`, `danger-600`, `ink-500`, `line-200`) — see
the token sheet for values. v2 adds a working ramp around them:

| New token | Role |
| --- | --- |
| `--ts-pine-800` | Dark-panel gradient mid-stop; hover state on pine-700 |
| `--ts-pine-500` | Vivid mid — progress fills, gradient highlights |
| `--ts-pine-100` | Brand tint — selected states, quiet chips |
| `--ts-moss-50` | Ground-wash top stop; the page breathes lighter at the top |
| `--ts-paper-50` | Raised surface (near-white, still warm — **pure #fff stays banned**) |
| `--ts-clay-600` / `--ts-clay-100` | Clay hover / clay tint grounds (XP, accent washes) |
| `--ts-sun-100`, `--ts-sky-100`, `--ts-danger-100` | Semantic tints for chips, callout grounds, badge glow |

**Layered color replaces flat color.** The app ground is a top-to-bottom
`moss-50 → moss-100` wash (`--ts-ground`), never a flat fill. Dark panels use
`--ts-grad-panel` (a 160° pine gradient), optionally with one `--ts-glow-clay`
or `--ts-glow-sun` radial placed behind the focal art or badge. Text over
photography-free art uses `--ts-grad-scrim` so type always sits on ≥4.5:1
ground.

Accent discipline (kept, loosened one notch): clay marks the primary action and
the focal moment. One clay *focal* per view; clay tints (`clay-100`) may
additionally ground XP/reward chips without counting against the focal budget.

Contrast law (unchanged): pre-checked pairs only; never clay-500 body text on
moss; every scrim-over-art pairing must re-check 4.5:1 at the darkest text
position.

Dark mode: still out of scope for v2 implementation. The token layer now makes
it cheap later — nothing may hardcode around the tokens.

## Typography

Faces unchanged: **Bricolage Grotesque** (display, 700/800), **Inter** (body,
400/500/600), **JetBrains Mono** (data, 500). What changes is *contrast and
scale*:

- Display sizes go fluid: `--ts-text-3xl` = clamp 36→44 (page heroes),
  `--ts-text-4xl` = clamp 44→68 (landing display). Tracking `-0.02em` at 2xl+.
- **Numbers are a feature.** XP totals, stat bands, percentages, verification
  codes render in mono at display sizes with `tabular-nums`, and they count up
  on reveal (DESIGN-004). A big mono numeral is v2's third identity device.
- Eyebrow style kept exactly (12px caps, +0.08em, ink-500) — it works.
- Body measure: 65ch max. Lead paragraphs 19px. Line-heights 1.5 body / 1.1
  display.

## Space, depth, composition

- 4px grid; gutters 24/48; containers: 1120px app, **1280px landing bands**,
  760px lesson stage (reading measure is sacred).
- Radii: 10 controls / 16 cards / 24 panels / **32 full-bleed heroes** / pill
  chips.
- **Elevation is real in v2.** Three tinted shadow levels (`--ts-shadow-1/2/3`,
  forest-tinted, layered — never neutral gray) plus a clay glow for primary-CTA
  hover. Resting interactive cards sit at shadow-1 on the ground wash; hover
  lifts to shadow-2; overlays own shadow-3. Hairline borders remain on inputs,
  tables, and dividers — they're a detail layer now, not the entire depth
  system. Sticky chrome (header, lesson footer) is translucent paper
  (`rgb(paper / 0.86)`) with `backdrop-filter: blur(12px)` and gains shadow-2
  once scrolled.
- **Overlap is encouraged.** Art bleeds out of panels; cards overlap section
  seams (negative margin pulls); the hero art may break its container edge.
  Boxed-and-bordered is no longer the default way art appears — full-bleed
  crops behind scrims and cutout bleeds are.
- **No hollow bands.** Any full-width band must compose to its edges at 1440px:
  a header band is title + meta cluster + action, not a lonely h1. If a band
  has >40% dead width at desktop, it fails DESIGN-006.

## Illustration & iconography (unchanged law, new framing)

The art style law carries over verbatim from v1 — flat vector, 4–6 brand
colors, 1.5px pine-950 linework, paper-0 plate grounds, no photography, alt
text describing teaching content. `VISUAL_ASSETS.md` remains the generation
authority and its acceptance rubric (including the safety clauses SF1–SF6)
stays binding. What changes is **presentation**: plates may be cropped,
scrimmed, glowed behind, and layered under type; the "boxed plate on a panel"
composition is retired outside diagram contexts (hotspot bases and keylist
figures keep their exact framed geometry — coordinate contracts are untouchable).

Icons: Lucide, 1.5px, 16/20/24 — unchanged.

## Voice in UI copy

Unchanged from v1 (active verbs, sentence case, no exclamation inflation).
Existing shipped copy strings are retained — v2 changes how words are staged,
not the words.
