/* Sprites and rider/cargo art for the stability stage.
 *
 * The machine is the course's own painted plate (hero-m2-machine cut to
 * `atv-side.png`, the lesson-m4-l2 master cut to `atv-rear.png`) placed by body
 * pose; the rider and the load are vector, drawn to match those plates.
 *
 * PALETTE — every hex below was sampled with PIL from the plates, never picked
 * by eye. Sources and shares:
 *   rider  scenario-offcamber-wet-1024w.png, scenario-shortcut-slope-1024w.png,
 *          keylist-stability-model-1536w.png (the house's own side/rear riders)
 *     jacket mid    #386850 (19.5% of the torso crop)   light #487058
 *     jacket shade  #2E5748                             panel #E8F0E8
 *     pants         #2F6248   pants shade #245040   (the keylist rider's legs
 *                   read #306850 — the plates dress the rider head to toe in one
 *                   green family, so near-black trousers would be wrong)
 *     glove / boot  #242E33   (hero-m3-gear reads #203038, the keylist boot #283030)
 *   helmet  helmet-side.png + hero-m3-gear-800w.png
 *     white #F0F4F0 (44% of the sprite)  vent sage #C8D0B8  visor #1B2A33
 *     accent #B02458 (the painted crimson flash, 1684 px of the sprite)
 *   machine  atv-side.png / atv-rear.png
 *     tyre carcass #16242F  lug face #404C54  chassis green #286050
 *     bodywork bone #A8B8A8  metal #384850
 *   cargo  scene-loading-cargo-1536w.png
 *     case #A0B088 (13%)  case top #B0B890  strap #202B33
 *   ink outline #0D1E2E — the plates read #001828; brand pine-950 is the match.
 */
import type { BodyPose, RiderSetup } from "./stabilityRun";
import atvSide from "../../assets/stability/atv-side.png";
import atvRear from "../../assets/stability/atv-rear.png";
import helmetSide from "../../assets/stability/helmet-side.png";

/** Pixels per metre. Lower than the old vector stage: the painted machine is a
 * true 1.98 m long and a seated rider tops out near 1.65 m, and both have to
 * fit a 300 px frame with air above the helmet. */
export const S = 126;
export const LW = 1.5 / S; // the plates' 3–4 px at 1536 → 1.5 px at stage scale

export const INK = "#0D1E2E";
export const JACKET = "#386850";
export const JACKET_LIT = "#487058";
export const JACKET_SHADE = "#2E5748";
export const PANEL = "#E8F0E8";
export const PANTS = "#2F6248";
export const PANTS_SHADE = "#245040";
export const LEATHER = "#242E33";
export const HELMET_WHITE = "#F0F4F0";
export const HELMET_VENT = "#C8D0B8";
export const HELMET_ACCENT = "#B02458";
export const TYRE = "#16242F";
export const CASE = "#A0B088";
export const CASE_TOP = "#B0B890";
export const STRAP = "#202B33";

const deg = (rad: number) => ((Number.isFinite(rad) ? rad : 0) * 180) / Math.PI;
const f = (v: number) => (Number.isFinite(v) ? v : 0).toFixed(4);
const fs = (v: number) => (Number.isFinite(v) ? v : 0).toFixed(7);
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

export interface Pt {
  x: number;
  y: number;
}

/** Metres per sprite pixel: the side plate's 545 px wheelbase is 1.25 m. */
const PX = 1.25 / 545;
/** Metres per sprite pixel: the rear plate's 656 px outer track is 1.10 m. */
const PXR = 1.1 / 656;

const SIDE = { w: 863, h: 459, cx: 430, cy: 250 };
const REAR = { w: 742, h: 692, cx: 372, cy: 373 };
/** Lug tips reach 126 px; the JSON radius (123) is the carcass. Cover and clip
 * a hair past the lugs so the spinning disc hides the baked wheel completely. */
const WHEEL_CLIP_PX = 126;

/** Side plate anchor → chassis-local metres. Front faces +x, so the plate is
 * mirrored (`frontIsLeft: true`) and sprite +x becomes machine −x. */
const sideAt = (px: number, py: number): Pt => ({ x: -(px - SIDE.cx) * PX, y: -(py - SIDE.cy) * PX });
/** Rear plate anchor → chassis-local metres. Downhill is +x, no mirror. */
const rearAt = (px: number, py: number): Pt => ({ x: (px - REAR.cx) * PXR, y: -(py - REAR.cy) * PXR });

