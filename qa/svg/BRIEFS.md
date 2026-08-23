# qa/svg — build briefs for the remaining SVG and animated-SVG work

These are the thirteen SVG files left open by `artgen/VISUAL_AUDIT_M3-M6.md` after
batch 13 shipped every raster. Every file is authored **here**, in `qa/svg/`, never in
`web/src/assets/svg/` — the owner inspects this folder before anything is wired.

| # | File (in `qa/svg/`) | Kind | viewBox | Replaces / targets | Brief |
| --- | --- | --- | --- | --- | --- |
| A | `keylist-stop-assess-communicate.svg` | animated plate | 1000×600 | slot `keylist-stop-assess-communicate` (plain figure, 5:3) — the recommended end state; a raster fallback ships now | §A |
| B | `scene-helmet-fit.svg` | animated plate | 1000×600 | slot `scene-helmet-fit` (plain figure, 5:3) — optional upgrade over the shipped raster | §B |
| C | `keylist-stability-model.svg` | animated plate | 1200×800 | slot `keylist-stability-model` (hotspot_figure, 3:2) — medallions pinned to the live stop positions | §C |
| D | `keylist-four-families.svg` | animated plate | 1200×800 | slot `keylist-four-families` (hotspot_figure, 3:2) — medallions pinned | §D |
| E | `keylist-pavement-physics.svg` | animated plate | 1200×800 | slot `keylist-pavement-physics` (hotspot_figure, 3:2) — medallions pinned | §E |
| F | `scene-crossing.svg` | animated plate | 1000×600 | slot `scene-crossing` as a PLAIN figure (5:3) — if adopted, m6-l2-s1 goes back to keylist + figure | §F |
| G | `scene-loading-cargo.svg` | animated plate | 1250×500 | slot `scene-loading-cargo` (ActivityHost host slot, 5:2) | §G |
| H | `sort-cond-cold-hands.svg` | icon | 64×64 | C-087, M5 L1 S2 sort card (40 px) | §H |
| I | `sort-cond-heat.svg` | icon | 64×64 | C-088, M5 L1 S2 sort card (40 px) | §I |
| J | `sort-cond-storm.svg` | icon | 64×64 | C-085, M5 L1 S2 sort card (40 px) | §J |
| K | `sort-cargo-towing.svg` | icon | 64×64 | C-093, M6 L2 S2 sort card (40 px) | §K |
| L | `level-6-wayfinder.svg` | emblem | 128×128 | B-028, `/progress` + dashboard (56–96 px) | §L |
| M | `badge-b-terrain.svg` | badge | 48×48 | A-017, BadgeMedal (32 / 44 px inside the blaze frame) | §M |

The tools: `python qa/svg/_check.py <file>` (budget, text ban, palette, reduced-motion,
ids) and `python qa/svg/_render.py <file> [--icon <px>]` (renders into
`qa/svg/renders/` — as `<img>`, reduced-motion, true size + zoom for icons, and a
12-frame paused sheet for animations). **Look at every render you make.** A defect
that is visible in the PNG and not mentioned in your report is the one failure mode
this process cannot forgive.

---

## 0. The contract (applies to every file)

### 0.1 File
- Root `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 W H" role="img">` with a
  `<title>` as the first child (one sentence, the alt). No `width`/`height` attributes.
- Self-contained: no external images, fonts, CSS, scripts; no `@import`; no
  `<foreignObject>`; no `<text>` (the asset lint bans it — captions carry words).
- Unique id prefix per file (e.g. `sac-`, `hf-`, `stb-`) on every id; ids only where
  referenced.
- Budget: plates ≤ 25 KB, icons/badges/emblems ≤ 8 KB. Write by hand, not by export;
  round coordinates to one decimal; reuse `<symbol>`/`<use>` for repeated machines.
- Colours are literal hex from this list and nothing else (no named colours, no
  3-digit hex, no CSS variables — they do not reach an `<img>`):

