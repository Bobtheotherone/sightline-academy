import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

/**
 * "+25 XP" clay chip with count-up (DESIGN-002). The parent staggers multiple
 * chips via `delay` (60ms steps per DESIGN-004 moment 3). Reduced motion shows
 * the final value immediately.
 */
export function XpChip({
  xp,
  label,
  delay = 0,
  className = "",
}: {
  xp: number;
  /** Optional context, e.g. "Checkpoint first try". */
  label?: string;
  /** Count-up start delay in ms. */
  delay?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplay(xp);
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const duration = 480;
    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * xp));
      if (t < 1) raf = window.requestAnimationFrame(tick);
    };
    const timer = window.setTimeout(() => {
      raf = window.requestAnimationFrame(tick);
    }, delay);
    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(raf);
    };
  }, [xp, delay]);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full bg-clay-500 py-1 pl-2.5 pr-3 text-paper-0 ${className}`}
      aria-label={`${xp} XP earned${label ? ` — ${label}` : ""}`}
    >
      <Zap className="size-3.5" strokeWidth={2} aria-hidden />
      <span className="font-mono text-sm font-medium" aria-hidden>
        +{display} XP
      </span>
      {label && (
        <span className="text-xs text-paper-0/85" aria-hidden>
          {label}
        </span>
      )}
    </span>
  );
}
