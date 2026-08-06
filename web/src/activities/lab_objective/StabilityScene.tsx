/* The stability explorer's two SVG scenes (SPEC-007 §11) — rear view on a
 * side-slope, side view on an uphill grade. House style: flat vector, brand
 * tokens via CSS vars, 1.5px pine linework. The machine+ground group rotates
 * with the slope; the CoG marker and its plumb line are drawn in screen space
 * so the plumb stays truly vertical against the tilted support polygon.
 */
import {
  REAR_HALF_SUPPORT,
  SIDE_HALF_SUPPORT,
  type StabilityState,
} from "./stabilityModel";

const S = 150; // px per concept-metre
const CX = 200;
const CY = 245;
const INK = "var(--ts-pine-950)";

const xy = (mx: number, my: number): [number, number] => [CX + mx * S, CY - my * S];

/** Rotate a machine-frame point (y up) by `deg`, clockwise-positive on screen. */
const rot = (mx: number, my: number, deg: number): [number, number] => {
  const r = (deg * Math.PI) / 180;
  return [mx * Math.cos(r) + my * Math.sin(r), -mx * Math.sin(r) + my * Math.cos(r)];
};

const rotAbout = (
  p: [number, number],
  c: [number, number],
  deg: number,
): [number, number] => {
  const r = (deg * Math.PI) / 180;
  const dx = p[0] - c[0];
  const dy = p[1] - c[1];
  return [c[0] + dx * Math.cos(r) + dy * Math.sin(r), c[1] - dx * Math.sin(r) + dy * Math.cos(r)];
};

/* ── Shared scene pieces ─────────────────────────────────────────────────── */

function Ground({ halfSupport, edgeAtPlusX }: { halfSupport: number; edgeAtPlusX: boolean }) {
  const [e1x] = xy(-halfSupport, 0);
  const [e2x] = xy(halfSupport, 0);
  const edgeX = edgeAtPlusX ? e2x : e1x;
  return (
    <g>
      <rect x={CX - 195} y={CY} width={390} height={16} fill="var(--ts-moss-100)" />
      <line x1={CX - 195} y1={CY} x2={CX + 195} y2={CY} stroke={INK} strokeWidth={1.5} />
      {[-180, -135, -90, 135, 180].map((dx) => (
        <path
          key={dx}
          d={`M${CX + dx} ${CY} l4 -7`}
          stroke={INK}
          strokeWidth={1.5}
          opacity={0.3}
          strokeLinecap="round"
        />
      ))}
      {/* Support polygon between the contact patches */}
      <g stroke="var(--ts-pine-700)" strokeWidth={4} strokeLinecap="round">
        <line x1={e1x} y1={CY - 2} x2={e2x} y2={CY - 2} />
        <line x1={e1x} y1={CY - 2} x2={e1x} y2={CY - 11} />
        <line x1={e2x} y1={CY - 2} x2={e2x} y2={CY - 11} />
      </g>
      {/* Downhill edge marker */}
      <path
        d={`M${edgeX} ${CY - 18} l5.5 9 h-11 Z`}
        fill="var(--ts-clay-500)"
        stroke={INK}
        strokeWidth={1}
      />
    </g>
  );
}

/** CoG marker + true-vertical plumb line, drawn in screen space. */
function CogPlumb({ phys, sceneDeg }: { phys: StabilityState; sceneDeg: number }) {
  const [cx, cy] = xy(...rot(phys.d, phys.h, sceneDeg));
  const [ix, iy] = xy(...rot(phys.xInt, 0, sceneDeg));
  const danger = phys.margin <= 0.15;
  const lineColor = danger ? "var(--ts-danger-600)" : INK;
  return (
    <g>
      <line
        x1={cx}
        y1={cy}
        x2={ix}
        y2={iy}
        stroke={lineColor}
        strokeWidth={2}
        strokeDasharray="5 4"
        opacity={danger ? 0.95 : 0.65}
      />
      <circle cx={ix} cy={iy} r={4} fill={lineColor} stroke="var(--ts-paper-0)" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={7.5} fill="var(--ts-clay-500)" stroke={INK} strokeWidth={1.5} />
      <path
        d={`M${cx - 7.5} ${cy} h15 M${cx} ${cy - 7.5} v15`}
        stroke={INK}
        strokeWidth={1.5}
      />
      <text
        x={cx + 12}
        y={cy + 4}
        fontSize={11}
        fill={INK}
        style={{ fontFamily: "var(--ts-font-mono)" }}
      >
        CoG
      </text>
    </g>
  );
}

/** Faint horizontal reference so the tilt is readable at a glance. */
function Horizon() {
  return (
    <line
      x1={40}
      y1={CY}
      x2={360}
      y2={CY}
      stroke="var(--ts-line-200)"
      strokeWidth={1.5}
      strokeDasharray="4 5"
    />
  );
}