| Token | Hex | Use |
| --- | --- | --- |
| ink / pine-950 | `#0D1E2E` | all line work, deepest masses, visors, tires |
| spruce / pine-700 | `#2F6B52` | primary fill: machines, jerseys, signs, conifers |
| mid spruce / pine-500 | `#3B8266` | second green where two must read apart |
| sage / pine-300 | `#ABCDB8` | soft fills, mid-ground, head forms, medallion interiors |
| pale pine / pine-100 | `#DEEDE5` | dusk sky band, very light fills |
| moss / moss-100 | `#ECF3EF` | ground wash, distant hills |
| paper / paper-0 | `#F9FCFA` | the plate ground rect (always) and medallion discs |
| fireweed / clay-500 | `#B5446E` | THE focal accent — once per plate, never on a hotspot plate |
| teal / sky-600 | `#1E8A6E` | water, rain, wet surfaces |
| amber / sun-400 | `#DBA12E` | caution semantics only (a lit window, a check-first mark) |
| brick / danger-600 | `#A93226` | risk semantics only (a wrong option, a ✗, a prohibition ring) |
| ink-grey / ink-500 | `#46555A` | secondary lines, shadows, pavement |
| hairline / line-200 | `#D6DFDA` | seams, faint rules |

### 0.2 Drawing
- Ground: a full-bleed `#F9FCFA` rect, then 2–3 contour polylines in `#0D1E2E` at
  `stroke-opacity="0.06"`–`0.08`, 1 unit wide, as the house texture.
- Line: ONE outline weight per file. Plates: 3 units at 1000-wide (3.6 at 1200, 3.75
  at 1250), round joins and caps; interior detail 2 units; nothing under 1.5. Icons:
  2 at 64 (the set's `stroke-width="2"` root), 1.5 at 128 and 48.
- Fills flat. No gradients, no filters except one soft ellipse shadow under a floating
  object, no drop shadows, no blur.
- **Match the shipped plates**, not the retired SVGs. Before drawing, VIEW the
  batch-13 raster of the slot you are replacing (`web/src/assets/raster/<slot>-768w.png`
  or `-512w.png`) and `keylist-tcloc-768w.png`: thick navy outlines, flat spruce
  machines with four black knobby tires and tube racks, white full-face helmets with
  dark visors, medallions as paper discs with a navy rim. A hand-drawn quad must still
  read as that quad at 80 px: body, seat, racks, bars, four wheels.
- People are whole bodies in bold simplified shapes — never stick figures, never
  black silhouettes, never a visible face. Gear is always complete: white full-face
  helmet (`#F9FCFA` shell, `#0D1E2E` visor), spruce jersey with paper panels, spruce
  pants, black gloves and boots.
- Diagram hygiene: no leader lines or arrows that point at nothing; no empty callout
  circles; no unexplained ticks; one arrowhead shape; no stray blazes; no `^` caret
  grass; no amber suns; no gear-tooth tires; no pills standing in for objects.

### 0.3 Motion (animated plates)
- The file is rendered inside an `<img>`: CSS `@keyframes` and SMIL run; hover, click,
  JS, page CSS variables and `currentColor` do not. Make motion autonomous.
- Put animations in a `<style>` inside the SVG, on classes with the file's id prefix.
  Prefer `transform`/`opacity`/`stroke-dashoffset` animations (cheap, seekable).
  Set `transform-box: fill-box; transform-origin: …` explicitly on anything rotated.
- `@media (prefers-reduced-motion: reduce)` inside that `<style>` must switch every
  animation off and show the **final / complete state** with no delays. Reduced
  motion is absolute (DESIGN-004). The harness renders this state as `<stem>.rm.png`.
- Motion law: ≤ 700 ms per beat; ease-out for arrivals, ease-in-out for cycles; loop
  period ≥ 8 s with a ≥ 2 s rest in the complete state; nothing flashes; no
  spring/bounce; nothing moves faster than the eye follows. Every beat must carry
  meaning — a beat that could be cut without losing the point gets cut.
- Author the **resting frame** (t = 0 of the loop, and the reduced-motion state) so the
  static image teaches on its own. The reviewer will judge `t = 0` and `.rm.png` as
  standalone plates.
- Loop timing trick: one long `animation-duration` (the loop period) per element with
  keyframe percentages for its beats and a hold to 100 %, rather than chained delays —
  it keeps every element in phase and makes the paused-frame sheet honest.

### 0.4 Process (builder)
1. Read this file's §0 and your §. Read the reference SVGs named in your §. VIEW the
   reference PNGs named in your § (Read tool on the PNG).
2. Write the SVG to `qa/svg/<file>`.
3. `python qa/svg/_check.py qa/svg/<file>` until OK.
4. `python qa/svg/_render.py qa/svg/<file>` (add `--icon <px>` for H–M) and VIEW
   `.img.png`, `.rm.png`, and `.frames.png` / `.true.png` + `.zoom.png`.
5. Fix what you see. Repeat 3–4. Stop when every line of your §'s acceptance list is
   true in the render, not in your head.
6. Report: iterations, what you checked, any residual you could not fix.

### 0.5 Process (reviewer)
Fresh eyes, adversarial. Run `_check.py` and `_render.py` yourself. Judge each render
against the §'s acceptance list, §0, and VISUAL_ASSETS Part 5 (U1–U10, S1–S6, SF1–SF6,
C1–C5). Look for: anything that reads as a different object than intended; machines
that do not match the batch-13 quads; rider gear gaps; accent misuse; motion that is
decorative rather than meaningful; reduced-motion state not equal to the complete
state; resting frame that does not teach alone; line-weight inconsistency; anything a
first-time learner would misread. Name defects precisely (which element, which frame,
what to change). Your default is to find something; "pass" needs evidence.

