# Stability lab, take two — real rigid-body physics + painted sprites

Repo: /home/rnmercado/Projects/Sightline_Saftey_Academy (app in `web/`). Lab dir: `web/src/activities/lab_objective/`.
The owner rejected the first rebuild: "terrible low quality svg" and "not realistic physics in ANY way". Both are
being replaced. Read this whole file before touching anything, then read the files named in your module.

## What changes

* **Physics** is now a real 2D rigid-body simulation with **matter-js 0.20** (already in `web/node_modules`,
  `import Matter from "matter-js"`; types in `@types/matter-js`). Mass, gravity, contacts, friction, joints.
  Rollovers, wheel lift, loop-outs and the rider coming off must **emerge** from the simulation — nothing is
  scripted, tweened or decided by a formula. The old quasi-static model (`stabilityModel.ts`, `stabilitySim.ts`)
  stays only for the Free-tilt sandbox and the CoG plumb overlay maths; it no longer decides outcomes.
* **Art** is now the course's own painted plates, cut into sprites (PNG with alpha) in
  `web/src/assets/stability/` with anchor JSON next to each:
  - `atv-side.png` (863×459) + `atv-side.json` — side-view chassis WITH wheels baked in (from hero-m2-machine).
    `atv-side-wheel-front.png` / `-rear.png` — circular crops of the two tires, drawn ON TOP of the chassis at
    the wheel centres and rotated with the wheel bodies (they hide the baked wheels underneath).
    Wheel centres in sprite px: front (143, 336) r 123; rear (688, 336) r 124. Ground line = sprite bottom (y 459).
    The front of the machine is on the LEFT of this sprite (bars at x≈300). Mirror it (scaleX −1) so the front
    faces +x when the scenario drives rightward — or keep it and drive leftward; pick one and document it.
  - `atv-rear.png` + `atv-rear.json` — straight rear elevation (from lesson-m4-l2 master), anchors listed in the JSON
    (tire contact points, seat, grips, footwells). Coordinator supplies it before you start.
  - `helmet-side.png` — painted side-view helmet for the side rider's head.
  - Riders and cargo are vector, drawn by Module R at plate fidelity (see below).
* Coordinates: **1 world unit = 1 metre; render at S = 150 px/m** on a 400×300 viewBox (or larger — the stage may
  grow to 16:10). The side ATV sprite is scaled so its wheelbase (688−143 = 545 px) = **1.25 m** and wheel
  radius ≈ 0.28 m. Rear sprite: track (outer tire to outer tire) = **1.10 m**.

## Files & ownership (three parallel builders — do not edit another module's files)

- **Module P (physics)** owns: `stabilityWorld.ts` (new), `stabilityRun.ts` (new), `stabilityRun.check.ts` (new).
  May read `stabilityScenarios.ts` and MAY edit it (it owns the roster numbers now).
- **Module R (renderer + rider/cargo art)** owns: `StabilityStage.tsx` (new), `stageSprites.tsx` (new: rider + cargo
  vector parts, sprite components), `stageTerrain.tsx` (new). Reads the JSON/PNG assets.
- **Module U (lab UI)** owns: `StabilityLab.tsx`, `stabilityUi.tsx`, `useSimPlayback.ts` (adapt to the new run shape).
- Nobody touches `index.tsx`, `Walkaround*`, `stabilityModel.ts`, `stabilitySim.ts`, `StabilitySandbox.tsx`,
  `scene*.tsx`, `StabilityScene.tsx` (the old scene keeps powering the sandbox until the coordinator retires it).

## Shared types (final — code against these; the coordinator has a compile-safe skeleton in `stabilityRun.ts`)

```ts
// stabilityRun.ts
export type BodyId = "chassis" | "wheelFront" | "wheelRear" | "wheelLeft" | "wheelRight" | "rider" | "riderLegs" | "cargo";
export interface BodyPose { x: number; y: number; angle: number }          // metres, radians; y UP (renderer flips)
export interface RunFrame {
  t: number;                 // seconds since start
  s: number;                 // 0..1 progress along the run (side: chassis x over run length; rear: profile time)
  bodies: Partial<Record<BodyId, BodyPose>>;
  groundAngle: number;       // rear view: current tilt of the ground plane (rad, +ve = downhill to +x); side: local grade under the chassis
  riderAttached: boolean;    // false once the rider's seat joint has broken
  contacts: { front?: boolean; rear?: boolean; left?: boolean; right?: boolean }; // wheel touching ground this frame
  cog: { x: number; y: number };  // composite CoG of everything still attached (chassis+wheels+rider+cargo), metres
  support: [number, number];      // ground-plane x of the two outer contact patches (for the plumb overlay), metres
  eventActive: boolean;
}
export type Outcome =
  | { kind: "clean"; minMargin: number; atS: number }
  | { kind: "rollover"; atS: number; direction: "downhill" | "backwards" | "forwards" }
  | { kind: "riderOff"; atS: number; reason: "slid_downhill" | "loop_out" | "over_bars" };
export interface RunResult { frames: RunFrame[]; outcome: Outcome; failIndex: number | null; dt: number }
export interface RiderSetup { lean: number /* −1..1, −ve = uphill */; cargo: number /* 0..1 */; stance: "seated" | "standing" }
export function runScenario(scenario: Scenario, setup: RiderSetup): RunResult;   // deterministic, synchronous, ≤ 12 s of sim
```