/** Every anchor a rider or a load hangs off, in chassis-local metres. */
export const SIDE_ANCHOR = {
  seat: sideAt(490, 118), grip: sideAt(300, 18), peg: sideAt(430, 332), rack: sideAt(760, 95),
  wheelFront: sideAt(143, 336), wheelRear: sideAt(688, 336),
  wheelR: 123 * PX, wheelRRear: 124 * PX, clipR: WHEEL_CLIP_PX * PX,
};

export const REAR_ANCHOR = {
  seat: rearAt(372, 108), gripL: rearAt(189, 23), gripR: rearAt(554, 23),
  footL: rearAt(214, 503), footR: rearAt(529, 503), rack: rearAt(372, 138),
  contactL: rearAt(101, 691), contactR: rearAt(647, 691),
};

/* ── Placement helpers ────────────────────────────────────────────────────── */

/** Sprite placed so `anchor` sits on the body pose, rotated with it. `mirror`
 * flips the plate about its own vertical axis before the world rotation. */
function spriteTransform(pose: BodyPose, ax: number, ay: number, k: number, mirror: boolean): string {
  return (
    `translate(${f(pose.x)} ${f(pose.y)}) rotate(${f(deg(pose.angle))}) ` +
    `scale(${fs(mirror ? -k : k)} ${fs(-k)}) translate(${f(-ax)} ${f(-ay)})`
  );
}

/** Chassis-local point → world, for a body at `pose`. */
export function toWorld(pose: BodyPose, p: Pt): Pt {
  const c = Math.cos(pose.angle);
  const s = Math.sin(pose.angle);
  return { x: pose.x + p.x * c - p.y * s, y: pose.y + p.x * s + p.y * c };
}

/** World point → the local frame of a body at `pose` (the inverse of above). */
export function toLocal(pose: BodyPose, p: Pt): Pt {
  const c = Math.cos(pose.angle);
  const s = Math.sin(pose.angle);
  const dx = p.x - pose.x;
  const dy = p.y - pose.y;
  return { x: dx * c + dy * s, y: -dx * s + dy * c };
}

/** Two-bone joint: the elbow or knee for a limb from `a` to `b`. `side` picks
 * which way it folds. An over-long reach straightens instead of buckling. */
export function joint(a: Pt, b: Pt, l1: number, l2: number, side: number): Pt {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 1e-4;
  const dc = clamp(d, Math.abs(l1 - l2) + 1e-3, (l1 + l2) * 0.998);
  const ux = dx / d;
  const uy = dy / d;
  const m = (dc * dc + l1 * l1 - l2 * l2) / (2 * dc);
  const h = Math.sqrt(Math.max(0, l1 * l1 - m * m));
  return { x: a.x + ux * m - uy * h * side, y: a.y + uy * m + ux * h * side };
}

/** An outlined limb, house style: ink linework with a colour core. Pass an
 * array of widths to taper it — a thigh is thicker than the shin below it — and
 * every outline is laid down before any fill so the joint has no seam. */
export function Limb({ pts, w, fill }: { pts: Pt[]; w: number | number[]; fill: string }) {
  const ws = Array.isArray(w) ? w : [w];
  const segs = pts.slice(1).map((p, i) => ({
    d: `M${f(pts[i].x)} ${f(pts[i].y)} L${f(p.x)} ${f(p.y)}`,
    w: ws[Math.min(i, ws.length - 1)],
  }));
  return (
    <g fill="none" strokeLinecap="round">
      {segs.map((sg, i) => (
        <path key={`o${i}`} d={sg.d} stroke={INK} strokeWidth={sg.w + LW * 2} />
      ))}
      {segs.map((sg, i) => (
        <path key={`c${i}`} d={sg.d} stroke={fill} strokeWidth={sg.w} />
      ))}
    </g>
  );
}

/* ── Machine ──────────────────────────────────────────────────────────────── */

export function AtvSideBody({ pose }: { pose: BodyPose }) {
  return (
    <g data-stage="atv-side" transform={spriteTransform(pose, SIDE.cx, SIDE.cy, PX, true)}>
      <image href={atvSide} x={0} y={0} width={SIDE.w} height={SIDE.h} />
    </g>
  );
}

