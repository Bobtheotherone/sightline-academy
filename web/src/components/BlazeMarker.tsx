import { Check, Lock } from "lucide-react";
import { useEntered } from "../activities/motion";

export type BlazeState = "todo" | "active" | "done" | "locked";
export type BlazeSize = "s" | "m" | "l";

const SIZE: Record<BlazeSize, { box: string; icon: string }> = {
  s: { box: "size-2.5", icon: "size-1.5" },
  m: { box: "size-3.5", icon: "size-2.5" },
  l: { box: "size-5", icon: "size-3" },
};

const STATE: Record<BlazeState, string> = {
  todo: "bg-pine-300",
  active: "bg-clay-500",
  done: "bg-pine-700",
  locked: "bg-line-200",
};

/** The `done` check drawing itself in on mount (DESIGN-004 §Ceremonies moment 1). */
function DrawnCheck({ className }: { className: string }) {
  const drawn = useEntered();
  return (
    <svg viewBox="0 0 24 24" className={`absolute ${className} text-paper-0`} aria-hidden>
      <path
        d="M20 6 9 17l-5-5"
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={1}
        strokeDashoffset={drawn ? 0 : 1}
        style={{ transition: "stroke-dashoffset var(--ts-dur-fast) var(--ts-ease-in-out)" }}
      />
    </svg>
  );
}

/**
 * The signature trail-blaze glyph (DESIGN-001): a rounded diamond — rotated
 * square, 3px radius. Used for step dots, list markers, map pins, waypoints.
 */
export function BlazeMarker({
  state = "todo",
  size = "m",
  current = false,
  animateOnMount = false,
  className = "",
  label,
}: {
  state?: BlazeState;
  size?: BlazeSize;
  /** The waypoint you are standing on — breathes at 3s (DESIGN-004 §Ambient). */
  current?: boolean;
  /** `done`: draws the check stroke on first render instead of showing it. */
  animateOnMount?: boolean;
  className?: string;
  /** Accessible name when the marker conveys state on its own. */
  label?: string;
}) {
  const s = SIZE[size];
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <span
        className={`${s.box} ${STATE[state]} rotate-45 rounded-[3px] ${
          current ? "ts-blaze--current" : ""
        }`}
      />
      {state === "done" &&
        (animateOnMount ? (
          <DrawnCheck className={s.icon} />
        ) : (
          <Check className={`absolute ${s.icon} text-paper-0`} strokeWidth={3} aria-hidden />
        ))}
      {state === "locked" && (
        <Lock className={`absolute ${s.icon} text-ink-500`} strokeWidth={2.5} aria-hidden />
      )}
    </span>
  );
}
