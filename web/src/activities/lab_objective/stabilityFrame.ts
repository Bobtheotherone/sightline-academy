/* Frames without a simulation: the parked machine the learner sees before
 * Play, and the Free-tilt sandbox's swept poses. Built on the same sprite
 * anchors the stage renders from (stageSprites), so the machine sits on its
 * tyres instead of floating, and on the old quasi-static model for the CoG —
 * that maths is still the honest plumb line for a machine that is not moving.
 */
import type { FeedbackTone } from "../../components/FeedbackStrip";
import type { Scenario } from "./stabilityScenarios";
import type { BodyPose, RiderSetup, RunFrame, RunResult } from "./stabilityRun";
import { computeRear, computeSide, REAR_HALF_SUPPORT, SIDE_HALF_SUPPORT } from "./stabilityModel";
import { CARGO_SIZE, REAR_ANCHOR, SIDE_ANCHOR, toWorld } from "./stageSprites";

const DEG = Math.PI / 180;

/** Chassis origin height above the ground line, from the plates (metres). */
const CHASSIS_Y = { side: (459 - 250) * (1.25 / 545), rear: (692 - 373) * (1.1 / 656) };
/** The rider's pelvis rests this far from the plate's seat anchor. */
const PELVIS_OFFSET = { side: 0.085, rear: -0.1 };
/** Standing lifts the hips off the pad by this much. */
const STAND_LIFT = 0.12;
/** How far the hips can move along the machine: across it, or fore/aft. */
const REACH = { rear: 0.28, seated: 0.25, standing: 0.4 };

/** The steepest degree in the profile — its sign says climb or descent. */
export function dominantSlope(scenario: Scenario): number {
  return scenario.profile.reduce((worst, p) => (Math.abs(p.deg) > Math.abs(worst) ? p.deg : worst), 0);
}

/** Room the plumb line has left, 0..1, from a frame's CoG and contact span. */
export function marginOf(frame: Pick<RunFrame, "cog" | "support">): number {
  const half = (frame.support[1] - frame.support[0]) / 2;
  if (half <= 1e-4) return 0;
  const middle = (frame.support[0] + frame.support[1]) / 2;
  return Math.max(0, Math.min(1, (half - Math.abs(frame.cog.x - middle)) / half));
}

/**
 * A machine at rest on ground tilted by `slopeDeg`, in world metres.
 * Rear view: positive = the face falls toward +x (downhill right), the chassis
 * leans with it (angle −θ). Side view: positive = climbing toward +x (angle +θ);
 * negative = descending. `originX` puts the contact midpoint where the stage's
 * camera can see it.
 */
