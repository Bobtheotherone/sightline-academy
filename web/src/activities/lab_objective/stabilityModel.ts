/* Centre-of-gravity physics for the stability lab (SPEC-007 §11).
 *
 * Why a 2D plumb-line model and not a real vehicle-dynamics solve: the lesson
 * is the SHAPE of the envelope — how slope, where the rider puts their weight,
 * standing versus seated, and a load on the rack all walk the combined centre
 * of gravity toward a support edge. Once the plumb line leaves the wheels the
 * machine is going over, and that is the whole idea we need to land. Masses are
 * shares of the base system rather than kilograms because only the ratios move
 * the plumb line; the numbers are illustrative and the lab says so out loud.
 *
 * Both views share one screen convention: +x is screen right. Rear view, +x is
 * downhill. Side view, +x is the front of the machine.
 */

/** Mass shares of the base rider+machine system. */
const MACHINE_MASS = 0.68;
const RIDER_MASS = 0.32;
/** Extra mass at full cargo, as a share of the base system. */
const CARGO_MASS_FULL = 0.18;

/** CoG heights above the ground plane (concept metres). */
const H_MACHINE = 0.66;
const H_RIDER_SEATED = 1.2;
/* Standing puts the weight on the pegs: the rider's mass rides at hip height
 * instead of chest height, which is the single biggest thing a rider can do
 * about a high CoG — hence the lesson line "CoG sits high, especially with a
 * seated rider". */
const H_RIDER_STANDING = 0.95;
const H_CARGO = 0.85;

/* Standing also frees the hips, so the same slider moves the rider's weight
 * half again as far off the machine's centreline. This is the "active riding"
 * half of the stance choice: lower AND further, in whichever direction helps. */
const STANDING_LEAN_AUTHORITY = 1.5;

/** Rear view: half of the support width (track incl. contact patch). */
export const REAR_HALF_SUPPORT = 0.46;
/** Full-lean lateral shift of the rider CoG (rear view). */
const LEAN_SHIFT_REAR = 0.28;

/** Side view: half of the support length (wheelbase incl. contact patch). */
export const SIDE_HALF_SUPPORT = 0.7;
const MACHINE_X_SIDE = 0.02;
const RIDER_X_SIDE = -0.05;
const CARGO_X_SIDE = -0.62;
/* Full-lean fore/aft shift of the rider CoG (side view). Half again the
 * sideways figure, because there is far more machine to move along than
 * across: chest over the bars at one end, backside off the back of the seat at
 * the other. Anything smaller would not show against a wheelbase this long,
 * which is also why fore/aft mistakes feel survivable right up until they
 * are not. */
const LEAN_SHIFT_SIDE = 0.42;

/* Fore/aft lean is defined as "into the hill", so which way it points along +x
 * depends on the sign of the grade — forward on a climb, back on a descent.
 * Flipping that at exactly 0° would make the plumb line jump a hand's width in
 * one frame as a run rolls over a crest, so the direction ramps across this
 * band instead. On genuinely flat ground there is no hill to lean into and the
 * slider has nothing to bite on, which is the honest answer anyway. */
const LEAN_SIGN_BAND_DEG = 4;

/** Torso angle per unit lean (degrees) — how far the body actually rotates. */
const BODY_ANGLE_PER_LEAN_REAR = 24;
const BODY_ANGLE_PER_LEAN_SIDE = 18;

const DEG = Math.PI / 180;

export type Stance = "seated" | "standing";

export interface StabilityState {
  /** Combined CoG offset along the ground plane (m, +x: rear = downhill, side = front). */
  d: number;
  /** Combined CoG height above the ground plane (m). */
  h: number;
  /** Where the CoG plumb line meets the ground plane (m from support centre, +x). */
  xInt: number;
  /** (half − |xInt|)/half — distance to the NEARER edge; ≤ 0 means past an edge. */
  margin: number;
  /** Which edge the plumb line is nearest to, or has crossed. */
  edge: "downhill" | "uphill" | "front" | "rear";
}

function combinedMass(cargo: number): number {
  return 1 + CARGO_MASS_FULL * cargo;
}

