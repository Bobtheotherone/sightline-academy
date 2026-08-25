/* Ground for the stability stage — the hillside the painted machine rides on.
 *
 * Everything here is drawn INSIDE the world group (metres, y up), so lengths
 * are metres and stroke widths are `LW` multiples (1.5 px at S = 150 px/m).
 * Nothing is randomised at runtime: the grit and tufts come off a fixed hash of
 * their index so the same frame always draws the same stones.
 *
 * PALETTE — sampled with PIL from the course plates, not invented. Sources:
 *   inset-crest-640w.png, scenario-shortcut-slope-1024w.png,
 *   scenario-offcamber-wet-1024w.png, keylist-stability-model-1536w.png.
 *     moss body        #286850   (34% of inset-crest's slope)
 *     moss deep        #205848
 *     moss shadow edge #1D4C3E   (darkened moss, keeps the same hue)
 *     trail pale       #C0D0B8   (56% of inset-crest's trail band)
 *     trail shade      #A8BCA4
 *     rock sage        #A8B8A8 / light facet #C0D0C0 / shadow #90A898
 *     grass dark       #304030
 *     sky              #ECF1EC   ridge far #C3D2C4  ridge near #A6BCA8
 *     ink outline      #0D1E2E   (plates read #001828; brand pine-950 matches)
 */
import type { Scenario, TrailEvent } from "./stabilityScenarios";
import { INK, LW } from "./stageSprites";

export const MOSS = "#286850";
export const MOSS_DEEP = "#205848";
export const MOSS_EDGE = "#1D4C3E";
export const TRAIL = "#C0D0B8";
export const TRAIL_SHADE = "#A8BCA4";
export const ROCK = "#A8B8A8";
export const ROCK_LIT = "#C0D0C0";
export const ROCK_SHADE = "#90A898";
export const GRASS = "#304030";
export const SKY = "#ECF1EC";
export const RIDGE_FAR = "#C3D2C4";
export const RIDGE_NEAR = "#A6BCA8";

/** Metres of run in the side view. Must match Module P's terrain length. */
export const RUN_LENGTH = 18;
/** Terrain sample step, metres — the width of one of Module P's static slabs. */
export const STEP = 0.25;

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const f2 = (v: number) => (Number.isFinite(v) ? v : 0).toFixed(3);
/** Deterministic 0..1 scatter — no Math.random, so every replay is identical. */
const hash = (i: number) => {
  const v = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
  return v - Math.floor(v);
};

/** Grade in degrees at 0..1 along the run, linear between profile points. */
export function gradeDegAt(scenario: Scenario, s: number): number {
  const p = scenario.profile;
  if (p.length === 0) return 0;
  const u = clamp(s, 0, 1);
  for (let i = 1; i < p.length; i += 1) {
    if (u <= p[i].s) {
      const span = p[i].s - p[i - 1].s || 1;
      const k = (u - p[i - 1].s) / span;
      return p[i - 1].deg + (p[i].deg - p[i - 1].deg) * k;
    }
  }
  return p[p.length - 1].deg;
}

const TABLES = new WeakMap<Scenario, number[]>();

/** Surface height table, one entry per STEP: a left-Riemann walk up the grade,
 * which is what a chain of slabs each cut at `deg(s_i)` actually builds. */
function table(scenario: Scenario): number[] {
  const cached = TABLES.get(scenario);
  if (cached) return cached;
  const n = Math.round(RUN_LENGTH / STEP);
  const ys: number[] = [0];
  for (let i = 0; i < n; i += 1) {
    const deg = gradeDegAt(scenario, (i * STEP) / RUN_LENGTH);
    ys.push(ys[i] + Math.tan((deg * Math.PI) / 180) * STEP);
  }
  TABLES.set(scenario, ys);
  return ys;
}

/** Surface height in metres at world x. Beyond the run it keeps the end grade. */
export function sideProfileY(scenario: Scenario, x: number): number {
  const ys = table(scenario);
  const last = ys.length - 1;
  if (x <= 0) return ys[0] + Math.tan((gradeDegAt(scenario, 0) * Math.PI) / 180) * x;
  if (x >= RUN_LENGTH) {
    return ys[last] + Math.tan((gradeDegAt(scenario, 1) * Math.PI) / 180) * (x - RUN_LENGTH);
  }
  const i = Math.floor(x / STEP);
  const k = (x - i * STEP) / STEP;
  return ys[i] + (ys[i + 1] - ys[i]) * k;
}

/** Ground height under `x` for whichever view is on screen. */
export function groundYAt(scenario: Scenario, groundAngle: number, x: number): number {
  if (scenario.view === "side") return sideProfileY(scenario, x);
  return -Math.tan(groundAngle) * x;
}

/* ── Surface geometry ─────────────────────────────────────────────────────── */

interface Pt {
  x: number;
  y: number;
}

function surfacePoints(scenario: Scenario, x0: number, x1: number): Pt[] {
  const pts: Pt[] = [{ x: x0, y: sideProfileY(scenario, x0) }];
  const first = Math.ceil(x0 / STEP) * STEP;
  for (let x = first; x < x1; x += STEP) pts.push({ x, y: sideProfileY(scenario, x) });
  pts.push({ x: x1, y: sideProfileY(scenario, x1) });
  return pts;
}