---

## A. `keylist-stop-assess-communicate.svg` — the recommended animation

**Teaches:** the only genuinely ordinal list in the course: STOP (scene safe) → ASSESS
(people first) → COMMUNICATE (early). Each stage is gated by the last. The instinct is
to run straight to the person on the ground; the stage before that is what keeps one
hurt rider from becoming two.

**Context:** plain `figure` block at 5:3, ~700 px wide, caption below it: *"The one
list in this course that is genuinely an order — the instinct is to run straight to
the person on the ground, and the stage before that is what keeps one hurt rider from
becoming two."* The shipped raster fallback is `web/src/assets/raster/keylist-stop-assess-communicate-1024w.png`
— VIEW it; match its medallion look and pictograms (palm over a quad with the switch
off; eye over a kneeling rider beside a seated rider; handheld radio with sound arcs
beside a phone).

**Canvas 1000×600.** Three medallions r = 120 centred at (170,300), (500,300),
(830,300): paper disc, 3-unit navy rim. Between them two GATES: two posts (8 units
wide, 70 tall, navy) straddling the connector at x ≈ 335 and x ≈ 665, with a bar
(hinged at the left post's top) that swings from closed (horizontal, 0°) to open
(−70°), striped spruce/paper like a barrier arm. Dashed spruce connectors (6 on / 8
off) run medallion → gate → medallion with a small arrowhead at each medallion's rim.
A faint dashed trail line (ink-grey, 30 % opacity) wanders under the row at y ≈ 520.
Under each medallion, 1 / 2 / 3 small navy dots (r 5, 14 apart) — the only ordinal
device, keep it.

**Pictograms** (navy line, sage/spruce fills, no faces): (1) an open gloved palm,
fingers up, above a small plan-view quad whose handlebar switch is a white dial with
the pointer at OFF; (2) an open eye (navy lids, spruce iris, navy pupil) above a
kneeling geared rider beside a seated geared rider, both small and whole; (3) a
handheld radio with antenna and three sound arcs beside a phone with a blank pale
screen. Medallion 1's disc is **fireweed `#B5446E`** with the palm in paper — STOP is
the most consequential stage and this is the one magenta.

**Beats (loop 12 s, `animation-duration: 12s` on everything):**
- 0–5 %: the COMPLETE state — all three medallions at 100 %, both gates open,
  connectors lit. (This is also the reduced-motion state and the t = 0 frame.)
- 5–9 %: medallions 2 and 3 and both connectors dim to 45 % opacity; both gate bars
  swing shut (ease-in-out, ≤ 600 ms); medallion 1 stays lit.
- 9–14 %: medallion 1 pulses once — rim stroke 3 → 4.5 → 3 units (or scale 1 → 1.03 → 1).
- 14–19 %: gate 1 swings open (ease-out).
- 19–23 %: connector 1's dashes travel right (`stroke-dashoffset` −56 over 500 ms)
  and it rises to 100 %.
- 23–28 %: medallion 2 rises to 100 %; the eye blinks once (a paper lid rect scales
  over the iris and back, 300 ms).
- 28–33 %: gate 2 swings open; 33–37 %: connector 2 travels and lights.
- 37–42 %: medallion 3 rises to 100 %; the three sound arcs draw in one after
  another (`stroke-dashoffset`, 150 ms apart).
- 42–100 %: hold the complete state (≈ 7 s rest).

**Reduced motion:** the complete state exactly (all lit, gates open, arcs drawn).

**Acceptance:** at t = 0 a viewer can name the three stages and see they are in a
row; during the loop a viewer can say "you can't do the middle one until the first is
done"; no text; one magenta; gates read as gates (posts + arm), not pillars; ≤ 25 KB;
`_check.py` OK.

---

## B. `scene-helmet-fit.svg` — animated cutaway (optional upgrade)

**Teaches:** the liner is the mechanism — the shell spreads the hit, the crushable
liner collapses over milliseconds to stretch out the deceleration; fit, fastening,
rating and retirement all follow. Caption: *"The liner is the mechanism. The shell
spreads the hit; the liner crushes to buy milliseconds — which is why fit, fastening,
rating, and retirement are all the same rule wearing different clothes."*

**Context:** plain figure 5:3. Shipped raster to match: `scene-helmet-fit-1024w.png`
(VIEW it — a motocross full-face helmet in right-facing profile, cutaway exposing
three layers, strap fastened, gloved fingers under the strap).

**Canvas 1000×600.** Helmet worn in right-facing profile, centred at (520,300), outer
shell radius ≈ 190 with a peak/visor brow and a chin bar; cutaway on the rear half
(a clean vertical section line at x ≈ 560) exposing three bands following the skull
curve from brow to nape: shell `#2F6B52` 14 units, liner **`#B5446E` 40 units** (the
one magenta — it is the point), comfort pad `#ABCDB8` 12 units; the head inside is a
smooth sage form (a slightly different sage is fine: use `#DEEDE5`) with no features.
Dark visor `#0D1E2E` at 85 % opacity over the face opening. Chin strap: a navy V under
the jaw with a small buckle, and exactly TWO black-gloved fingers (two rounded rects,
4-unit gap, clearly separate) slid flat under the strap. At right, a quiet graph
(no axes text): a baseline at y = 470 from x = 720 to 960 and two curves drawn over
it — a short tall spike (no helmet) in `#46555A` at 35 % opacity and a long low hump
(helmet) in `#2F6B52`.

**Beats (loop 10 s):** 0–5 % rest = complete state (liner locally compressed under a
resting impact block, both curves drawn). 5–10 % reset: block off-plate, liner full,
curves hidden. 10–15 % an impact block (`#46555A`, 90×60, rounded) arrives from the
upper-left, ease-out, and touches the shell at the crown. 15–22 % the liner band
compresses locally under the contact (clip-path or a second path morph: liner
thickness 40 → 26 units over a 120-unit arc), the shell deflects 3 units, the head
does not move. 22–30 % the two curves draw in (`stroke-dashoffset`): the spike first
(fast), then the hump (slow), so the hump visibly stretches the same area over more
time. 30–100 % hold. The block stays resting on the crown in the hold (the compressed
state IS the teaching frame).

**Reduced motion:** the complete state (block resting, liner compressed, both curves).

**Acceptance:** helmet reads as worn and enclosing; three layers distinct, magenta the
thickest; two fingers countable; the crush is visible as a local dent in the magenta
band only; the hump-vs-spike reads without text; no face; ≤ 25 KB.

---

## C. `keylist-stability-model.svg` — animated plumb-line hub (hotspot_figure)

**Teaches:** CoG plumb line must land inside the support width; four applications.
This plate sits under a `hotspot_figure` block whose four seals are ALREADY placed at
fixed percentages — your medallions must sit exactly there so the block needs no edit.

**Context:** 3:2, shown whole (object-contain), ~700 px wide. The seals (magenta
discs, 24 % of plate width) cover the medallions until opened; the CENTRE machine is
always visible and is where the animation lives. **No magenta anywhere in the art.**
VIEW `keylist-stability-model-768w.png` (shipped raster) and `keylist-tcloc-768w.png`.

**Canvas 1200×800.** Medallion centres and radius (binding): slopes (233,178), sidehill
(967,178), position (232,585), loads (966,585), r = 150, paper disc, 3.6-unit navy
rim, dashed spruce connectors to the centre group (no arrowheads). Centre: rear-view
quad `<symbol>` (two rear tires as black rounded rects with tread notches, spruce
body, rear rack tubes, seat, rider torso + helmet above) drawn inside a `<g>` that
rotates about the downhill contact point; CoG quartered circle (r 14, navy/paper
quarters) at the rider's lower torso; a dashed navy plumb line from the CoG straight
down to ground level — the plumb line is NOT inside the rotating group, it stays
vertical; ground bracket (two ticks + bar) spanning outside-to-outside of the tires,
with a "margin" segment (the part of the bracket beyond the plumb foot) drawn as a
separate spruce stroke that can recolour. Each medallion holds a 0.42-scale instance
of the same symbol posed for its case (uphill side view needs a second, side-view
symbol; keep both symbols consistent — same tire, body and rider language).

**Beats (loop 12 s):** 0–5 % rest: level, plumb centred, margin spruce. 5–11 % ground
+ machine rotate to 12° about the downhill contact point (ease-in-out 700 ms); the
plumb line, fixed vertical, visibly walks toward the downhill tire; margin segment
shrinks and turns `#DBA12E`. 11–17 % rider torso rotates −15° (lean uphill), CoG
shifts 30 units uphill, plumb walks back, margin regrows and returns to spruce.
17–30 % hold. 30–36 % a box rises onto the rear rack; the CoG mark rises 60 units; at
the same 12° the plumb lands past the tire edge; margin turns `#A93226` for ~600 ms.
36–42 % everything eases back to level; 42–100 % hold (rest ≈ 7 s).

**Reduced motion:** rest frame (level machine, plumb centred, medallions visible).

**Acceptance:** medallion centres within ±8 units of the binding positions; the
plumb line stays vertical while the machine tilts; the margin recolour reads; the
four medallion cases are recognisable at 0.42 scale; no magenta; ≤ 25 KB.

---

## D. `keylist-four-families.svg` — animated split plate (hotspot_figure)

**Teaches:** water and light attack the trail you read; cold/heat and dust attack the
rider doing the reading. Seals are placed at fixed percentages; medallions must sit
there. **No magenta.** VIEW `keylist-four-families-768w.png`.

**Canvas 1200×800.** Seam: a 4-unit `#D6DFDA` vertical at x = 600. LEFT HALF ground
`#ECF3EF`; a low, close stretch of dirt TRAIL (paper/sage fill, navy edges, a few
tire-track dashes — never a road) running toward the viewer from (300,330) widening
to the bottom edge; three roots crossing it (`#2F6B52`, 8–10 units, natural forks,
modest size); a wet band across the trail (`#1E8A6E` at 55 % opacity) that widens in
the animation; sky band at the top of this half (`#DEEDE5`) that darkens. Two
conifer silhouettes at the seam. Medallions (binding centres): water (148,181) r 117
— rain cloud over a teal wave; light (421,181) r 117 — low sun half-hidden behind a
ridge with a navy sky band above. RIGHT HALF ground paper with contours; one standing
geared rider `<symbol>` (full body, facing us, ~360 tall) centred at x ≈ 760; behind
and above-left of the rider a small spruce quad from behind at (660,470) that will
emit dust. Medallions: temperature (1033,194) r 101 — thermometer flanked by a small
snow asterisk (left) and two heat-shimmer curves (right); dust (1050,542) r 107 —
small quad from behind trailing a pale dust cone.

**Beats (loop 14 s; left and right alternate so only one half moves at a time):**
0–5 % rest = complete state (wet band wide, sky dark, thermometer mid, dust cone
present, visor tinted). 5–10 % reset. 10–20 % rain strokes (`#1E8A6E`, 2 units, 12 of
them, staggered) fall on the left trail while the wet band widens. 20–25 % the left sky
band darkens paper → `#DEEDE5` and the root shadows fade (light family). 25–40 % rest
left. 40–50 % thermometer column drops then rises (cold then heat) while the rider's
glove outlines thicken 1 unit. 50–58 % the background quad's dust cone widens toward
the rider and the rider's visor tints `#ABCDB8` at 40 %. 58–100 % hold.

**Reduced motion:** complete state with all four effects present.

**Acceptance:** left/right split reads as "trail" vs "rider"; trail is not a road;
rider drawn whole with gear; medallions within ±8 units; four effects each legible;
no magenta; ≤ 25 KB.

---

## E. `keylist-pavement-physics.svg` — animated three-mechanism plate (hotspot_figure)

**Teaches:** tire built to deform, locked rear axle, high CoG on a grippy surface —
three facts converging on one conclusion at the pavement. Seals fixed; **no magenta.**
VIEW `keylist-pavement-physics-768w.png`.

**Canvas 1200×800.** Medallions (binding): tires (230,284), axle (599,270), cog
(966,274), r = 165, paper discs, navy rims. Pavement band y 600–720 full width in
`#46555A` with a `#D6DFDA` edge line at y = 600; a pale `#ECF3EF` ellipse (rx 70,
ry 22) at (600,660) as the convergence point; three straight spruce arrows (6 units,
one arrowhead shape) from each medallion's bottom rim to the ellipse. Pictograms:
(1) tire cross-section — a tall knobby tire seen from the front pressed on a flat
dark surface, carcass bulging (two sidewall paths); (2) rear axle — two wheels joined
by one solid shaft (no differential), three small scrub arcs at the right wheel's
contact; (3) rear-view quad on a dark surface tipped up onto its outside wheels, CoG
quartered circle high in the rider's torso. Draw the machine parts with the same
tire/body language as C.

**Beats (loop 12 s, one medallion at a time):** 0–5 % rest = all three demonstrated
(bulge, arcs visible, quad tipped 8°), arrows drawn, ellipse filled. 5–10 % reset.
10–20 % tire carcass bulge oscillates ±6 units sideways twice. 22–32 % scrub arcs
appear one by one and the shaft flexes 2 units. 34–44 % the quad rotates 8° onto its
outside wheels and back, CoG mark travelling with it. 46–54 % the three arrows draw
in (`stroke-dashoffset`) and the ellipse fills. 54–100 % hold.

**Reduced motion:** the demonstrated state (rest frame).

**Acceptance:** the tire reads as a knobby tire (no gear teeth); the axle reads as
one solid shaft; the quad has four wheels even tipped; no machine on the pavement
band; arrows meet at one point; medallions within ±8 units; no magenta; ≤ 25 KB.

---

## F. `scene-crossing.svg` — animated crossing procedure (plain figure)

**Teaches:** stop completely, look completely (both ways, then again); square, brisk,
done; the group crosses as individuals; designated beats convenient. This is the
course's second-best animation candidate: a procedure. Built as a PLAIN figure at 5:3
(if adopted, m6-l2-s1 returns to keylist + figure). The stop bar is the one magenta.
VIEW `scene-crossing-768w.png` (shipped plan view) for the look.

**Canvas 1000×600.** Plan view: road band y 180–320 in `#46555A`, pale dashed centre
line (`#D6DFDA`, 24 on / 18 off); trail (`#ECF3EF` with `#ABCDB8` tire-track dashes,
navy edges, 120 wide) from the bottom edge up to the road at x = 500, continuing
faint (`#DEEDE5`, no edges) above the road into conifer canopy; conifer clusters and
rocks map-style either side (two greens); stop bar **`#B5446E`** 8 units across the
trail at y = 338; a faint crossing lane (`#ECF3EF` at 35 %) straight across the road
from the bar. Quad `<symbol>` from above (spruce body, four black wheels, racks,
white helmet disc): quad 1 at the bar (rear at y ≈ 420), quad 2 one length behind
(y ≈ 540), one small car from above far left on the road at x ≈ 110. Sight lines:
dotted navy (3-unit dots, 10 apart) from quad 1's helmet along the road to the left
and right, ending in small open circles at x = 60 and x = 940.

**Beats (loop 16 s):** 0–5 % rest: quad 1 at the bar, both sight lines drawn, quad 2
waiting, car distant (complete, teaching frame). 5–8 % reset: sight lines hidden,
quad 1 at y = 470 rolling. 8–12 % quad 1 rolls up and stops behind the bar (700 ms
ease-out). 12–16 % the LEFT sight line draws (dashoffset), holds 400 ms, fades.
16–20 % the RIGHT line draws, holds, fades. 20–23 % LEFT again, shorter. 23–33 % the
car slides 200 units right along the road and past the crossing while the LEFT line
re-draws and stays lit (no crossing while traffic is present); the car exits right.
33–38 % quad 1 crosses straight and brisk (700 ms) up the lane and fades into the
top canopy. 38–44 % quad 2 rolls to the bar and stops. 44–58 % quad 2 does
left-right-left. 58–100 % hold with quad 2 at the bar, both lines drawn (the rest
frame shape again, with quad 2 as the waiting one). Never show a machine turning or
pausing on the road.

**Reduced motion:** the rest frame.

**Acceptance:** road, trail, right angle, bar, lane all legible; the look-look-look
rhythm is visible in the frame sheet; quads never stop on the road; one magenta (the
bar); ≤ 25 KB.

---

## G. `scene-loading-cargo.svg` — animated tilt comparison (host slot 5:2)

**Teaches:** same kilograms, worse geometry; the tall stack is the wrong choice (SF4:
brick red marks it). ActivityHost shows this at 5:2 above the M6 L2 S2 sort.
VIEW `scene-loading-cargo-768w.png` (shipped, cropped 5:2).

**Canvas 1250×500.** Two identical rear-view quad `<symbol>` instances (no rider)
centred at x = 330 and x = 920, ground line y = 400, a soft `#D6DFDA` seam at
x = 625. Left: a low flat case (`#ABCDB8`, navy outline, 160×60) strapped on the rear
rack with two navy straps; CoG quartered circle low in the body; dashed plumb line
to ground; ground bracket across the tires with a margin segment; a spruce ✓ inside
a small navy-outlined diamond above. Right: two stacked boxes (paper fill, **`#A93226`
outline**) rising to ~220 above the rack, loosely strapped; CoG high in the stack;
plumb; bracket; a brick-red ✗ in a diamond above. Each machine + ground inside a
`<g>` that rotates about its downhill contact point; plumb lines outside the rotating
groups (they stay vertical). No magenta.

**Beats (loop 10 s):** 0–5 % rest = tilted end state (both at 10°, left plumb inside,
right plumb at the outer tire edge, right margin red, ✓ and ✗ shown). 5–10 % reset
to level with marks hidden. 10–17 % both ground planes rotate to 10° (700 ms).
17–24 % the left plumb lands inside its bracket; the right lands at the outer tire
edge, its margin segment turns `#A93226`; ✓ and ✗ fade in. 24–70 % hold. 70–77 %
level out, marks persist. 77–100 % hold.

**Reduced motion:** the tilted end state with both marks.

**Acceptance:** two identical machines; low case vs tall stack obvious; both plumb
lines vertical at all times; red only on the stack, its margin and the ✗; everything
inside the 5:2 canvas with quiet edges; ≤ 25 KB.

---

## H. `sort-cond-cold-hands.svg` — C-087 "An hour in cold drizzle, your hands are clumsy on the levers" (Tend the rider)

Reference style: read `web/src/assets/svg/sort-cond-dust.svg`, `sort-cond-wet-roots.svg`,
`sort-gear-gloves.svg`; VIEW `qa/svg/renders/` after rendering. Root like the set:
`viewBox="0 0 64 64" role="img" fill="none" stroke="#0D1E2E" stroke-width="2"
stroke-linecap="round" stroke-linejoin="round"`.

**Defect being fixed:** the current icon is a brick-red blob that reads as a paw, and
red is the set's "unsafe" colour — this item is rider care, not unsafe.

**Draw:** a gloved hand (sage `#ABCDB8` fill, navy outline, four fingers + thumb
clearly separate) closing on a brake lever (navy line with a small pivot) at the end
of a short handlebar grip (`#2F6B52`); two or three small `#1E8A6E` snow asterisks
(three crossed 4-unit strokes) falling at the upper-left; a single drizzle stroke or
two in `#1E8A6E`. No red anywhere, no amber. Must read at 40 px: one hand, one lever,
cold.

**Acceptance at 40 px (`.true.png`):** a hand on a lever with cold marks; silhouette
distinct from `sort-gear-gloves` (that one is a glove alone); ≤ 8 KB.

---

## I. `sort-cond-heat.svg` — C-088 "Hot afternoon, a dull headache and you can't remember your last drink" (Tend the rider)

Reference style as §H; also read `sort-cond-fading-light.svg` (its sun is the set's
sun). **Defect:** the current sun and the bottle's "empty" line are brick red (risk
semantics) on a rider-care item.