function combinedHeight(cargo: number, stance: Stance): number {
  const hRider = stance === "standing" ? H_RIDER_STANDING : H_RIDER_SEATED;
  return (
    (MACHINE_MASS * H_MACHINE + RIDER_MASS * hRider + CARGO_MASS_FULL * cargo * H_CARGO) /
    combinedMass(cargo)
  );
}

function leanReach(base: number, stance: Stance): number {
  return stance === "standing" ? base * STANDING_LEAN_AUTHORITY : base;
}

/* One margin for every view and every direction: how far the plumb line still
 * has to travel to reach whichever edge it is closest to, as a fraction of the
 * half-support. Signless on purpose — a descent tips over the front and a climb
 * over the back, and the meter should read the same in both cases. */
function marginTo(xInt: number, half: number): number {
  return (half - Math.abs(xInt)) / half;
}

/**
 * Rear view — side-slope. Downhill is +x (screen right). `lean` −1..1 with
 * negative = uphill; `cargo` 0..1 sits centred on the rack, adding mass high up.
 */
export function computeRear(
  slopeDeg: number,
  lean: number,
  cargo: number,
  stance: Stance = "seated",
): StabilityState {
  const t = Math.tan(slopeDeg * DEG);
  const h = combinedHeight(cargo, stance);
  const d = (RIDER_MASS * lean * leanReach(LEAN_SHIFT_REAR, stance)) / combinedMass(cargo);
  const xInt = d + h * t;
  return {
    d,
    h,
    xInt,
    margin: marginTo(xInt, REAR_HALF_SUPPORT),
    edge: xInt >= 0 ? "downhill" : "uphill",
  };
}

/**
 * Side view — grade. Front is +x (screen right); positive `slope` is a climb,
 * negative a descent. Cargo rides the rear rack, which is ballast on a descent
 * and the thing that lifts your front wheels on a climb.
 */
export function computeSide(
  slopeDeg: number,
  lean: number,
  cargo: number,
  stance: Stance = "seated",
): StabilityState {
  const t = Math.tan(slopeDeg * DEG);
  const h = combinedHeight(cargo, stance);
  /* Downhill along +x: the tail of the machine on a climb, the nose on a
   * descent. Positive lean is always away from the hill, so this is what makes
   * one slider read correctly in both directions. */
  const downhillX = Math.max(-1, Math.min(1, -slopeDeg / LEAN_SIGN_BAND_DEG));
  const riderX = RIDER_X_SIDE + lean * leanReach(LEAN_SHIFT_SIDE, stance) * downhillX;
  const d =
    (MACHINE_MASS * MACHINE_X_SIDE + RIDER_MASS * riderX + CARGO_MASS_FULL * cargo * CARGO_X_SIDE) /
    combinedMass(cargo);
  const xInt = d - h * t;
  return {
    d,
    h,
    xInt,
    margin: marginTo(xInt, SIDE_HALF_SUPPORT),
    edge: xInt <= 0 ? "rear" : "front",
  };
}

/**
 * Rider torso angle from TRUE vertical on screen, degrees, positive = toward
 * downhill. Used by the rider-off rule and by the scene to draw the torso.
 *
 * Sign convention — "downhill" is a direction on screen, and it is not always
 * the same one:
 *   rear view          downhill is +x (screen right)
 *   side view, climb   downhill is −x (the tail of the machine)
 *   side view, descent downhill is +x (the nose)
 * So the scene draws a clockwise rotation of `bodyAngle * downhillSign`, where
 * downhillSign is +1 for the rear view, −1 on a side climb and +1 on a side
 * descent. That is why the grade term is |slope|: a rider sitting square to the
 * ground is tilted toward the valley by the grade whichever way they are
 * pointing, and lean adds to that in the same signed sense (positive = away
 * from the hill). Standing lean authority multiplies the physics, not the drawn
 * angle — a standing rider reaches further out without folding further over.
 */
export function riderBodyAngle(view: "rear" | "side", slopeDeg: number, lean: number): number {
  return view === "rear"
    ? slopeDeg + lean * BODY_ANGLE_PER_LEAN_REAR
    : Math.abs(slopeDeg) + lean * BODY_ANGLE_PER_LEAN_SIDE;
}