const poly = (pts: Pt[]) => pts.map((p, i) => `${i ? "L" : "M"}${f2(p.x)} ${f2(p.y)}`).join(" ");

/** A band of thickness `d` hanging under the surface — topsoil, then bedrock. */
function band(pts: Pt[], d: number): string {
  const back = pts.map((p) => ({ x: p.x, y: p.y - d })).reverse();
  return `${poly(pts)} ${poly(back).replace("M", "L")} Z`;
}

/* ── Sky ──────────────────────────────────────────────────────────────────── */

/** Sky, contour signature and two ridge silhouettes — screen space, 480 × 300. */
export function SkyBand({ w, h }: { w: number; h: number }) {
  return (
    <g data-stage="sky">
      <rect x={0} y={0} width={w} height={h} fill={SKY} />
      <g fill="none" stroke={INK} strokeWidth={1} opacity={0.07}>
        <path d="M-20 40 C 90 14, 190 62, 300 36 S 470 10, 500 48" />
        <path d="M-20 88 C 100 62, 200 110, 312 84 S 470 58, 500 96" />
        <path d="M-20 136 C 110 110, 214 158, 326 132 S 470 106, 500 144" />
      </g>
      <path
        d={`M-20 ${h * 0.46} L 70 ${h * 0.29} L 128 ${h * 0.37} L 208 ${h * 0.22} L 286 ${h * 0.35} L 360 ${h * 0.26} L 440 ${h * 0.38} L 500 ${h * 0.32} L 500 ${h} L -20 ${h} Z`}
        fill={RIDGE_FAR}
      />
      <path
        d={`M-20 ${h * 0.6} L 60 ${h * 0.47} L 150 ${h * 0.56} L 232 ${h * 0.43} L 320 ${h * 0.55} L 410 ${h * 0.46} L 500 ${h * 0.56} L 500 ${h} L -20 ${h} Z`}
        fill={RIDGE_NEAR}
      />
    </g>
  );
}

/* ── Trail events ─────────────────────────────────────────────────────────── */

/** Rock step / rock band: a sage boulder sitting proud of the surface. */
function Rock({ active }: { active: boolean }) {
  return (
    <g data-stage="rock">
      <path
        d="M-0.24 0.01 L-0.17 0.13 L-0.05 0.2 L0.09 0.17 L0.2 0.06 L0.23 0.01 Z"
        fill={ROCK}
        stroke={INK}
        strokeWidth={LW}
        strokeLinejoin="round"
      />
      <path d="M-0.17 0.13 L-0.05 0.2 L0.02 0.09 L-0.1 0.04 Z" fill={ROCK_LIT} />
      <path d="M0.09 0.17 L0.2 0.06 L0.12 0.03 Z" fill={ROCK_SHADE} />
      {active && (
        <path
          d="M-0.24 0.01 L-0.17 0.13 L-0.05 0.2 L0.09 0.17 L0.2 0.06 L0.23 0.01"
          fill="none"
          stroke="var(--ts-danger-600)"
          strokeWidth={LW * 1.25}
          strokeLinejoin="round"
        />
      )}
    </g>
  );
}

/** Washout: a scoured gully with the topsoil cut away and loose stones in it. */
function Washout({ active }: { active: boolean }) {
  return (
    <g data-stage="washout">
      <path
        d="M-0.3 0 L-0.18 -0.11 L-0.05 -0.16 L0.09 -0.12 L0.22 -0.03 L0.3 0 Z"
        fill={MOSS_EDGE}
        stroke={active ? "var(--ts-danger-600)" : INK}
        strokeWidth={active ? LW * 1.25 : LW}
        strokeLinejoin="round"
      />
      <path d="M-0.2 -0.05 L-0.06 -0.1 L0.08 -0.07" fill="none" stroke={TRAIL_SHADE} strokeWidth={LW} />
      <g fill={ROCK_SHADE}>
        <ellipse cx={-0.11} cy={-0.13} rx={0.028} ry={0.02} />
        <ellipse cx={0.05} cy={-0.09} rx={0.022} ry={0.016} />
        <ellipse cx={0.19} cy={-0.03} rx={0.026} ry={0.018} />
      </g>
    </g>
  );
}

/** Rut: a trench cut across the line, dark inside, lipped on both edges. */
function Rut({ active }: { active: boolean }) {
  return (
    <g data-stage="rut">
      <path
        d="M-0.25 0 Q-0.14 -0.13 0 -0.145 Q0.14 -0.13 0.25 0 Z"
        fill={MOSS_EDGE}
        stroke={active ? "var(--ts-danger-600)" : INK}
        strokeWidth={active ? LW * 1.25 : LW}
        strokeLinejoin="round"
      />
      <path d="M-0.15 -0.045 Q0 -0.105 0.15 -0.045" fill="none" stroke={TRAIL_SHADE} strokeWidth={LW} opacity={0.7} />
    </g>
  );
}

