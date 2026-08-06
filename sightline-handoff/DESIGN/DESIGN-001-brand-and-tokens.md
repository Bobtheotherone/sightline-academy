# DESIGN-001 — Brand Direction & Tokens

The machine-readable token sheet is `STARTER/design-tokens.css` — import it
verbatim and expose the variables through Tailwind's theme. This document is the
*why* and the usage law.

## Direction: "Field Guide Modern"

Sightline Safety Academy looks like a beautifully produced modern field guide crossed with a
topographic map — NOT like a SaaS dashboard, NOT like a kids' app, NOT like the
three stock AI looks (warm-cream + serif + terracotta; black + acid accent;
broadsheet hairlines). The subject's own world supplies the identity: contour
lines, trail blazes, waypoint markers, ink-on-paper diagram energy, dusk-forest
color.

**The signature element:** the **contour motif** — fine topographic contour
lines (SVG, 1px, ~6% opacity ink) used as section backgrounds and inside hero
panels, plus the **trail-blaze marker**: a rounded-diamond blaze used as the
bullet/check/waypoint glyph across the product (list markers, step dots,
progress rail, map pins). These two devices, used consistently and quietly, are
what make every page unmistakably Sightline Safety Academy. Spend the boldness here; keep
everything else disciplined.

## Palette (tokens; full values in the CSS)

| Token | Hex | Role |
| --- | --- | --- |
| `--ts-pine-950` | #0E2A23 | Deep forest ink — primary text on light, dark surfaces |
| `--ts-pine-700` | #1F5546 | Primary brand — buttons, active states, links |
| `--ts-pine-300` | #9CC3B4 | Soft brand — rings, subtle fills |
| `--ts-moss-100` | #EEF3EC | App background (light, slightly green-warm — not cream) |
| `--ts-paper-0` | #FBFCFA | Card/surface |
| `--ts-clay-500` | #C4622D | Accent — XP, highlights, blaze marker fill. Used sparingly |
| `--ts-sky-600` | #2E6E8E | Info/water — tutor identity color, info callouts |
| `--ts-sun-400` | #E0A72E | Caution semantic + badge gold |
| `--ts-danger-600` | #A93226 | Risk semantic (scenario feedback, destructive) |
| `--ts-ink-500` | #4A5A54 | Secondary text |
| `--ts-line-200` | #D8E0DA | Hairlines/borders |

Contrast law: body text pairs are pre-checked (pine-950 on moss-100/paper-0;
paper-0 on pine-700/sky-600/danger-600 ≥ 4.5:1). Never place clay-500 text on
moss-100 for body copy (accent is for chips/fills/icons/large numerals only).

Dark mode: **out of scope** (one polished light theme beats two mediocre ones).

## Typography

- **Display: Bricolage Grotesque** (700/800; use `wdth`/optical sizes where
  available) — headlines, module titles, big numerals. Characterful, outdoorsy
  without being rustic-kitsch.
- **Body: Inter** (400/500/600) — everything readable.
- **Data/mono: JetBrains Mono** (500) — codes, coordinates, XP numerals, the
  certificate verification code.
- Scale (rem): 12 caption / 14 body-s / 16 body / 18 lead / 22 h3 / 28 h2 /
  36 h1 / 52 display. Line-heights 1.5 body, 1.15 display. Headings tracking
  -0.01em; ALL-CAPS eyebrow style (12px, +0.08em, ink-500) for section labels.

## Space, radius, elevation

- 4px base grid; page gutters 24 mobile / 48 desktop; max content width 1120px
  (lesson stage max 760px for reading measure).
- Radii: 10px controls, 16px cards, 24px hero panels. The blaze marker is the
  only rotated-square element — don't dilute it with other diamonds.
- Elevation: prefer hairline borders (`--ts-line-200`) + very soft ambient
  shadow (`0 1px 2px rgb(14 42 35 / 0.06), 0 8px 24px rgb(14 42 35 / 0.06)`)
  only on floating surfaces (popover, slide-over, toast). Flat cards on the app
  background use border only.

## Illustration & iconography

- Icons: Lucide, 1.5px stroke, sized 16/20/24, colored ink-500 or context color.
- Illustration style for asset slots: flat vector, 4–6 brand colors, visible
  1.5px pine-950 line work, paper-0 backgrounds — "field guide plate" energy.
  Generate or draw per-slot; slot list in DESIGN-002. Every illustration gets
  alt text describing its teaching content.
- Photography: none. (Coherence beats stock photos.)

## Voice in UI copy
Per PROJECT_BRIEF tone + frontend-writing rules: active voice, verbs on
buttons ("Save plan", "Check answer", "Ask Ranger"), sentence case everywhere,
no exclamation inflation (max one "!" per screen, earned).