**Draw:** a sun (`#DBA12E` disc, navy outline, eight short navy rays) upper-left; a
water bottle (paper fill, navy outline, sage cap) lower-right with a `#D6DFDA` dashed
empty-level line low in the bottle and nothing inside; two small heat-shimmer
curves (`#DBA12E`, 1.6 units) between them. No red. Must read at 40 px: sun + empty
bottle.

**Acceptance:** amber sun, empty bottle, no red, distinct from `sort-cond-fading-light`
(which pairs a clock with a setting sun); ≤ 8 KB.

---

## J. `sort-cond-storm.svg` — C-085 "Forecast shifted: thunderstorm line arriving mid-ride" (Change route or schedule)

Reference style as §H. **Defect:** the current cold-front symbol (amber triangles on
a bar) reads as three tents in rain at 40 px.

**Draw:** a navy-outlined cloud (sage fill, flat base) filling the upper two-thirds;
one `#DBA12E` lightning bolt (navy outline, 3 bends) dropping from the cloud's base
left-of-centre; four rain strokes (`#1E8A6E`, 2 units, angled) right of the bolt; a
thin navy front line across the bottom (y ≈ 56) with two small filled navy
half-circles on it (the meteorological warm/cold-front marks) — or omit the front
line if it muddies at 40 px; the bolt and rain carry the idea. No red.

