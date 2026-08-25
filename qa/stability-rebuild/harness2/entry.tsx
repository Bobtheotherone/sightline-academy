/* Harness entry: hand-made RunFrames -> StabilityStage -> static HTML. */
import { renderToStaticMarkup } from "react-dom/server";
import { StabilityStage } from "/home/rnmercado/Projects/Sightline_Saftey_Academy/web/src/activities/lab_objective/StabilityStage";
import { SCENARIOS, type Scenario } from "/home/rnmercado/Projects/Sightline_Saftey_Academy/web/src/activities/lab_objective/stabilityScenarios";
import type { BodyPose, RiderSetup, RunFrame } from "/home/rnmercado/Projects/Sightline_Saftey_Academy/web/src/activities/lab_objective/stabilityRun";
import {
  SIDE_ANCHOR,
  REAR_ANCHOR,
  toWorld,
} from "/home/rnmercado/Projects/Sightline_Saftey_Academy/web/src/activities/lab_objective/stageSprites";
import {
  RUN_LENGTH,
  gradeDegAt,
  sideProfileY,
} from "/home/rnmercado/Projects/Sightline_Saftey_Academy/web/src/activities/lab_objective/stageTerrain";

const S = (id: string) => SCENARIOS.find((s) => s.id === id) as Scenario;
const RAD = Math.PI / 180;
const CHASSIS_H = 0.47932; // bodyCentre above the ground line, metres
const REAR_H = 0.535;

const rot = (p: { x: number; y: number }, a: number) => ({
  x: p.x * Math.cos(a) - p.y * Math.sin(a),
  y: p.x * Math.sin(a) + p.y * Math.cos(a),
});

interface SideOpts {
  lean?: number;
  stance?: "seated" | "standing";
  cargo?: number;
  extraPitch?: number;
  riderRot?: number;
  riderBack?: number;
  attached?: boolean;
  frontContact?: boolean;
  rearContact?: boolean;
  eventActive?: boolean;
}

function sideFrame(sc: Scenario, x: number, o: SideOpts = {}): { frame: RunFrame; setup: RiderSetup } {
  const grade = gradeDegAt(sc, x / RUN_LENGTH) * RAD;
  const pitch = grade + (o.extraPitch ?? 0);
  const surf = { x, y: sideProfileY(sc, x) };
  const up = rot({ x: 0, y: CHASSIS_H }, pitch);
  const chassis: BodyPose = { x: surf.x + up.x, y: surf.y + up.y, angle: pitch };
  const wf = toWorld(chassis, SIDE_ANCHOR.wheelFront);
  const wr = toWorld(chassis, SIDE_ANCHOR.wheelRear);
  const lean = o.lean ?? 0;
  const stance = o.stance ?? "seated";
  const hipLocal = {
    x: SIDE_ANCHOR.seat.x - lean * 0.25 - (o.riderBack ?? 0),
    y: SIDE_ANCHOR.seat.y + 0.085 + (stance === "standing" ? 0.16 : 0),
  };
  const hip = toWorld(chassis, hipLocal);
  const rider: BodyPose = { x: hip.x, y: hip.y, angle: pitch + (o.riderRot ?? 0) };
  const boxH = 0.3 * (0.55 + 0.45 * (o.cargo ?? 0));
  const rackLocal = { x: SIDE_ANCHOR.rack.x, y: SIDE_ANCHOR.rack.y + boxH / 2 + 0.012 };
  const rk = toWorld(chassis, rackLocal);
  const cog = {
    x: chassis.x - Math.sin(pitch) * 0.16 + (rider.x - chassis.x) * 0.28,
    y: chassis.y + 0.16 + (rider.y - chassis.y) * 0.28,
  };
  return {
    setup: { lean, cargo: o.cargo ?? 0, stance },
    frame: {
      t: 1,
      s: x / RUN_LENGTH,
      bodies: {
        chassis,
        wheelFront: { ...wf, angle: -x / SIDE_ANCHOR.wheelR },
        wheelRear: { ...wr, angle: -x / SIDE_ANCHOR.wheelRRear },
        rider,
        cargo: { ...rk, angle: pitch },
      },
      groundAngle: grade,
      riderAttached: o.attached !== false,
      contacts: { front: o.frontContact !== false, rear: o.rearContact !== false },
      cog,
      support: [wr.x, wf.x],
      eventActive: !!o.eventActive,
    },
  };
}

interface RearOpts {
  lean?: number;
  stance?: "seated" | "standing";
  cargo?: number;
  rollDeg?: number;
  riderRot?: number;
  riderOut?: number;
  attached?: boolean;
  eventActive?: boolean;
}

