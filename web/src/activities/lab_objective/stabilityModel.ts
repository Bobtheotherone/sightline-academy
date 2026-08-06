/* Concept physics for the stability explorer (SPEC-007 §11): a deliberately
 * simple 2D model — machine mass fixed low, rider mass movable, cargo raising
 * and shifting the combined CoG. Constants are illustrative, tuned so every
 * objective is reachable inside the slider ranges; the lab's "About this
 * model" popover says exactly that. Not an operating chart.
 */

/** Mass shares of the base rider+machine system. */
const MACHINE_MASS = 0.68;
const RIDER_MASS = 0.32;
/** Extra mass at full cargo, as a share of the base system. */
const CARGO_MASS_FULL = 0.18;

/** CoG heights above the ground plane (concept metres). */
const H_MACHINE = 0.66;
const H_RIDER = 1.2;
const H_CARGO = 0.85;

/** Rear view: half of the support width (track incl. contact patch). */
export const REAR_HALF_SUPPORT = 0.46;
/** Full-lean lateral shift of the rider CoG (rear view). */
const LEAN_SHIFT_REAR = 0.28;

/** Side view: half of the support length (wheelbase incl. contact patch). */
export const SIDE_HALF_SUPPORT = 0.7;
const MACHINE_X_SIDE = 0.02;
const RIDER_X_SIDE = -0.05;
const CARGO_X_SIDE = -0.62;
/** Full-lean fore/aft shift of the rider CoG (side view; uphill = forward). */
const LEAN_SHIFT_SIDE = 0.22;

export interface StabilityState {
  /** Combined CoG offset along the ground plane (m, toward downhill +). */
  d: number;
  /** Combined CoG height above the ground plane (m). */
  h: number;
  /** Where the CoG plumb line meets the ground plane (m from support centre). */
  xInt: number;
  /** Fraction of the support half-width remaining; ≤ 0 means past the edge. */
  margin: number;
}

/**
 * Rear view — side-slope. Downhill is +x (screen right). `lean` −1..1 with
 * negative = uphill; `cargo` 0..1 sits centred, raising the combined CoG.
 */
export function computeRear(slopeDeg: number, lean: number, cargo: number): StabilityState {
  const t = Math.tan((slopeDeg * Math.PI) / 180);
  const m = 1 + CARGO_MASS_FULL * cargo;
  const h =
    (MACHINE_MASS * H_MACHINE + RIDER_MASS * H_RIDER + CARGO_MASS_FULL * cargo * H_CARGO) / m;
  const d = (RIDER_MASS * lean * LEAN_SHIFT_REAR) / m;
  const xInt = d + h * t;
  return { d, h, xInt, margin: (REAR_HALF_SUPPORT - xInt) / REAR_HALF_SUPPORT };
}

/**
 * Side view — uphill grade, front is +x (screen right), downhill is the rear.
 * Cargo rides the rear rack; uphill lean shifts the rider forward.
 */
export function computeSide(slopeDeg: number, lean: number, cargo: number): StabilityState {
  const t = Math.tan((slopeDeg * Math.PI) / 180);
  const m = 1 + CARGO_MASS_FULL * cargo;
  const h =
    (MACHINE_MASS * H_MACHINE + RIDER_MASS * H_RIDER + CARGO_MASS_FULL * cargo * H_CARGO) / m;
  const d =
    (MACHINE_MASS * MACHINE_X_SIDE +
      RIDER_MASS * (RIDER_X_SIDE + -lean * LEAN_SHIFT_SIDE) +
      CARGO_MASS_FULL * cargo * CARGO_X_SIDE) /
    m;
  const xInt = d - h * t;
  return { d, h, xInt, margin: (xInt + SIDE_HALF_SUPPORT) / SIDE_HALF_SUPPORT };
}
