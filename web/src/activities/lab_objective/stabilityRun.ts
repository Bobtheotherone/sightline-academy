/* Rigid-body run for the stability game (SPEC-007 §11, take two).
 *
 * `runScenario` builds a matter-js world in stabilityWorld.ts, steps it at a
 * fixed 1/120 s and records a frame every 1/60 s. Nothing is tweened and no
 * formula decides how a run ends: the machine rolls when its chassis passes 75
 * degrees off the ground it is standing on, the rider comes off when the seat
 * joint stretches past what a rider can hold, and a run is clean when the
 * machine crosses the end of the run upright with the rider still aboard.
 *
 * Same scenario and setup in, identical frames out — no clocks, no randomness.
 */
import { createWorld, profileDeg } from "./stabilityWorld";
import type { Scenario } from "./stabilityScenarios";

export type BodyId =
  | "chassis"
  | "wheelFront"
  | "wheelRear"
  | "wheelLeft"
  | "wheelRight"
  | "rider"
  | "riderLegs"
  | "cargo";

/** Metres and radians, y UP — the renderer flips to screen space. */
export interface BodyPose {
  x: number;
  y: number;
  angle: number;
}

export interface RunFrame {
  /** Seconds since the run started. */
  t: number;
  /** 0..1 progress along the run. */
  s: number;
  bodies: Partial<Record<BodyId, BodyPose>>;
  /** Rear view: tilt of the ground plane (rad, +ve = downhill toward +x). Side view: local grade under the chassis. */
  groundAngle: number;
  /** False once the rider's seat joint has broken. */
  riderAttached: boolean;
  contacts: { front?: boolean; rear?: boolean; left?: boolean; right?: boolean };
  /** Composite centre of gravity of everything still attached, metres. */
  cog: { x: number; y: number };
  /** Ground-plane x of the two outer contact patches, metres (plumb overlay). */
  support: [number, number];
  eventActive: boolean;
}

export type Outcome =
  | { kind: "clean"; minMargin: number; atS: number }
  | { kind: "rollover"; atS: number; direction: "downhill" | "backwards" | "forwards" }
  | { kind: "riderOff"; atS: number; reason: "slid_downhill" | "loop_out" | "over_bars" };

export interface RunResult {
  frames: RunFrame[];
  outcome: Outcome;
  /** Index of the frame where the outcome was decided, or null on a clean run. */
  failIndex: number | null;
  /** Seconds between recorded frames. */
  dt: number;
}

export interface RiderSetup {
  /** −1..1, negative = into the hill. */
  lean: number;
  /** 0..1 rear-rack load. */
  cargo: number;
  stance: "seated" | "standing";
}

const FRAME_DT = 1 / 60;
const STEPS_PER_FRAME = 2;
const ROLL_LIMIT = (75 * Math.PI) / 180;
/* "Crosses the run end upright" has to mean upright. A machine that reaches the
 * finish already past its tipping point, leaning off the ground it is on with
 * the plumb line outside its tyres, has not got away with anything — it is
 * mid-rollover and the clock happened to run out first. Those runs keep going
 * until the physics says how they end. */
const UPRIGHT = (20 * Math.PI) / 180;
const SETTLE_S = 1.2; // keep filming after it goes wrong
const RUN_OUT_S = 0.8; // and after it goes right
const MAX_S = 12;
/* The margin is reported as the thinnest the plumb line got, averaged over a
 * quarter second. A wheel skipping over a rock takes the instantaneous number
 * to zero for two frames without the machine ever being near going over, and
 * that is not the gap the lesson is about. */
const MARGIN_WINDOW = 15;
/* And a run whose plumb line has been outside the contact patches for this long
 * is not a run that got away with it. The machine is past the point its own
 * weight can be brought back over the tyres; that it has not yet passed 75
 * degrees only means it is on its way there. */
const OUTSIDE_S = 1.3;