/** One tyre: the plate's own wheel disc, clipped out of the chassis plate and
 * spun about its centre. A flat carcass disc goes down first so the baked wheel
 * underneath cannot show through the gaps between the rotated lugs. */
export function AtvSideWheel({ pose, front, clipId }: { pose: BodyPose; front: boolean; clipId: string }) {
  const ax = front ? 143 : 688;
  return (
    <g data-stage={front ? "wheel-front" : "wheel-rear"}>
      <defs>
        <clipPath id={clipId}>
          <circle cx={ax} cy={336} r={WHEEL_CLIP_PX} />
        </clipPath>
      </defs>
      <circle cx={pose.x} cy={pose.y} r={SIDE_ANCHOR.clipR} fill={TYRE} />
      <g transform={spriteTransform(pose, ax, 336, PX, true)}>
        <g clipPath={`url(#${clipId})`}>
          <image href={atvSide} x={0} y={0} width={SIDE.w} height={SIDE.h} />
        </g>
      </g>
    </g>
  );
}

export function AtvRearBody({ pose }: { pose: BodyPose }) {
  return (
    <g data-stage="atv-rear" transform={spriteTransform(pose, REAR.cx, REAR.cy, PXR, false)}>
      <image href={atvRear} x={0} y={0} width={REAR.w} height={REAR.h} />
    </g>
  );
}

/* ── Cargo ────────────────────────────────────────────────────────────────── */

/** Case size at a full rack; a lighter load is the same case, shorter. */
export const CARGO_SIZE = { side: { w: 0.5, h: 0.3 }, rear: { w: 0.66, h: 0.28 } };

/** The strapped case off scene-loading-cargo: sage shell, lighter lid, two dark
 * straps with square buckles. */
export function CargoBox({ pose, view, amount }: { pose: BodyPose; view: "side" | "rear"; amount: number }) {
  const a = clamp(Number.isFinite(amount) ? amount : 0, 0, 1);
  if (a <= 0.02) return null;
  const base = CARGO_SIZE[view];
  const w = base.w;
  const h = base.h * (0.55 + 0.45 * a);
  const x = -w / 2;
  const y = -h / 2;
  const lid = h * 0.3;
  const straps = [-w * 0.24, w * 0.24];
  return (
    <g data-stage="cargo" transform={`translate(${f(pose.x)} ${f(pose.y)}) rotate(${f(deg(pose.angle))})`}>
      <rect x={x} y={y} width={w} height={h} rx={0.03} fill={CASE} stroke={INK} strokeWidth={LW} />
      <path fill={CASE_TOP} d={`M${f(x + 0.01)} ${f(y + h - lid)} Q${f(x)} ${f(y + h)} ${f(x + 0.05)} ${f(y + h)} H${f(x + w - 0.05)} Q${f(x + w)} ${f(y + h)} ${f(x + w - 0.01)} ${f(y + h - lid)} Z`} />
      <path d={`M${f(x + 0.02)} ${f(y + h - lid)} H${f(x + w - 0.02)}`} stroke={INK} strokeWidth={LW} opacity={0.5} />
      {straps.map((sx) => (
        <g key={sx}>
          <rect x={sx - 0.023} y={y - 0.012} width={0.046} height={h + 0.024} fill={STRAP} />
          <rect x={sx - 0.036} y={y + h * 0.32} width={0.072} height={0.062} rx={0.01} fill={STRAP} stroke={INK} strokeWidth={LW * 0.8} />
          <rect x={sx - 0.016} y={y + h * 0.32 + 0.015} width={0.032} height={0.032} rx={0.005} fill={CASE} opacity={0.35} />
        </g>
      ))}
      <rect x={x} y={y} width={w} height={h} rx={0.03} fill="none" stroke={INK} strokeWidth={LW} />
    </g>
  );
}

/* ── Rider ────────────────────────────────────────────────────────────────── */

export interface RiderProps {
  /** Pelvis centre and torso angle, from the run's `rider` body. */
  pose: BodyPose;
  /** Needed only while the seat joint holds, to reach the grips and pegs. */
  chassis?: BodyPose;
  attached: boolean;
  setup: RiderSetup;
}

/* Both riders are drawn about the same origin: the PELVIS CENTRE. The hip
 * joints hang 0.07–0.085 m under it, the shoulders sit 0.42–0.44 m over it and
 * the helmet tops out about 0.78 m over it — a 1.65 m rider once the pelvis is
 * on a 0.78 m seat, which is what the plates show. */

