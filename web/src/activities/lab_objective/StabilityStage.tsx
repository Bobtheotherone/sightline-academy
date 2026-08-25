/* The stability stage: one `RunFrame`, drawn.
 *
 * Nothing here decides anything. The simulation hands over body poses in metres
 * (y up) and the stage puts the painted plates and the rider on them, then lays
 * the plumb overlay over the top in screen space so the vertical stays vertical
 * however far the machine has gone over.
 *
 * World group: `translate(tx, ty) scale(S, -S)` — inside it, one unit is one
 * metre and y is up. Screen space is the plain 480 × 300 viewBox.
 * Camera: side view follows the chassis, machine a third from the left, clamped
 * to the run; rear view is fixed and only gives way once a tumble leaves frame.
 */
import { useId } from "react";
import type { BodyPose, RiderSetup, RunFrame } from "./stabilityRun";
import type { Scenario } from "./stabilityScenarios";
import {
  AtvRearBody,
  AtvSideBody,
  AtvSideWheel,
  CARGO_SIZE,
  CargoBox,
  RiderRear,
  RiderSide,
  REAR_ANCHOR,
  SIDE_ANCHOR,
  S,
  toWorld,
} from "./stageSprites";
import { RUN_LENGTH, RearGround, SideTerrain, SkyBand, groundYAt } from "./stageTerrain";

export interface StabilityStageProps {
  scenario: Scenario;
  frame: RunFrame;
  setup: RiderSetup;
  showPlumb?: boolean;
  ariaLabel: string;
}

const VB_W = 480;
const VB_H = 300;
/** Where the chassis sits on screen in the side view: a third from the left. */
const SIDE_HOLD = { x: 160, y: 196 };
/** Where the chassis sits on screen in the rear view. */
const REAR_HOLD = { x: 240, y: 176 };
/** Chassis position on level ground in the rear view, metres. */
const REAR_NEUTRAL = { x: 0, y: 0.535 };
/** How far the machine may wander before the rear camera gives way, metres. */
const REAR_SLACK = 0.35;
const DANGER = 0.15;