/** Signed room, negative once the centre of gravity is outside the patches. */
function rawMargin(frame: Pick<RunFrame, "cog" | "support">): number {
  const half = (frame.support[1] - frame.support[0]) / 2;
  if (half <= 1e-4) return -1;
  return (half - Math.abs(frame.cog.x - (frame.support[0] + frame.support[1]) / 2)) / half;
}

/**
 * How much room the plumb line has left: 1 when the centre of gravity is over
 * the middle of the contact patches, 0 when it reaches one of them.
 */
export function plumbMargin(frame: Pick<RunFrame, "cog" | "support">): number {
  const half = (frame.support[1] - frame.support[0]) / 2;
  if (half <= 1e-4) return 0;
  const middle = (frame.support[0] + frame.support[1]) / 2;
  return Math.max(0, Math.min(1, (half - Math.abs(frame.cog.x - middle)) / half));
}

/** Deterministic and synchronous: same scenario + setup ⇒ identical frames. */
export function runScenario(scenario: Scenario, setup: RiderSetup): RunResult {
  const world = createWorld(scenario, setup);
  const rear = scenario.view === "rear";
  const climbing = profileDeg(scenario, 0.6) >= 0;

  const frames: RunFrame[] = [];
  let outcome: Outcome | null = null;
  let failIndex: number | null = null;
  let minMargin = 1;
  let outside = 0;
  const recent: number[] = [];
  let stopAt = MAX_S;

  for (;;) {
    const now = world.time;
    const s = world.sample();
    frames.push({
      t: Math.round(now * 1e6) / 1e6,
      s: s.s,
      bodies: s.bodies,
      groundAngle: s.groundAngle,
      riderAttached: s.riderAttached,
      contacts: s.contacts,
      cog: s.cog,
      support: s.support,
      eventActive: s.eventActive,
    });

    if (!outcome) {
      outside = rawMargin(s) < 0 ? outside + FRAME_DT : 0;
      recent.push(plumbMargin(s));
      if (recent.length > MARGIN_WINDOW) recent.shift();
      if (recent.length === MARGIN_WINDOW) {
        minMargin = Math.min(minMargin, recent.reduce((a, b) => a + b, 0) / MARGIN_WINDOW);
      }
      if (!s.riderAttached) {
        outcome = {
          kind: "riderOff",
          atS: s.s,
          reason: rear
            ? "slid_downhill"
            : climbing && s.breakX < 0
              ? "loop_out"
              : !climbing && s.breakX > 0
                ? "over_bars"
                : "slid_downhill",
        };
      } else if (Math.abs(s.tilt) > ROLL_LIMIT || outside > OUTSIDE_S) {
        outcome = {
          kind: "rollover",
          atS: s.s,
          direction: rear ? "downhill" : s.tilt > 0 ? "backwards" : "forwards",
        };
      } else if (s.atEnd && Math.abs(s.tilt) < UPRIGHT && plumbMargin(s) > 0) {
        outcome = { kind: "clean", minMargin, atS: s.s };
        stopAt = Math.min(MAX_S, now + RUN_OUT_S);
      }
      if (outcome && outcome.kind !== "clean") {
        failIndex = frames.length - 1;
        stopAt = Math.min(MAX_S, now + SETTLE_S);
      }
    }

    if (now >= stopAt - 1e-9) break;
    for (let i = 0; i < STEPS_PER_FRAME; i++) world.step();
  }

  /* Out of time without an answer: if it is still on its feet call it clean,
   * and if it is not, call it what it plainly is. */
  const last = world.sample();
  const ran = outcome ?? {
    ...(Math.abs(last.tilt) >= UPRIGHT
      ? {
          kind: "rollover" as const,
          atS: last.s,
          direction: rear ? ("downhill" as const) : last.tilt > 0 ? ("backwards" as const) : ("forwards" as const),
        }
      : { kind: "clean" as const, minMargin, atS: last.s }),
  };
  if (outcome === null && ran.kind !== "clean") failIndex = frames.length - 1;

  return {
    frames,
    outcome: ran,
    failIndex,
    dt: FRAME_DT,
  };
}