const HELMET_PX = { w: 527, h: 439, ax: 292, ay: 236 };
const HELMET_H = 0.3;
/** Seated riders do not sit bolt upright: the shoulders carry forward of the
 * pelvis and the head further still, which is what the plates draw. */
const SHOULDER: Pt = { x: 0.132, y: 0.408 };
const HEAD: Pt = { x: 0.188, y: 0.572 };
const HIP_J: Pt = { x: 0.012, y: -0.085 };
const UPPER_ARM = 0.29;
const FOREARM = 0.265;
const THIGH = 0.42;
const SHIN = 0.4;

const JACKET_PATH =
  "M-0.124 -0.115 C-0.144 0.06 -0.114 0.286 -0.052 0.386 C-0.014 0.448 0.078 0.474 0.14 0.456 " +
  "C0.2 0.438 0.228 0.368 0.224 0.296 C0.218 0.172 0.19 0.02 0.16 -0.125 Z";

/** Side rider: helmet plate for the head, vector body. Arms reach the grip and
 * legs the peg while the seat joint holds; both hang loose once it breaks. */
export function RiderSide({ pose, chassis, attached, setup }: RiderProps) {
  const on = attached && !!chassis;
  const hand = on ? toLocal(pose, toWorld(chassis, SIDE_ANCHOR.grip)) : { x: 0.42, y: 0.32 };
  const foot = on ? toLocal(pose, toWorld(chassis, SIDE_ANCHOR.peg)) : { x: 0.34, y: -0.4 };
  const elbow = joint(SHOULDER, hand, UPPER_ARM, FOREARM, -1);
  const knee = joint(HIP_J, foot, THIGH, SHIN, 1);
  return (
    <g data-stage="rider-side" data-attached={attached ? "1" : "0"} transform={`translate(${f(pose.x)} ${f(pose.y)}) rotate(${f(deg(pose.angle))})`}>
      <Limb pts={[HIP_J, knee, foot]} w={[0.092, 0.064]} fill={PANTS} />
      <g transform={`translate(${f(foot.x)} ${f(foot.y)})`} strokeLinejoin="round">
        <path d="M-0.05 0.032 L0.075 0.028 Q0.103 0.026 0.103 0 L0.103 -0.03 Q0.103 -0.05 0.08 -0.05 L-0.05 -0.046 Z" fill={LEATHER} stroke={INK} strokeWidth={LW} />
        <path d="M-0.048 -0.03 L0.098 -0.034" stroke={PANEL} strokeWidth={LW * 1.2} opacity={0.5} />
      </g>
      <ellipse cx={-0.005} cy={-0.075} rx={0.138} ry={0.086} fill={PANTS} stroke={INK} strokeWidth={LW} />
      <path d="M-0.115 -0.075 Q-0.01 -0.126 0.112 -0.09" fill="none" stroke={PANTS_SHADE} strokeWidth={LW} opacity={0.55} />
      <path d={JACKET_PATH} fill={JACKET} stroke={INK} strokeWidth={LW} strokeLinejoin="round" />
      <path fill={PANEL} d="M0.148 0.45 C0.2 0.432 0.228 0.364 0.224 0.296 C0.222 0.244 0.216 0.19 0.208 0.136 L0.17 0.142 C0.178 0.194 0.183 0.244 0.184 0.296 C0.187 0.35 0.168 0.4 0.134 0.418 Z" />
      <path d="M-0.12 -0.088 L0.154 -0.098" stroke={LEATHER} strokeWidth={0.044} strokeLinecap="butt" />
      <path d="M-0.132 0.128 C-0.06 0.086 0.104 0.104 0.216 0.15" fill="none" stroke={JACKET_SHADE} strokeWidth={LW * 1.4} />
      <path d="M-0.05 0.368 C0.014 0.334 0.114 0.342 0.196 0.372" fill="none" stroke={JACKET_SHADE} strokeWidth={LW * 1.2} opacity={0.7} />
      <path d="M-0.118 0.05 C-0.06 0.02 0.09 0.03 0.196 0.07" fill="none" stroke={JACKET_SHADE} strokeWidth={LW} opacity={0.45} />
      {setup.stance === "standing" && (
        <path d="M-0.14 -0.02 L0.158 -0.05" stroke={JACKET_SHADE} strokeWidth={LW} opacity={0.45} />
      )}
      <path d="M0.088 0.386 L0.216 0.404 C0.222 0.45 0.214 0.482 0.196 0.5 L0.104 0.478 C0.088 0.452 0.083 0.42 0.088 0.386 Z" fill={LEATHER} stroke={INK} strokeWidth={LW} strokeLinejoin="round" />
      <g transform={`translate(${f(HEAD.x)} ${f(HEAD.y)}) scale(${fs(-HELMET_H / HELMET_PX.h)} ${fs(-HELMET_H / HELMET_PX.h)})`}>
        <image href={helmetSide} x={-HELMET_PX.ax} y={-HELMET_PX.ay} width={HELMET_PX.w} height={HELMET_PX.h} />
      </g>
      <circle cx={SHOULDER.x} cy={SHOULDER.y} r={0.056} fill={JACKET_LIT} stroke={INK} strokeWidth={LW} />
      <Limb pts={[SHOULDER, elbow, hand]} w={[0.07, 0.056]} fill={JACKET_LIT} />
      <g transform={`translate(${f(hand.x)} ${f(hand.y)})`}>
        <ellipse rx={0.048} ry={0.039} fill={LEATHER} stroke={INK} strokeWidth={LW} />
        <path d="M-0.028 -0.01 L0.026 -0.01" stroke={PANEL} strokeWidth={LW} opacity={0.22} />
      </g>
    </g>
  );
}