function rearFrame(sc: Scenario, groundDeg: number, o: RearOpts = {}): { frame: RunFrame; setup: RiderSetup } {
  const ga = groundDeg * RAD;
  const phi = -ga;
  const n = rot({ x: 0, y: REAR_H }, phi);
  let chassis: BodyPose = { x: n.x, y: n.y, angle: phi };
  const contactR0 = toWorld(chassis, REAR_ANCHOR.contactR);
  if (o.rollDeg) {
    const a = -o.rollDeg * RAD;
    const d = { x: chassis.x - contactR0.x, y: chassis.y - contactR0.y };
    const r = rot(d, a);
    chassis = { x: contactR0.x + r.x, y: contactR0.y + r.y, angle: chassis.angle + a };
  }
  const lean = o.lean ?? 0;
  const stance = o.stance ?? "seated";
  const hipLocal = {
    x: REAR_ANCHOR.seat.x + lean * 0.28 + (o.riderOut ?? 0),
    y: REAR_ANCHOR.seat.y - 0.1 + (stance === "standing" ? 0.16 : 0),
  };
  const hip = toWorld(chassis, hipLocal);
  const rider: BodyPose = { x: hip.x, y: hip.y, angle: chassis.angle + (o.riderRot ?? 0) };
  const boxH = 0.28 * (0.55 + 0.45 * (o.cargo ?? 0));
  const rk = toWorld(chassis, { x: REAR_ANCHOR.rack.x, y: REAR_ANCHOR.rack.y + boxH / 2 + 0.012 });
  const cl = toWorld(chassis, REAR_ANCHOR.contactL);
  const cr = toWorld(chassis, REAR_ANCHOR.contactR);
  const cog = {
    x: chassis.x + (rider.x - chassis.x) * 0.32,
    y: chassis.y + 0.1 + (rider.y - chassis.y) * 0.32,
  };
  return {
    setup: { lean, cargo: o.cargo ?? 0, stance },
    frame: {
      t: 1,
      s: 0.6,
      bodies: { chassis, rider, cargo: rk },
      groundAngle: ga,
      riderAttached: o.attached !== false,
      contacts: { left: true, right: true },
      cog,
      support: [cl.x, cr.x],
      eventActive: !!o.eventActive,
    },
  };
}

const CASES: Array<{ id: string; scenario: Scenario; made: { frame: RunFrame; setup: RiderSetup } }> = [
  { id: "01-side-flat-seated", scenario: S("descent"), made: sideFrame(S("descent"), 0.4, { cargo: 0 }) },
  {
    id: "02-side-flat-standing-cargo",
    scenario: S("haul"),
    made: sideFrame(S("haul"), 0.6, { cargo: 1, stance: "standing" }),
  },
  {
    id: "03-side-climb24-front-up",
    scenario: S("haul"),
    made: sideFrame(S("haul"), 9, {
      cargo: 1,
      lean: -0.4,
      extraPitch: 12 * RAD,
      riderRot: 0.16,
      frontContact: false,
      eventActive: true,
    }),
  },
  { id: "04-side-descent26", scenario: S("descent"), made: sideFrame(S("descent"), 7.8, { cargo: 0.4, lean: 0.5, riderRot: 0.1 }) },
  {
    id: "05-side-rider-detached",
    scenario: S("haul"),
    made: sideFrame(S("haul"), 9, {
      cargo: 1,
      extraPitch: 18 * RAD,
      riderRot: 70 * RAD,
      riderBack: 0.8,
      attached: false,
      frontContact: false,
    }),
  },
  { id: "06-rear-flat", scenario: S("traverse"), made: rearFrame(S("traverse"), 0) },
  { id: "07-rear-26-lean", scenario: S("traverse"), made: rearFrame(S("traverse"), 26, { lean: -0.6, eventActive: true }) },
  {
    id: "08-rear-standing",
    scenario: S("traverse"),
    made: rearFrame(S("traverse"), 26, { lean: -0.4, stance: "standing" }),
  },
  { id: "09-rear-rollover", scenario: S("shortcut"), made: rearFrame(S("shortcut"), 34, { rollDeg: 60, riderRot: 0.1 }) },
  {
    id: "10-rear-rider-detached",
    scenario: S("shortcut"),
    made: rearFrame(S("shortcut"), 40, {
      lean: 0.6,
      riderOut: 0.55,
      riderRot: -0.9,
      attached: false,
      eventActive: true,
    }),
  },
];

const TOKENS = `:root{--ts-pine-950:#0D1E2E;--ts-pine-700:#2F6B52;--ts-pine-300:#ABCDB8;--ts-moss-100:#ECF3EF;--ts-paper-0:#F9FCFA;--ts-clay-500:#B5446E;--ts-sun-400:#DBA12E;--ts-danger-600:#A93226;--ts-ink-500:#46555A;--ts-line-200:#D6DFDA;--ts-font-mono:ui-monospace,monospace}
*{box-sizing:border-box}body{margin:0;background:#fff;font-family:system-ui,sans-serif}
.cell{width:960px;padding:0 0 6px}
.cell h2{font:600 13px/1.4 ui-monospace,monospace;color:#0D1E2E;margin:8px 0 4px}
svg{outline:1px solid #D6DFDA}`;

const html = `<!doctype html><meta charset="utf-8"><style>${TOKENS}</style><body>${CASES.map(
  (c) =>
    `<div class="cell" id="${c.id}"><h2>${c.id}</h2>${renderToStaticMarkup(
      <StabilityStage
        scenario={c.scenario}
        frame={c.made.frame}
        setup={c.made.setup}
        showPlumb
        ariaLabel={c.id}
      />,
    )}</div>`,
).join("")}</body>`;

process.stdout.write(html);
