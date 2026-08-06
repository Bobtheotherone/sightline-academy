import type { ReactNode } from "react";

/** Ring for module cards + level (DESIGN-002). value: 0–100. */
export function ProgressRing({
  value,
  size = 64,
  strokeWidth = 5,
  children,
  label,
  className = "",
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  /** Center content (numeral, icon). */
  children?: ReactNode;
  label?: string;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
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
          strokeDashoffset={c * (1 - clamped / 100)}
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
  className = "",
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full bg-line-200 ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progress"}
    >
      <div
        className="h-full rounded-full bg-pine-700"
        style={{
          width: `${clamped}%`,
          transition: "width var(--ts-dur-slow) var(--ts-ease-out)",
        }}
      />
    </div>
  );
}