export interface SceneProps {
  slope: number;
  /** −1 uphill … 1 downhill. */
  lean: number;
  /** 0…1 rear cargo. */
  cargo: number;
  phys: StabilityState;
}

/* ── Rear view (side-slope; downhill to the right) ───────────────────────── */

export function RearView({ slope, lean, cargo, phys }: SceneProps) {
  const leanDeg = lean * 24;
  const [shX, shY] = xy(...rotAbout([-0.1, 1.1], [0, 0.74], leanDeg));
  const [sh2X, sh2Y] = xy(...rotAbout([0.1, 1.1], [0, 0.74], leanDeg));
  const cargoH = (0.08 + 0.22 * cargo) * S;
  return (
    <svg
      viewBox="0 0 400 300"
      role="img"
      aria-label={`Rear view: ATV and rider on a ${slope.toFixed(0)}-degree side-slope, stability margin ${Math.round(Math.max(0, Math.min(1, phys.margin)) * 100)} percent.`}
      className="block h-auto w-full"
    >
      <Horizon />
      <g transform={`rotate(${slope} ${CX} ${CY})`}>
        <Ground halfSupport={REAR_HALF_SUPPORT} edgeAtPlusX />
        {/* Tires */}
        {[143, 257].map((cx) => (
          <g key={cx}>
            <rect x={cx - 13} y={197} width={26} height={48} rx={9} fill={INK} />
            <path
              d={`M${cx - 5} 205 v32 M${cx + 5} 205 v32`}
              stroke="var(--ts-paper-0)"
              strokeWidth={2}
              opacity={0.3}
              strokeLinecap="round"
            />
          </g>
        ))}
        {/* Axle + body + fenders */}
        <rect x={150} y={206} width={100} height={9} rx={3} fill={INK} />
        <path d="M149 200 L251 200 L242 152 L158 152 Z" fill="var(--ts-pine-300)" stroke={INK} strokeWidth={1.5} />
        <path d="M119 200 Q143 164 170 200 Z" fill="var(--ts-pine-300)" stroke={INK} strokeWidth={1.5} />
        <path d="M230 200 Q257 164 281 200 Z" fill="var(--ts-pine-300)" stroke={INK} strokeWidth={1.5} />
        {/* Rear cargo (peeks around the seat) */}
        {cargo > 0.02 && (
          <g>
            <rect
              x={165}
              y={162.5 - cargoH}
              width={70}
              height={cargoH}
              rx={5}
              fill="var(--ts-clay-500)"
              stroke={INK}
              strokeWidth={1.5}
            />
            <path
              d={`M187 ${163 - cargoH} v${cargoH - 2} M213 ${163 - cargoH} v${cargoH - 2}`}
              stroke={INK}
              strokeWidth={1.5}
              opacity={0.35}
            />
          </g>
        )}
        {/* Seat, bar stem and grips */}
        <rect x={173} y={134} width={54} height={18} rx={7} fill="var(--ts-pine-700)" stroke={INK} strokeWidth={1.5} />
        <path d="M200 134 V98" stroke={INK} strokeWidth={4} strokeLinecap="round" />
        <path d="M155 98 H245" stroke={INK} strokeWidth={4} strokeLinecap="round" />
        <circle cx={155} cy={98} r={5} fill="var(--ts-clay-500)" stroke={INK} strokeWidth={1.5} />
        <circle cx={245} cy={98} r={5} fill="var(--ts-clay-500)" stroke={INK} strokeWidth={1.5} />
        {/* Rider legs to the footwells */}
        <path
          d="M200 134 L164 167 L161 194 M200 134 L236 167 L239 194 M153 194 h16 M231 194 h16"
          fill="none"
          stroke={INK}
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Torso + helmet lean about the hips */}
        <g transform={`rotate(${leanDeg} 200 134)`}>
          <rect x={187} y={74} width={26} height={62} rx={12} fill="var(--ts-clay-500)" stroke={INK} strokeWidth={1.5} />
          <circle cx={200} cy={56} r={15} fill={INK} />
          <path d="M188 52 a15 15 0 0 1 24 0" fill="none" stroke="var(--ts-paper-0)" strokeWidth={2} opacity={0.4} />
        </g>
        {/* Arms from the leaning shoulders to the fixed grips */}
        <path
          d={`M${shX} ${shY} L155 98 M${sh2X} ${sh2Y} L245 98`}
          fill="none"
          stroke={INK}
          strokeWidth={4}
          strokeLinecap="round"
        />
      </g>
      <CogPlumb phys={phys} sceneDeg={slope} />
    </svg>
  );
}