## Module P — the simulation (matter-js)

Build a `Matter.Engine` per run with a **fixed step** (1/120 s, `Engine.update(engine, 1000/120)`), no `Runner`, gravity
9.81 in metre units (matter's default scale assumes px; set `engine.gravity.scale` so 1 unit = 1 m and set body
densities in kg/m²-ish so total machine ≈ 300 kg, rider ≈ 80 kg, full cargo ≈ 45 kg). Record a `RunFrame` every
1/60 s. Stop when: outcome decided AND 1.2 s of settle recorded, or the run end is reached + 0.8 s, or 12 s.

**Side view (climb / descent):** terrain = chain of static rectangles following `scenario.profile` (sampled every
0.25 m over the run length L = 18 m; grade = deg at s), friction 0.9. Rock / washout are extra static bodies on the
terrain surface at `event.s` (rock: a 0.22 m lump; washout: a 0.5 m × 0.18 m dip). Machine = chassis body
(`Bodies.fromVertices` hull matching the sprite silhouette or a simple 1.5 × 0.55 m box at the sprite's body height)
+ two wheel circles r 0.28 m at the sprite's wheel positions, revolute (`Constraint` pin, stiffness 1, length 0)
to the chassis, friction 1.0, restitution 0.05. Drive: set both wheels' angular velocity toward a target each step
(≈ 3.2 m/s ground speed, wheel ω = v/r), with a torque cap so a wheel in the air spins but does not fling.
Rider = one body (0.35 × 0.9 m capsule-ish, 80 kg) attached to the chassis by a **breakable seat joint**: a stiff
constraint from the rider's hips to the seat anchor + a soft "hands" constraint to the bars. `lean` moves the
hips' rest point ±0.25 m fore/aft **into the hill** for −1 (forward on a climb, back on a descent) and the rider's
angle rest; `stance = standing` lowers the hip anchor by 0.12 m (weight on the pegs), lets lean reach ±0.4 m, and
raises the break threshold ×1.6. Each step compute the seat joint's stretch; if it exceeds `BREAK_STRETCH`
(tune ≈ 0.08 m seated) for 3 consecutive steps, remove both joints → `riderAttached=false`, rider is a free body.
Cargo = a box body on the rear rack, mass 45 kg × `cargo`, welded to the chassis (stiff constraint pair).
Outcome rules (physical, not formulaic): `rollover` when |chassis angle relative to local ground normal| > 75°
(direction from the sign); `riderOff` when the joint broke (reason: on a climb with the rider leaving rearward =
`loop_out`; on a descent leaving forward = `over_bars`; else `slid_downhill`); `clean` when the chassis crosses
the run end still upright with the rider attached. `minMargin` for a clean run = the smallest (support half-width
− |cog.x − support centre|)/half-width seen — the plumb overlay's number.

**Rear view (side-slope):** cross-section. Ground = ONE static rectangle 8 m wide whose angle is set each step from
the profile (`Body.setAngle` about the point under the machine; the tilt rate is slow, ~ the profile over 6 s), plus
friction 0.95. Machine = chassis body (a trapezoid hull: 1.10 m at the tires, ~0.7 m at the seat, 0.95 m tall from the
ground) with two wheel circles r 0.28 m at ±0.41 m, welded (they do not roll in this view). Rider as above, lean
moves the hips ±0.28 m across the machine (−1 = uphill). Cargo box centred over the rack, raises the CoG.
Events: `rut` = the downhill wheel drops — model it as a short static wedge that the tilted ground rotates into
under that wheel at `event.s` (or apply a −y impulse at the downhill wheel equal to a 0.12 m drop). `rock band` =
the uphill wheel lifts 0.14 m (impulse or wedge). Rollover = chassis rolls past 75° from the ground normal (the
sprite will tumble down the slope on its own — let the sim keep running to show it).

**Tuning target (assert in `stabilityRun.check.ts`, runnable with `/usr/lib/chatgpt/resources/cua_node/bin/node stabilityRun.check.ts`
— Node 24 strips types; import with explicit `.ts` extensions; `import Matter from "matter-js"` resolves from web/node_modules
when run from the lab dir? No — run it from `web/` with `node src/activities/lab_objective/stabilityRun.check.ts`):**
- traverse (rear, peak ~26°, rut): seated centred ⇒ rollover; seated lean −0.6 ⇒ clean; standing −0.4 ⇒ clean; seated +0.6 ⇒ riderOff before any roll.
- haul (side climb, full locked cargo, rock): seated centred ⇒ riderOff loop_out (front lifts, rider goes off the back); seated −0.5 ⇒ clean; standing 0 ⇒ clean.
- descent (side, washout): seated +0.5 ⇒ riderOff over_bars; seated −0.5 ⇒ clean; standing 0 ⇒ clean.
- shortcut (rear, ~40°, rock band): every lean × stance × cargo ⇒ rollover or riderOff — nothing clean (assert a 7×2×3 grid).
Also print a table exactly like the old check did. Retune masses / thresholds / profile peaks until every assertion
holds; a clean run should not require the far end of a slider except on purpose. **Determinism:** same inputs ⇒
identical frames (no Math.random, no Date; matter-js is deterministic under a fixed step — verify by running twice
and comparing).

## Module R — the stage (rendering) and the rider/cargo art

`StabilityStage.tsx`: `props { scenario: Scenario; frame: RunFrame; setup: RiderSetup; showPlumb?: boolean; ariaLabel: string }`.
An `<svg viewBox="0 0 400 300">` (or 480×300) with a **world group** `transform="translate(...) scale(S, −S)"` so
metres map to pixels with y up, and a **camera** that follows the chassis in the side view (smooth: the group
translate = −(chassis.x − 1.2 m) so the machine sits ⅓ from the left; clamp at the run ends) and stays fixed in the
rear view. Draw order: sky/contour band, terrain (filled polygon under the profile, moss fill, topsoil band, grit,
the rock/washout/rut features at `event.s`), cargo, chassis sprite, wheel sprites, rider (legs, then torso+helmet),
then the **plumb overlay** in screen space: composite CoG marker (from `frame.cog`), true-vertical dashed line to
the ground, the support span between `frame.support`, the downhill/edge marker; colour → danger when the margin <
15 %. Under `pose`-less design: the stage draws whatever the frame says — a tumbling chassis just tumbles.
Sprites: `<image href={atvSide} width height transform=...>` positioned by the body pose with the sprite's
anchor (chassis body centre in sprite px is written in the JSON; wheels centred on their centres). Rider = vector
parts positioned by the rider body pose (torso, arms to the grips (two-segment with an elbow, IK to the grip anchor
on the chassis while attached; hanging loose when not), legs to the pegs while attached; the painted `helmet-side.png`
as the head in the side view). Rear view rider: back of a white helmet (dome + pink accent + visor strap), jacket
back, arms out to both grips, legs to both footwells; standing pose lifts the hips 0.12 m and straightens the legs.
**Palette must be sampled from the plates** (write the hexes in a comment: jacket green, pants, gloves/boots black,
helmet white, ink outline #0D1E2E-ish, line weight ≈ the plates' 3–4 px at 1536 → 1.5 px at stage scale).
Iterate: build a harness (esbuild → react-dom/server → Playwright screenshot; chromium at
`/home/rnmercado/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`, playwright-core in web/node_modules,
node at `/usr/lib/chatgpt/resources/cua_node/bin/node`) that renders the stage for hand-made frames (upright, 25°
side-slope, mid-rollover, rider detached, side climb with cargo, descent) side by side with the ORIGINAL plates,
Read the PNGs, and fix everything that looks worse than the plates. You are done when a reviewer cannot tell the
rider was not painted with the machine.

## Module U — the lab

Keep the game shell from the current `StabilityLab.tsx` (scenario cards, setup aside, Play the run / Turn back /
Try again / Reset, outcome banner with the scenario hints, objectives via `meet(id)`, "About this simulation"
popover wording rules: never "concept model" / "operating chart" / "operating guide"). Swap the engine: Play calls
`runScenario(scenario, setup)` (synchronous; it may take ~100–300 ms — show the "Riding" state immediately and run
it in a `setTimeout(0)` so the button repaints), then `useSimPlayback` replays `result.frames` in real time
(`frame.t` drives it; `performance.now()` deltas; reduced motion ⇒ jump to the last frame and show the scrubber;
the scrubber is always available after a run). The stage gets the current `RunFrame`. Progress bar from `frame.s`.
Margin meter from `frame.cog`/`frame.support` (compute in `stabilityUi.tsx`, share with the stage). Remove every
import of the old `scene*`/`StabilityScene` from the lab (the sandbox keeps them). Keep files ≲ 400 lines.

## Rules that still apply
Reduced motion absolute (`useReducedMotion`), no particles, no spring easing, no timers that score, brand tokens,
TypeScript strict, `npm run build` (`PATH="/usr/lib/chatgpt/resources/cua_node/bin:$PATH"`) and `npx eslint src`
clean, copy from the rider's side, no exclamation marks, no emoji.