const num = (v: number | undefined, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const f = (v: number) => (Number.isFinite(v) ? v : 0).toFixed(2);

const REAR_RACK = { x: 0, y: 0.3941 };

/** Rear view is fixed until the machine leaves a small circle around where it
 * sits on level ground — then the camera goes with it, so a tumble keeps its
 * ground. */
function rearCam(focus: { x: number; y: number }) {
  const dx = focus.x - REAR_NEUTRAL.x;
  const dy = focus.y - REAR_NEUTRAL.y;
  const r = Math.hypot(dx, dy);
  const k = r > REAR_SLACK ? (r - REAR_SLACK) / r : 0;
  return { x: REAR_NEUTRAL.x + dx * k, y: REAR_NEUTRAL.y + dy * k };
}

const FALLBACK: BodyPose = { x: 0, y: 0.5, angle: 0 };
const pose = (frame: RunFrame, id: keyof RunFrame["bodies"]): BodyPose | undefined => {
  const p = frame.bodies?.[id];
  if (!p) return undefined;
  return { x: num(p.x), y: num(p.y), angle: num(p.angle) };
};

/** Support half-width minus the plumb's offset from its centre, 0..1. */
export function plumbMargin(cogX: number, support: [number, number]): number {
  const a = Math.min(support[0], support[1]);
  const b = Math.max(support[0], support[1]);
  const half = (b - a) / 2;
  if (!(half > 1e-4)) return 0;
  return clamp((half - Math.abs(cogX - (a + b) / 2)) / half, 0, 1);
}

/* ── Plumb overlay ────────────────────────────────────────────────────────── */

interface OverlayProps {
  scenario: Scenario;
  frame: RunFrame;
  toScreen: (x: number, y: number) => { x: number; y: number };
}

/** CoG, its true vertical, the support span and the edge it is running out of —
 * all screen space, so the dashed line is plumb whatever the ground is doing. */
function PlumbOverlay({ scenario, frame, toScreen }: OverlayProps) {
  const cogX = num(frame.cog?.x);
  const cogY = num(frame.cog?.y, 0.6);
  const raw = frame.support ?? [0, 0];
  const a = Math.min(num(raw[0]), num(raw[1]));
  const b = Math.max(num(raw[0]), num(raw[1]));
  if (!(b - a > 1e-3)) return null;
  const ga = num(frame.groundAngle);
  const gy = (x: number) => groundYAt(scenario, ga, x);
  const A = toScreen(a, gy(a));
  const B = toScreen(b, gy(b));
  const C = toScreen(cogX, cogY);
  const G = toScreen(cogX, gy(cogX));
  const margin = plumbMargin(cogX, [a, b]);
  const danger = margin <= DANGER;
  const line = danger ? "var(--ts-danger-600)" : "var(--ts-pine-950)";
  const len = Math.hypot(B.x - A.x, B.y - A.y) || 1;
  const nx = -((B.y - A.y) / len);
  const ny = (B.x - A.x) / len;
  const off = ny >= 0 ? 15 : -15;
  const bar = (p: { x: number; y: number }) => ({ x: p.x + nx * off, y: p.y + ny * off });
  const A2 = bar(A);
  const B2 = bar(B);
  const nearB = Math.abs(cogX - b) < Math.abs(cogX - a);
  const edge = nearB ? B : A;
  const tag = C.x >= VB_W / 2 ? C.x - 44 : C.x + 13;
  return (
    <g data-stage="plumb" data-danger={danger ? "1" : "0"}>
      <g stroke="var(--ts-pine-700)" strokeWidth={3.5} strokeLinecap="round" fill="none">
        <path d={`M${f(A2.x)} ${f(A2.y)} L${f(B2.x)} ${f(B2.y)}`} />
        <path d={`M${f(A2.x)} ${f(A2.y)} L${f(A.x)} ${f(A.y)}`} strokeWidth={2.2} />
        <path d={`M${f(B2.x)} ${f(B2.y)} L${f(B.x)} ${f(B.y)}`} strokeWidth={2.2} />
      </g>
      <path
        d={`M${f(edge.x)} ${f(edge.y + 2)} l7 12 h-14 Z`}
        fill={danger ? "var(--ts-danger-600)" : "var(--ts-clay-500)"}
        stroke="var(--ts-pine-950)"
        strokeWidth={1.25}
      />
      <line x1={C.x} y1={C.y} x2={G.x} y2={G.y} stroke="var(--ts-paper-0)" strokeWidth={4} opacity={0.75} />
      <line
        x1={C.x}
        y1={C.y}
        x2={G.x}
        y2={G.y}
        stroke={line}
        strokeWidth={2}
        strokeDasharray="5 4"
        opacity={danger ? 0.95 : 0.75}
      />
      <circle cx={G.x} cy={G.y} r={4} fill={line} stroke="var(--ts-paper-0)" strokeWidth={1.5} />
      <rect x={tag} y={C.y - 8} width={31} height={16} rx={5} fill="var(--ts-paper-0)" stroke="var(--ts-line-200)" strokeWidth={1} />
      <text
        x={tag + 15.5}
        y={C.y + 4}
        fontSize={11}
        fill="var(--ts-pine-950)"
        textAnchor="middle"
        style={{ fontFamily: "var(--ts-font-mono)" }}
      >
        CoG
      </text>
      <circle cx={C.x} cy={C.y} r={7.5} fill="var(--ts-clay-500)" stroke="var(--ts-pine-950)" strokeWidth={1.5} />
      <path d={`M${f(C.x - 7.5)} ${f(C.y)} h15 M${f(C.x)} ${f(C.y - 7.5)} v15`} stroke="var(--ts-pine-950)" strokeWidth={1.5} />
    </g>
  );
}

/* ── Contact patches ──────────────────────────────────────────────────────── */

/** A flat shadow under each wheel the frame says is loaded — the cheapest cue
 * that the front has come off the ground on a climb. */
function Contacts({ pts }: { pts: Array<{ x: number; y: number }> }) {
  return (
    <g data-stage="contacts" fill="#0D1E2E" opacity={0.13}>
      {pts.map((p, i) => (
        <ellipse key={i} cx={p.x} cy={p.y} rx={0.16} ry={0.03} />
      ))}
    </g>
  );
}

/* ── Stage ────────────────────────────────────────────────────────────────── */

export function StabilityStage({ scenario, frame, setup, showPlumb = true, ariaLabel }: StabilityStageProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const side = scenario.view === "side";
  const chassis = pose(frame, "chassis") ?? FALLBACK;
  const rider = pose(frame, "rider");
  const cargo = pose(frame, "cargo");
  const ga = num(frame.groundAngle);

  /* Once the seat joint breaks there are two subjects, so the camera splits the
   * difference; while the rider is on board the machine alone is the subject. */
  const loose = frame.riderAttached === false && rider;
  const focus = loose
    ? { x: (chassis.x + rider.x) / 2, y: (chassis.y + rider.y) / 2 }
    : { x: chassis.x, y: chassis.y };
  const cam = side
    ? { x: clamp(focus.x, 0.77, RUN_LENGTH - 2.04), y: focus.y }
    : rearCam(focus);
  const hold = side ? SIDE_HOLD : REAR_HOLD;
  const tx = hold.x - S * cam.x;
  const ty = hold.y + S * cam.y;
  const toScreen = (x: number, y: number) => ({ x: tx + S * x, y: ty - S * y });
  const worldLeft = -tx / S;
  const worldRight = (VB_W - tx) / S;

  const cargoAmount = scenario.cargoLocked ? num(scenario.cargo, 0) : num(setup.cargo);
  const boxH = CARGO_SIZE[side ? "side" : "rear"].h * (0.55 + 0.45 * clamp(cargoAmount, 0, 1));
  const cargoPose = cargo ?? toWorldPose(chassis, side ? SIDE_ANCHOR.rack : REAR_RACK, boxH / 2 + 0.012);
  const riderPose = rider ?? toWorldPose(chassis, side ? SIDE_ANCHOR.seat : REAR_ANCHOR.seat, side ? 0.085 : -0.1);

  const wf = pose(frame, "wheelFront");
  const wr = pose(frame, "wheelRear");
  const contacts: Array<{ x: number; y: number }> = [];
  if (side) {
    const cf = wf ?? { ...toWorld(chassis, SIDE_ANCHOR.wheelFront), angle: 0 };
    const cr = wr ?? { ...toWorld(chassis, SIDE_ANCHOR.wheelRear), angle: 0 };
    if (frame.contacts?.front) contacts.push({ x: cf.x, y: cf.y - SIDE_ANCHOR.wheelR + 0.01 });
    if (frame.contacts?.rear) contacts.push({ x: cr.x, y: cr.y - SIDE_ANCHOR.wheelRRear + 0.01 });
  }

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      role="img"
      aria-label={ariaLabel}
      data-stage="stability"
      data-view={scenario.view}
      className="block h-auto w-full"
    >
      <defs>
        <clipPath id={`f${uid}`}>
          <rect x={0} y={0} width={VB_W} height={VB_H} />
        </clipPath>
      </defs>
      <g clipPath={`url(#f${uid})`}>
        <SkyBand w={VB_W} h={VB_H} />
        <g transform={`translate(${f(tx)} ${f(ty)}) scale(${S} ${-S})`}>
          {side ? (
            <SideTerrain scenario={scenario} x0={worldLeft} x1={worldRight} eventActive={!!frame.eventActive} />
          ) : (
            <RearGround scenario={scenario} groundAngle={ga} eventActive={!!frame.eventActive} />
          )}
          <Contacts pts={contacts} />
          {side ? (
            <>
              <AtvSideBody pose={chassis} />
              <AtvSideWheel
                pose={wr ?? { ...toWorld(chassis, SIDE_ANCHOR.wheelRear), angle: chassis.angle }}
                front={false}
                clipId={`wr${uid}`}
              />
              <AtvSideWheel
                pose={wf ?? { ...toWorld(chassis, SIDE_ANCHOR.wheelFront), angle: chassis.angle }}
                front
                clipId={`wf${uid}`}
              />
              <CargoBox pose={cargoPose} view="side" amount={cargoAmount} />
              <RiderSide
                pose={riderPose}
                chassis={chassis}
                attached={frame.riderAttached !== false}
                setup={setup}
              />
            </>
          ) : (
            <>
              <AtvRearBody pose={chassis} />
              <RiderRear
                pose={riderPose}
                chassis={chassis}
                attached={frame.riderAttached !== false}
                setup={setup}
              />
              <CargoBox pose={cargoPose} view="rear" amount={cargoAmount} />
            </>
          )}
        </g>
        {showPlumb && <PlumbOverlay scenario={scenario} frame={frame} toScreen={toScreen} />}
      </g>
    </svg>
  );
}

/** Fallback pose for a body the run does not carry: ride the chassis anchor. */
function toWorldPose(chassis: BodyPose, local: { x: number; y: number }, lift: number): BodyPose {
  const p = toWorld(chassis, { x: local.x, y: local.y + lift });
  return { x: p.x, y: p.y, angle: chassis.angle };
}