export function restFrame(
  view: "rear" | "side",
  slopeDeg: number,
  setup: RiderSetup,
  cargoAmount: number,
  originX = 0,
  originY = 0,
): RunFrame {
  const rear = view === "rear";
  const theta = (rear ? -slopeDeg : slopeDeg) * DEG; // chassis angle, CCW positive
  const ground = (p: { x: number; y: number }): { x: number; y: number } => ({
    x: originX + p.x * Math.cos(theta) - p.y * Math.sin(theta),
    y: originY + p.x * Math.sin(theta) + p.y * Math.cos(theta),
  });
  const chassis: BodyPose = { ...ground({ x: 0, y: CHASSIS_Y[view] }), angle: theta };

  const standing = setup.stance === "standing";
  const seat = rear ? REAR_ANCHOR.seat : SIDE_ANCHOR.seat;
  /* Positive lean is always toward the downhill side: +x across a face, and
   * toward whichever end of the machine the grade points on a climb or drop. */
  const downhill = rear ? 1 : slopeDeg < 0 ? 1 : -1;
  const reach = rear ? REACH.rear : standing ? REACH.standing : REACH.seated;
  const pelvisLocal = {
    x: seat.x + setup.lean * reach * downhill,
    y: seat.y + PELVIS_OFFSET[view] + (standing ? STAND_LIFT : 0),
  };
  const rider: BodyPose = { ...toWorld(chassis, pelvisLocal), angle: theta };

  const bodies: RunFrame["bodies"] = { chassis, rider };
  if (rear) {
    bodies.wheelLeft = { ...toWorld(chassis, { x: -REAR_HALF_SUPPORT, y: -CHASSIS_Y.rear + 0.28 }), angle: theta };
    bodies.wheelRight = { ...toWorld(chassis, { x: REAR_HALF_SUPPORT, y: -CHASSIS_Y.rear + 0.28 }), angle: theta };
  } else {
    bodies.wheelFront = { ...toWorld(chassis, SIDE_ANCHOR.wheelFront), angle: theta };
    bodies.wheelRear = { ...toWorld(chassis, SIDE_ANCHOR.wheelRear), angle: theta };
  }
  if (cargoAmount > 0.02) {
    const rack = rear ? REAR_ANCHOR.rack : SIDE_ANCHOR.rack;
    const boxH = CARGO_SIZE[view].h * (0.55 + 0.45 * cargoAmount);
    bodies.cargo = { ...toWorld(chassis, { x: rack.x, y: rack.y + boxH / 2 + 0.012 }), angle: theta };
  }

  /* The plumb maths: (d, h) are along-plane offset and height above the plane. */
  const phys = rear
    ? computeRear(slopeDeg, setup.lean, cargoAmount, setup.stance)
    : computeSide(slopeDeg, setup.lean, cargoAmount, setup.stance);
  const half = rear ? REAR_HALF_SUPPORT : SIDE_HALF_SUPPORT;
  const cog = ground({ x: phys.d, y: phys.h });
  const support: [number, number] = [ground({ x: -half, y: 0 }).x, ground({ x: half, y: 0 }).x];

  return {
    t: 0,
    s: 0,
    bodies,
    groundAngle: (rear ? slopeDeg : slopeDeg) * DEG,
    riderAttached: true,
    contacts: rear ? { left: true, right: true } : { front: true, rear: true },
    cog,
    support,
    eventActive: false,
  };
}

/** The setup preview: the rig at the head of the run, before anything tilts. */
export function previewFrame(scenario: Scenario, setup: RiderSetup): RunFrame {
  const deg = scenario.profile[0]?.deg ?? 0;
  const amount = scenario.cargoLocked ? (scenario.cargo ?? 0) : setup.cargo;
  return restFrame(scenario.view, deg, setup, amount, scenario.view === "side" ? 2.2 : 0);
}

/* ── Outcome copy ────────────────────────────────────────────────────────── */

const REASON_WORD: Record<"slid_downhill" | "loop_out" | "over_bars", string> = {
  slid_downhill: "Off the downhill side",
  loop_out: "Looped out off the back",
  over_bars: "Over the bars",
};

const ROLL_WORD: Record<"downhill" | "backwards" | "forwards", string> = {
  downhill: "Past the downhill tires",
  backwards: "Over backwards",
  forwards: "Over the front",
};

const pct = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 100);

export function readOutcome(
  scenario: Scenario,
  result: RunResult,
): { tone: FeedbackTone; label: string; md: string; fact: string } {
  const outcome = result.outcome;
  const along = (s: number) => `${pct(s)}% along the run`;
  if (outcome.kind === "clean") {
    const where =
      scenario.event && Math.abs(outcome.atS - scenario.event.s) <= 0.06
        ? `at the ${scenario.event.kind}`
        : along(outcome.atS);
    return {
      tone: "positive",
      label: "You made it",
      md: scenario.hints.clean,
      fact:
        outcome.minMargin < 0.08
          ? `You grazed the edge ${where} — thinnest margin under 8%.`
          : `Thinnest margin ${pct(outcome.minMargin)}% ${where}.`,
    };
  }
  /* The outcome carries where along the run it happened; the grade under the
   * machine at that moment comes off the deciding frame. */
  const failed = result.failIndex === null ? undefined : result.frames[result.failIndex];
  const where = failed
    ? `at ${Math.round(Math.abs(failed.groundAngle) / DEG)}°, ${along(outcome.atS)}`
    : along(outcome.atS);
  if (outcome.kind === "rollover") {
    return {
      tone: "risk",
      label: "The machine rolled",
      md: scenario.hints.rollover,
      fact: `${ROLL_WORD[outcome.direction]} ${where}.`,
    };
  }
  return {
    tone: "caution",
    label: "You came off",
    md: scenario.hints.riderOff,
    fact: `${REASON_WORD[outcome.reason]} ${where}.`,
  };
}
