/**
 * ThoughtLayer — tap-to-reveal rider thoughts over a scenario plate (owner
 * directive 2026-08-16; anchors and per-thought measures in ./thoughts.ts).
 *
 * The bubble is a traditional comic THOUGHT CLOUD: a single SVG path of
 * uneven lobes traced around an ELLIPSE fit to the measured text box (seeded
 * jitter, so each thought keeps its own stable organic shape), stroked at the
 * art program's 1.5px pine-950. No rectangular hull, no corners, no straight
 * sides. Text is width-tuned per thought so it wraps to 2–3 short lines and
 * the mass stays oval.
 *
 * The TRAIL is computed, not hand-placed. Earlier cuts positioned the puffs
 * with fixed offsets from the *text box*, but the cloud silhouette overhangs
 * that box — so the puffs were swallowed by the cloud or stranded in a gap
 * beside the marker (owner's annotated screenshots, same day). Now the layer
 * measures the marker→cloud vector, solves where that ray exits the cloud's
 * ellipse, and steps 2–3 shrinking circles along the clear runway between
 * marker chip and cloud edge. Any cloud placement therefore trails correctly.
 *
 * Markers breathe before any interaction (registered ambient — BUILDLOG; the
 * tokens.css reduced-motion kill collapses it), grow on hover, and are real
 * buttons with the rider's name in the accessible label. One opens at a time.
 */
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { RiseIn } from "../motion";
import type { Thought } from "./thoughts";
import { PLATE_THOUGHTS } from "./thoughts";

/** Deterministic per-thought randomness — a stable shape per text. */
function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MARGIN = 16; // svg bleed for lobe bulges beyond the ellipse
/** Ellipse fit around the text box — lean, so clouds never run tall. */
const FIT_X = 1.24;
const FIT_Y = 1.32;
/** How far a lobe crests beyond the ellipse, and the marker chip's radius. */
const BULGE = 7;
const CHIP_R = 12;

/**
 * Irregular cloud: points scattered around an ellipse (angular jitter),
 * joined by outward arcs of varying plumpness. The ellipse is sized so the
 * text rectangle is fully contained ((w/2)²/rx² + (h/2)²/ry² < 1).
 */
function cloudGeometry(w: number, h: number, seed: number) {
  const rand = mulberry(seed);
  const rx = (w / 2) * FIT_X + 5;
  const ry = (h / 2) * FIT_Y + 4;
  // Ramanujan's ellipse perimeter — sets a lobe rhythm of ~22px.
  const per = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  const n = Math.max(9, Math.round(per / 22));
  const cx = rx + MARGIN;
  const cy = ry + MARGIN;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const jitter = (rand() - 0.5) * 0.55 * ((Math.PI * 2) / n);
    const a = ((Math.PI * 2) / n) * i + jitter;
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i <= n; i++) {
    const [px, py] = pts[i % n];
    const [qx, qy] = pts[i - 1];
    const chord = Math.hypot(px - qx, py - qy);
    // plump-to-shallow lobes, never a flat edge
    const r = (chord / 2) * (1.08 + rand() * 0.62);
    d += ` A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${px.toFixed(1)} ${py.toFixed(1)}`;
  }
  return { d: d + " Z", svgW: 2 * (rx + MARGIN), svgH: 2 * (ry + MARGIN) };
}