export function TrailFeature({ event, active }: { event: TrailEvent; active: boolean }) {
  if (event.kind === "rock") return <Rock active={active} />;
  if (event.kind === "washout") return <Washout active={active} />;
  return <Rut active={active} />;
}

/* ── The two grounds ──────────────────────────────────────────────────────── */

/** Side view: the profile between x0 and x1, with its event on the surface. */
export function SideTerrain({
  scenario,
  x0,
  x1,
  eventActive,
}: {
  scenario: Scenario;
  x0: number;
  x1: number;
  eventActive: boolean;
}) {
  const pts = surfacePoints(scenario, x0 - 0.4, x1 + 0.4);
  const floor = Math.min(...pts.map((p) => p.y)) - 3;
  const body = `${poly(pts)} L${f2(x1 + 0.4)} ${f2(floor)} L${f2(x0 - 0.4)} ${f2(floor)} Z`;
  const ev = scenario.event;
  const ex = ev ? ev.s * RUN_LENGTH : 0;
  const eDeg = ev ? gradeDegAt(scenario, ev.s) : 0;
  const marks: React.ReactNode[] = [];
  const first = Math.ceil((x0 - 0.4) / 0.55) * 0.55;
  for (let x = first, i = 0; x < x1 + 0.4; x += 0.55, i += 1) {
    const key = Math.round(x * 100);
    const r = hash(key);
    const y = sideProfileY(scenario, x);
    marks.push(
      r > 0.55 ? (
        <path
          key={key}
          d={`M${f2(x)} ${f2(y)} l-0.03 0.075 M${f2(x)} ${f2(y)} l0.012 0.085 M${f2(x)} ${f2(y)} l0.045 0.06`}
          stroke={GRASS}
          strokeWidth={LW}
          strokeLinecap="round"
          fill="none"
        />
      ) : (
        <ellipse
          key={key}
          cx={x + r * 0.2}
          cy={y - 0.02}
          rx={0.016 + r * 0.018}
          ry={0.012 + r * 0.012}
          fill={ROCK_SHADE}
        />
      ),
    );
  }
  return (
    <g data-stage="terrain-side">
      <path d={body} fill={MOSS} />
      <path d={band(pts, 3)} fill={MOSS_DEEP} opacity={0.45} transform="translate(0 -0.62)" />
      <path d={band(pts, 0.115)} fill={TRAIL} />
      <path d={band(pts, 0.03)} fill={TRAIL_SHADE} transform="translate(0 -0.115)" />
      <path d={poly(pts)} fill="none" stroke={INK} strokeWidth={LW} strokeLinejoin="round" />
      {marks}
      {ev && (
        <g transform={`translate(${f2(ex)} ${f2(sideProfileY(scenario, ex))}) rotate(${f2(eDeg)})`}>
          <TrailFeature event={ev} active={eventActive} />
        </g>
      )}
    </g>
  );
}

/** Rear view: one plane through the world origin, tilted so +ve `groundAngle`
 * falls toward +x. The event rides the plane under the wheel it acts on — a rut
 * under the downhill tyre, a rock band under the uphill one. */
export function RearGround({
  scenario,
  groundAngle,
  eventActive,
}: {
  scenario: Scenario;
  groundAngle: number;
  eventActive: boolean;
}) {
  const deg = (-groundAngle * 180) / Math.PI;
  const ev = scenario.event;
  const ex = ev ? (ev.kind === "rock" ? -0.47 : 0.47) : 0;
  const tufts: React.ReactNode[] = [];
  for (let i = 0; i < 14; i += 1) {
    const x = -3.4 + i * 0.5 + hash(i) * 0.24;
    if (Math.abs(x) < 0.75) continue;
    tufts.push(
      hash(i + 9) > 0.5 ? (
        <path
          key={i}
          d={`M${f2(x)} 0 l-0.03 0.075 M${f2(x)} 0 l0.012 0.085 M${f2(x)} 0 l0.045 0.06`}
          stroke={GRASS}
          strokeWidth={LW}
          strokeLinecap="round"
          fill="none"
        />
      ) : (
        <ellipse key={i} cx={x} cy={-0.02} rx={0.02 + hash(i) * 0.016} ry={0.015} fill={ROCK_SHADE} />
      ),
    );
  }
  return (
    <g data-stage="terrain-rear" transform={`rotate(${f2(deg)})`}>
      <rect x={-4} y={-2.6} width={8} height={2.6} fill={MOSS} />
      <rect x={-4} y={-2.6} width={8} height={1.8} fill={MOSS_DEEP} opacity={0.45} />
      <rect x={-4} y={-0.115} width={8} height={0.115} fill={TRAIL} />
      <rect x={-4} y={-0.145} width={8} height={0.03} fill={TRAIL_SHADE} />
      <path d="M-4 0 H4" fill="none" stroke={INK} strokeWidth={LW} />
      {tufts}
      {ev && eventActive && (
        <g transform={`translate(${f2(ex)} 0)`}>
          <TrailFeature event={ev} active />
        </g>
      )}
    </g>
  );
}
