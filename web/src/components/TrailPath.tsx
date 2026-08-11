import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface Point {
  x: number;
  y: number;
}

/** One cubic segment bowed sideways off the midline — the winding stroke. */
function segmentPath(a: Point, b: Point, index: number, bow: number, width: number): string {
  const dy = b.y - a.y;
  const dx = Math.abs(b.x - a.x);
  // Full bow when the segment runs vertically; ease off as the anchors
  // themselves alternate sides (the alternation already provides the swing).
  const lean = Math.min(1, dx / Math.max(1, Math.abs(dy)));
  const amp = bow * (1 - 0.65 * lean) * (index % 2 === 0 ? 1 : -1);
  // Keep the bow inside the container so narrow (mobile) layouts never clip.
  const mx = Math.min(Math.max((a.x + b.x) / 2 + amp, 6), width - 6);
  const c1y = a.y + dy * 0.36;
  const c2y = b.y - dy * 0.36;
  return `M ${a.x} ${a.y} C ${mx} ${c1y}, ${mx} ${c2y}, ${b.x} ${b.y}`;
}

/** Segment draw (DESIGN-004 §Progress draws): 600ms each, 120ms apart. */
const DRAW_MS = 600;
const DRAW_STAGGER_MS = 120;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * TrailPath — the winding trail-map connective path (DESIGN-003 §Course map).
 * Mount inside a `relative` container that holds `[data-trail-anchor]`
 * elements (one per waypoint, in trail order); the path is measured through
 * their centers and re-measured on resize. `traversed[i]` blazes the segment
 * leaving waypoint i in pine-300; untraveled trail stays a dotted hairline.
 *
 * Traversed segments draw themselves in once the geometry is measured, in trail
 * order; a resize re-measures without re-drawing.
 */
export function TrailPath({
  traversed,
  bow = 44,
  animateDraw = true,
  className = "",
}: {
  /** Per-segment traversed flags (length = waypoints - 1; missing = false). */
  traversed: boolean[];
  /** Sideways bow amplitude (px) for near-vertical segments. */
  bow?: number;
  /** Draw the traversed segments on mount; false renders them final. */
  animateDraw?: boolean;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [layout, setLayout] = useState<{ w: number; h: number; points: Point[] } | null>(
    null,
  );
  const [drawn, setDrawn] = useState(() => !animateDraw || prefersReducedMotion());

  useLayoutEffect(() => {
    const svg = svgRef.current;
    const host = svg?.parentElement;
    if (!svg || !host) return;

    const measure = () => {
      const rect = host.getBoundingClientRect();
      const anchors = Array.from(host.querySelectorAll<HTMLElement>("[data-trail-anchor]"));
      const points = anchors.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left - rect.left + r.width / 2, y: r.top - rect.top + r.height / 2 };
      });
      setLayout((prev) => {
        const next = { w: rect.width, h: rect.height, points };
        return prev && JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [traversed.length]);

  // The paths only exist once the anchors are measured, so the draw starts on
  // the frame after that first geometry paint.
  useEffect(() => {
    if (drawn || !layout) return;
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, [drawn, layout]);

  if (!layout || layout.points.length < 2) {
    return <svg ref={svgRef} className={`absolute inset-0 ${className}`} aria-hidden />;
  }

  const segments = layout.points.slice(0, -1).map((a, i) => ({
    d: segmentPath(a, layout.points[i + 1], i, bow, layout.w),
    done: Boolean(traversed[i]),
  }));

  return (
    <svg
      ref={svgRef}
      className={`pointer-events-none absolute inset-0 ${className}`}
      width={layout.w}
      height={layout.h}
      viewBox={`0 0 ${layout.w} ${layout.h}`}
      aria-hidden
    >
      {/* Untraveled trail: dashed hairline, the classic map treatment */}
      {segments.map((seg, i) => (
        <path
          key={`base-${i}`}
          d={seg.d}
          fill="none"
          stroke="var(--ts-line-200)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="2 10"
        />
      ))}
      {/* Traversed segments blaze solid pine-300, drawing in trail order */}
      {segments.map((seg, i) =>
        seg.done ? (
          <path
            key={`done-${i}`}
            d={seg.d}
            pathLength={1}
            fill="none"
            stroke="var(--ts-pine-300)"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={1}
            strokeDashoffset={drawn ? 0 : 1}
            style={{
              transition: `stroke-dashoffset ${DRAW_MS}ms var(--ts-ease-in-out) ${
                i * DRAW_STAGGER_MS
              }ms`,
            }}
          />
        ) : null,
      )}
    </svg>
  );
}