**Acceptance at 40 px:** cloud + bolt + rain; the learner's word "thunderstorm" comes
first; distinct from `sort-cond-dust`/`wet-roots`; ≤ 8 KB.

---

## K. `sort-cargo-towing.svg` — C-093 "Towing a small utility trailer for the first time" (Needs a check first → `sun-400` accent)

Reference style: `sort-cargo-rack-limits.svg`, `sort-cargo-two-up.svg`,
`sort-cargo-heavy-high.svg` (the set's side-view quad language). **Defect:** the
current towing machine is an unreadable shape beside the trailer; the amber hitch dot
floats.

**Draw:** left two-thirds: the set's side-view quad (sage body, navy outline, two
visible wheels with navy rims, a small rack) facing right; right third: a small box
trailer (paper fill, navy outline, one wheel) behind it; between them a short navy
tongue to the quad's rear and a `#DBA12E` ring (r 3, navy outline) exactly at the
hitch; a small navy ground line under both. The ring is the only amber (the
"check this" mark). No red.

**Acceptance at 40 px:** a quad pulling a trailer, the hitch highlighted; the quad
matches `sort-cargo-rack-limits`' silhouette; ≤ 8 KB.

---

## L. `level-6-wayfinder.svg` — B-028 Wayfinder (1000 XP): compass rose over a contour field

