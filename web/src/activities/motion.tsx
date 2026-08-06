/* Shared micro-motion for activity renderers (DESIGN-004). Keyframes live in a
 * single <style> mounted once by ActivityHost; the global reduced-motion rule
 * in tokens.css collapses all of these to ~0ms automatically.
 */
import { useEffect, useState, type ReactNode } from "react";

const KEYFRAMES = `
@keyframes ts-act-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
}
@keyframes ts-act-settle {
  from { transform: scale(1.03); }
  to { transform: scale(1); }
}
@keyframes ts-act-draw {
  from { stroke-dashoffset: 24; }
  to { stroke-dashoffset: 0; }
}
.ts-act-shake { animation: ts-act-shake 300ms var(--ts-ease-in-out); }
.ts-act-settle { animation: ts-act-settle 200ms cubic-bezier(0.34, 1.4, 0.64, 1); }
.ts-act-draw { stroke-dasharray: 24; stroke-dashoffset: 24; animation: ts-act-draw 120ms var(--ts-ease-out) 80ms forwards; }
`;

/** Mounted once by ActivityHost so every renderer can use the ts-act-* classes. */
export function ActivityMotionStyles() {
  return <style>{KEYFRAMES}</style>;
}

/**
 * Mount-entrance hook: false on first paint, true one tick (+delay) later, so
 * transition utilities animate in. Reduced motion still resolves — the global
 * rule makes the transition instant.
 */
export function useEntered(delayMs = 0): boolean {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setEntered(true), Math.max(delayMs, 20));
    return () => window.clearTimeout(t);
  }, [delayMs]);
  return entered;
}

/** Fade + 8px rise on mount (the FeedbackStrip entrance, moment 1). */
export function RiseIn({
  delay = 0,
  className = "",
  children,
}: {
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const entered = useEntered(delay);
  return (
    <div
      className={`transition-all duration-(--ts-dur-base) ease-(--ts-ease-out) ${
        entered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/** Left-to-right unmask wipe (the prediction_reveal moment 4). */
export function Unmask({
  delay = 0,
  instant = false,
  className = "",
  children,
}: {
  delay?: number;
  /** Revisit mode: show without animating. */
  instant?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const entered = useEntered(delay);
  const open = instant || entered;
  return (
    <div
      style={{
        clipPath: open ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
        transition: instant
          ? "none"
          : "clip-path var(--ts-dur-base) var(--ts-ease-out)",
      }}
      className={className}
    >
      {children}
    </div>
  );
}

/**
 * The correct-drop check: blaze diamond with the check stroke drawing in over
 * 120ms (DESIGN-004 moment 1).
 */
export function BlazeCheckDraw({ className = "" }: { className?: string }) {
  return (
    <span
      className={`relative inline-grid size-5 shrink-0 place-items-center ${className}`}
      aria-hidden
    >
      <span className="size-3.5 rotate-45 rounded-[3px] bg-pine-700" />
      <svg viewBox="0 0 16 16" className="absolute size-3 text-paper-0">
        <path
          d="M3 8.5 6.5 12 13 5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ts-act-draw"
        />
      </svg>
    </span>
  );
}
