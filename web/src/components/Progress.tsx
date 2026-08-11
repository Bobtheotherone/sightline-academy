import { useEffect, useState, type ReactNode } from "react";

/**
 * The displayed value trails the real one: with `animateIn` the track mounts at
 * zero and lands on the real value on the next frame, so the existing
 * dashoffset/width transitions run at `slow` instead of the bar appearing
 * pre-filled (DESIGN-004 §Progress draws). ARIA always reports the real value.
 */
function useFillValue(value: number, animateIn: boolean): number {
  const [shown, setShown] = useState(animateIn ? 0 : value);
  useEffect(() => {
    if (!animateIn) {
      setShown(value);
      return;
    }
    // Two frames: the first paints the mount state, the second transitions off it.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setShown(value));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [value, animateIn]);
  return shown;
}

/** Ring for module cards + level (DESIGN-002). value: 0–100. */
export function ProgressRing({
  value,
  size = 64,
  strokeWidth = 5,
  animateIn = false,
  children,
  label,
  className = "",
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  /** Draw from zero (or the previous value) on first paint. */
  animateIn?: boolean;
  /** Center content (numeral, icon). */
  children?: ReactNode;
  label?: string;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const shown = useFillValue(clamped, animateIn);
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span
      className={`relative inline-grid place-items-center ${className}`}
      role="img"
      aria-label={label ?? `${Math.round(clamped)} percent complete`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--ts-line-200)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--ts-pine-700)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset var(--ts-dur-slow) var(--ts-ease-out)" }}
        />
      </svg>
      {children && <span className="absolute inset-0 grid place-items-center">{children}</span>}
    </span>
  );
}

/** Bar for in-lesson progress (DESIGN-002). value: 0–100. */
export function ProgressBar({
  value,
  label,
  animateIn = false,
  valueLabel,
  className = "",
}: {
  value: number;
  label?: string;
  /** Fill from zero (or the previous value) on first paint. */
  animateIn?: boolean;
  /**
   * Mono readout paired with the track — the caller supplies it (a CountUp, a
   * fraction) so this stays standalone.
   */
  valueLabel?: ReactNode;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const shown = useFillValue(clamped, animateIn);
  const track = (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full bg-line-200 ${
        valueLabel === undefined ? className : ""
      }`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progress"}
    >
      <div
        className="h-full rounded-full bg-pine-700"
        style={{
          width: `${shown}%`,
          transition: "width var(--ts-dur-slow) var(--ts-ease-out)",
        }}
      />
    </div>
  );

  if (valueLabel === undefined) return track;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        {label && <span className="ts-eyebrow">{label}</span>}
        <span className="ml-auto font-mono text-sm font-medium tabular-nums text-pine-950">
          {valueLabel}
        </span>
      </div>
      {track}
    </div>
  );
}