function CloudBubble({ thought }: { thought: Thought }) {
  const boxRef = useRef<HTMLSpanElement>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const r = boxRef.current?.getBoundingClientRect();
    if (r) setDims({ w: r.width, h: r.height });
  }, []);
  const seed = [...thought.text].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) | 0;
  const geo = dims ? cloudGeometry(dims.w, dims.h, seed) : null;
  return (
    <span className="relative block" style={{ width: thought.w }}>
      {geo && dims && (
        <svg
          aria-hidden
          className="absolute overflow-visible"
          style={{
            left: (dims.w - geo.svgW) / 2,
            top: (dims.h - geo.svgH) / 2,
            width: geo.svgW,
            height: geo.svgH,
            filter: "drop-shadow(0 3px 5px rgb(13 30 46 / 0.25))",
          }}
          viewBox={`0 0 ${geo.svgW} ${geo.svgH}`}
        >
          <path
            d={geo.d}
            fill="var(--ts-paper-0)"
            stroke="var(--ts-pine-950)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <span
        ref={boxRef}
        className="relative block text-center text-[12.5px] leading-snug font-medium text-pine-950"
      >
        {thought.text}
      </span>
    </span>
  );
}

/* Placement per side. The binding rule (owner directive, annotated screenshots
 * 2026-08-16): a cloud must NEVER cover another rider's marker chip — a
 * covered chip can't be clicked. Anchors and nudges are screenshot-verified
 * against that rule in both scenes; the trail below follows whatever they
 * choose. `boxRef` rides on the text box, which the cloud is centred on. */
function Bubble({ thought, boxRef }: { thought: Thought; boxRef: RefObject<HTMLDivElement> }) {
  const side = thought.side;
  const dx = thought.dx ?? 0;
  const dy = thought.dy ?? 0;
  if (side === "left" || side === "right") {
    const toRight = side === "right";
    const gap = thought.gap ?? 64;
    return (
      <div
        ref={boxRef}
        className={`absolute top-1/2 w-max -translate-y-1/2 ${toRight ? "left-full" : "right-full"}`}
        style={{ marginTop: dy, ...(toRight ? { marginLeft: gap } : { marginRight: gap }) }}
        role="note"
      >
        <RiseIn>
          <CloudBubble thought={thought} />
        </RiseIn>
      </div>
    );
  }
  const toLeft = side === "top-left";
  return (
    <div
      ref={boxRef}
      className={`absolute bottom-full w-max ${toLeft ? "right-0" : "left-0"}`}
      style={{ marginBottom: 48 + dy, ...(toLeft ? { marginRight: -dx } : { marginLeft: dx }) }}
      role="note"
    >
      <RiseIn>
        <CloudBubble thought={thought} />
      </RiseIn>
    </div>
  );
}

interface Dot {
  x: number;
  y: number;
  r: number;
}

/**
 * Trail circles along the marker→cloud ray. Solves the ray's exit point on
 * the cloud ellipse (|t−1|·√((dx/a)²+(dy/b)²) = 1), then walks the clear span
 * between chip edge and cloud edge, smallest circle nearest the thinker.
 * Measured in the marker's own coordinate space, so it is correct for every
 * side and every cloud size — no per-bubble offsets to keep in sync.
 */
function useTrail(
  open: boolean,
  anchorRef: RefObject<HTMLDivElement>,
  boxRef: RefObject<HTMLDivElement>,
): Dot[] {
  const [dots, setDots] = useState<Dot[]>([]);
  useLayoutEffect(() => {
    if (!open) {
      setDots([]);
      return;
    }
    const a = anchorRef.current?.getBoundingClientRect();
    const b = boxRef.current?.getBoundingClientRect();
    if (!a || !b || !b.width) return;
    // The wrapper's box origin IS the marker centre (the chip is translated
    // -50%/-50% off it), and the cloud is centred on the text box.
    const cx = b.left + b.width / 2 - a.left;
    const cy = b.top + b.height / 2 - a.top;
    const dist = Math.hypot(cx, cy);
    if (!dist) return;
    const ax = (b.width / 2) * FIT_X + 5 + BULGE;
    const by = (b.height / 2) * FIT_Y + 4 + BULGE;
    const k = Math.hypot(cx / ax, cy / by);
    if (k <= 1) return; // marker sits inside the cloud: no runway to draw
    const start = (CHIP_R + 4) / dist;
    const end = 1 - 1 / k - 5 / dist;
    const runway = (end - start) * dist;
    if (runway < 10) return;
    const spec: [number, number][] =
      runway >= 34
        ? [
            [0.1, 2.4],
            [0.48, 3.5],
            [0.88, 4.7],
          ]
        : [
            [0.2, 2.6],
            [0.78, 4.2],
          ];
    setDots(
      spec.map(([f, r]) => {
        const t = start + (end - start) * f;
        return { x: cx * t, y: cy * t, r };
      }),
    );
  }, [open, anchorRef, boxRef]);
  return dots;
}

function Marker({
  thought,
  open,
  onToggle,
}: {
  thought: Thought;
  open: boolean;
  onToggle: () => void;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const dots = useTrail(open, anchorRef, boxRef);
  return (
    <div
      ref={anchorRef}
      className="absolute"
      style={{ left: `${thought.x}%`, top: `${thought.y}%` }}
    >
      {open && <Bubble thought={thought} boxRef={boxRef} />}
      {dots.map((d, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute rounded-full border-[1.5px] border-pine-950 bg-paper-0 shadow-[0_2px_3px_rgb(13_30_46/0.18)]"
          style={{ left: d.x - d.r, top: d.y - d.r, width: d.r * 2, height: d.r * 2 }}
        />
      ))}
      <button
        type="button"
        aria-expanded={open}
        aria-label={`${thought.who} — reveal what they're thinking`}
        onClick={onToggle}
        className={`ts-thought -translate-x-1/2 -translate-y-1/2 grid size-6 cursor-pointer place-items-center rounded-full border bg-paper-0/90 backdrop-blur-[2px] transition-transform duration-(--ts-dur-fast) ease-(--ts-ease-out) hover:scale-110 active:scale-95 ${
          open ? "scale-110 border-clay-500" : "border-pine-950/50"
        }`}
      >
        <span aria-hidden className="flex items-end gap-[3px]">
          <span className="size-[3px] rounded-full bg-pine-950" />
          <span className="size-1 rounded-full bg-pine-950" />
          <span className="size-[5px] rounded-full bg-pine-950" />
        </span>
      </button>
    </div>
  );
}

export function ThoughtLayer({ slot }: { slot: string | undefined }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const thoughts = slot ? PLATE_THOUGHTS[slot] : undefined;
  if (!thoughts) return null;
  return (
    <div className="absolute inset-0">
      {thoughts.map((t) => (
        <Marker
          key={t.id}
          thought={t}
          open={openId === t.id}
          onToggle={() => setOpenId(openId === t.id ? null : t.id)}
        />
      ))}
    </div>
  );
}