/* ── Side view (uphill grade; front to the right, downhill is the rear) ───── */

export function SideView({ slope, lean, cargo, phys }: SceneProps) {
  const leanDeg = 8 - lean * 18; // resting forward posture ± lean
  const [shX, shY] = xy(...rotAbout([-0.1, 1.13], [-0.12, 0.76], leanDeg));
  const cargoH = (0.1 + 0.3 * cargo) * S;
  return (
    <svg
      viewBox="0 0 400 300"
      role="img"
      aria-label={`Side view: ATV and rider climbing a ${slope.toFixed(0)}-degree grade${cargo > 0.02 ? " with rear cargo" : ""}, stability margin ${Math.round(Math.max(0, Math.min(1, phys.margin)) * 100)} percent.`}
      className="block h-auto w-full"
    >
      <Horizon />
      <g transform={`rotate(${-slope} ${CX} ${CY})`}>
        <Ground halfSupport={SIDE_HALF_SUPPORT} edgeAtPlusX={false} />
        {/* Body slab */}
        <path
          d="M59 191 L59 155 L125 150.5 L137 140 L192.5 137 L218 146 L252.5 143 L272 155 L312.5 158 L341 167 L341 191 Z"
          fill="var(--ts-pine-300)"
          stroke={INK}
          strokeWidth={1.5}
        />
        {/* Racks */}
        <rect x={62} y={143} width={60} height={6} rx={2} fill="var(--ts-paper-0)" stroke={INK} strokeWidth={1.5} />
        <rect x={290} y={151} width={51} height={6} rx={2} fill="var(--ts-paper-0)" stroke={INK} strokeWidth={1.5} />
        <path d="M75 149 v7 M110 149 v4 M303 157 v4 M330 157 v6" stroke={INK} strokeWidth={1.5} />
        {/* Cargo on the rear rack */}
        {cargo > 0.02 && (
          <g>
            <rect
              x={64}
              y={143 - cargoH}
              width={56}
              height={cargoH}
              rx={5}
              fill="var(--ts-clay-500)"
              stroke={INK}
              strokeWidth={1.5}
            />
            <path
              d={`M82 ${144 - cargoH} v${cargoH - 3} M102 ${144 - cargoH} v${cargoH - 3}`}
              stroke={INK}
              strokeWidth={1.5}
              opacity={0.35}
            />
          </g>
        )}
        {/* Lights */}
        <rect x={330} y={172} width={10} height={8} rx={2} fill="var(--ts-sun-400)" stroke={INK} strokeWidth={1.5} />
        <rect x={53} y={162} width={8} height={7} rx={2} fill="var(--ts-danger-600)" stroke={INK} strokeWidth={1.5} />
        {/* Footwell rail */}
        <path d="M140 200 H263" stroke={INK} strokeWidth={3} strokeLinecap="round" />
        {/* Seat + bar stem and grip */}
        <rect x={137} y={126} width={66} height={14} rx={6} fill="var(--ts-pine-700)" stroke={INK} strokeWidth={1.5} />
        <path d="M263 146 L282.5 95" stroke={INK} strokeWidth={4} strokeLinecap="round" />
        <circle cx={282.5} cy={95} r={5.5} fill="var(--ts-clay-500)" stroke={INK} strokeWidth={1.5} />
        {/* Wheels over the body (near side) */}
        {[104, 296].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy={203} r={42} fill={INK} />
            <circle cx={cx} cy={203} r={14} fill="var(--ts-paper-0)" stroke={INK} strokeWidth={1.5} />
            <circle cx={cx} cy={203} r={4} fill="var(--ts-ink-500)" />
          </g>
        ))}
        {/* Rider leg to the peg */}
        <path
          d="M182 131 L224 155 L219 197 M212 199 h16"
          fill="none"
          stroke={INK}
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Torso + helmet lean about the hips */}
        <g transform={`rotate(${leanDeg} 182 131)`}>
          <rect x={170} y={73} width={24} height={62} rx={11} fill="var(--ts-clay-500)" stroke={INK} strokeWidth={1.5} />
          <circle cx={182} cy={59} r={14} fill={INK} />
          <rect x={184} y={55} width={9} height={4.5} rx={2.2} fill="var(--ts-paper-0)" opacity={0.85} />
          <path d="M170 55 a14 14 0 0 1 10 -9" fill="none" stroke="var(--ts-paper-0)" strokeWidth={2} opacity={0.35} />
        </g>
        {/* Arm to the grip */}
        <path
          d={`M${shX} ${shY} L282.5 95`}
          fill="none"
          stroke={INK}
          strokeWidth={4}
          strokeLinecap="round"
        />
      </g>
      <CogPlumb phys={phys} sceneDeg={-slope} />
    </svg>
  );
}