/* Rear rider. Limb lengths are the FORESHORTENED ones a straight-on rear view
 * sees — an arm reaching forward to the bars projects to about 0.47 m, not the
 * 0.56 m it measures. */

const SH_L: Pt = { x: -0.232, y: 0.402 };
const SH_R: Pt = { x: 0.232, y: 0.402 };
const HIP_L: Pt = { x: -0.092, y: -0.07 };
const HIP_R: Pt = { x: 0.092, y: -0.07 };
const R_UPPER = 0.14;
const R_FORE = 0.16;
const R_THIGH = 0.27;
const R_SHIN = 0.33;

const JACKET_BACK =
  "M-0.19 -0.09 C-0.208 0.06 -0.224 0.28 -0.248 0.386 C-0.214 0.466 -0.098 0.502 0 0.502 " +
  "C0.098 0.502 0.214 0.466 0.248 0.386 C0.224 0.28 0.208 0.06 0.19 -0.09 Z";

/** The back of a white helmet: dome, painted crimson flash and the neck roll
 * under it — the same helmet as the side plate, seen from behind. */
function HelmetRear() {
  return (
    <g data-stage="helmet-rear">
      <path
        d="M-0.142 0.6 C-0.142 0.712 -0.08 0.766 0 0.766 C0.08 0.766 0.142 0.712 0.142 0.6 C0.142 0.504 0.1 0.45 0 0.45 C-0.1 0.45 -0.142 0.504 -0.142 0.6 Z"
        fill={HELMET_WHITE} stroke={INK} strokeWidth={LW} strokeLinejoin="round"
      />
      <path
        d="M0.142 0.6 C0.142 0.712 0.08 0.766 0 0.766 C0.052 0.736 0.088 0.682 0.092 0.6 C0.096 0.518 0.062 0.472 0 0.45 C0.1 0.45 0.142 0.504 0.142 0.6 Z"
        fill={HELMET_VENT} opacity={0.5}
      />
      <path d="M-0.14 0.648 C-0.137 0.682 -0.128 0.708 -0.114 0.73" fill="none" stroke={HELMET_ACCENT} strokeWidth={LW * 1.4} strokeLinecap="round" />
      <path d="M0.14 0.648 C0.137 0.682 0.128 0.708 0.114 0.73" fill="none" stroke={HELMET_ACCENT} strokeWidth={LW * 1.4} strokeLinecap="round" />
      <path
        d="M-0.105 0.53 C-0.06 0.492 0.06 0.492 0.105 0.53 L0.098 0.428 C0.06 0.404 -0.06 0.404 -0.098 0.428 Z"
        fill={LEATHER} stroke={INK} strokeWidth={LW} strokeLinejoin="round"
      />
      <path d="M-0.09 0.5 C-0.05 0.472 0.05 0.472 0.09 0.5" fill="none" stroke={PANEL} strokeWidth={LW} opacity={0.16} />
    </g>
  );
}