Reference: read `level-5-ridge-runner.svg` and `level-7-trail-boss.svg`; VIEW
`qa/svg/renders/` after rendering at `--icon 96`. **Defect:** the current dial is
offset from its outer ring, leaving a pale crescent artifact at the right.

**Draw (128×128):** the set's paper disc r 61 with a 1.5-unit navy rim; two faint
contour polylines (6 % ink) across the upper disc; a spruce dial disc r 40 centred
at (64,64) — concentric with the outer ring — with a sage (`#ABCDB8`) tick ring r 34
(eight ticks); a four-point star rose (paper fill, navy outline) with its north point
in **`#B5446E`** (the level set's accent; no gold — gold belongs to level 7); a small
navy hub dot. Nothing offset; no crescent.

**Acceptance at 96 px and 56 px:** concentric rings, rose centred, magenta north
point, reads as "compass" and as more advanced than level 5 / less than level 7;
≤ 8 KB.

---

## M. `badge-b-terrain.svg` — A-017 Terrain Reader: eye scanning contour lines

Reference: read `badge-b-mindset.svg` (the eye) and `badge-b-geared.svg`; the badge
sits inside BadgeMedal's blaze frame at 32 / 44 px (`size-8`/`size-11`). **Defect:** the
eye floats above the contour arcs with a gap; the two elements do not read as one
emblem at 32 px.

**Draw (48×48):** three nested contour arcs (navy 1.5, sage fills between the outer
two) forming a hill across the lower half with the apex at (24,27); the eye
(almond, navy 1.8 outline, spruce `#2F6B52` iris r 5.5, **`#B5446E`** pupil blaze —
the rotated rounded square the badge set uses, see `badge-b-mindset`) sitting ON the
top arc with its lower lid touching the arc's apex — one object, no gap. Bold: fills
not hairlines.

**Acceptance at 32 px (`--icon 32`):** reads as an eye on a hill; pupil blaze visible;
matches `badge-b-mindset`'s eye construction; ≤ 8 KB.