/** Rear rider: jacket back with the plate's pale side panels, both arms out to
 * the grips and both legs down into the footwells. */
export function RiderRear({ pose, chassis, attached, setup }: RiderProps) {
  const on = attached && !!chassis;
  const at = (p: Pt, fx: number, fy: number) => (on ? toLocal(pose, toWorld(chassis, p)) : { x: fx, y: fy });
  const gl = at(REAR_ANCHOR.gripL, -0.46, 0.3);
  const gr = at(REAR_ANCHOR.gripR, 0.46, 0.3);
  const fl = at(REAR_ANCHOR.footL, -0.24, -0.46);
  const fr = at(REAR_ANCHOR.footR, 0.24, -0.46);
  const el = joint(SH_L, gl, R_UPPER, R_FORE, -1);
  const er = joint(SH_R, gr, R_UPPER, R_FORE, 1);
  const kl = joint(HIP_L, fl, R_THIGH, R_SHIN, -1);
  const kr = joint(HIP_R, fr, R_THIGH, R_SHIN, 1);
  const boot = (p: Pt, i: number) => (
    <rect key={i} x={p.x - 0.052} y={p.y - 0.05} width={0.104} height={0.094} rx={0.02} fill={LEATHER} stroke={INK} strokeWidth={LW} />
  );
  return (
    <g data-stage="rider-rear" data-attached={attached ? "1" : "0"} transform={`translate(${f(pose.x)} ${f(pose.y)}) rotate(${f(deg(pose.angle))})`}>
      <Limb pts={[HIP_L, kl, fl]} w={[0.098, 0.07]} fill={PANTS} />
      <Limb pts={[HIP_R, kr, fr]} w={[0.098, 0.07]} fill={PANTS} />
      {[fl, fr].map(boot)}
      <ellipse cx={0} cy={-0.055} rx={0.175} ry={0.098} fill={PANTS} stroke={INK} strokeWidth={LW} />
      <path d={JACKET_BACK} fill={JACKET} stroke={INK} strokeWidth={LW} strokeLinejoin="round" />
      <path d="M-0.126 0.108 C-0.14 0.2 -0.152 0.31 -0.166 0.382 L-0.128 0.394 C-0.118 0.31 -0.11 0.2 -0.1 0.112 Z" fill={PANEL} opacity={0.88} />
      <path d="M0.126 0.108 C0.14 0.2 0.152 0.31 0.166 0.382 L0.128 0.394 C0.118 0.31 0.11 0.2 0.1 0.112 Z" fill={PANEL} opacity={0.88} />
      <path d="M-0.178 -0.052 L0.178 -0.052" stroke={LEATHER} strokeWidth={0.05} strokeLinecap="butt" />
      <path d="M-0.238 0.39 C-0.11 0.44 0.11 0.44 0.238 0.39" fill="none" stroke={JACKET_SHADE} strokeWidth={LW * 1.2} opacity={0.6} />
      <path d="M-0.216 0.16 C-0.1 0.11 0.1 0.11 0.216 0.16" fill="none" stroke={JACKET_SHADE} strokeWidth={LW} opacity={0.45} />
      <circle cx={SH_L.x} cy={SH_L.y} r={0.066} fill={JACKET_LIT} stroke={INK} strokeWidth={LW} />
      <circle cx={SH_R.x} cy={SH_R.y} r={0.066} fill={JACKET_LIT} stroke={INK} strokeWidth={LW} />
      {setup.stance === "standing" && (
        <path d="M-0.208 -0.03 C-0.1 0.02 0.1 0.02 0.208 -0.03" fill="none" stroke={JACKET_SHADE} strokeWidth={LW} opacity={0.45} />
      )}
      <HelmetRear />
      <Limb pts={[SH_L, el, gl]} w={[0.078, 0.062]} fill={JACKET_LIT} />
      <Limb pts={[SH_R, er, gr]} w={[0.078, 0.062]} fill={JACKET_LIT} />
      <ellipse cx={gl.x} cy={gl.y} rx={0.047} ry={0.04} fill={LEATHER} stroke={INK} strokeWidth={LW} />
      <ellipse cx={gr.x} cy={gr.y} rx={0.047} ry={0.04} fill={LEATHER} stroke={INK} strokeWidth={LW} />
    </g>
  );
}
