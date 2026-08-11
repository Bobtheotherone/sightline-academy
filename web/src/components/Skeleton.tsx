import { useEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "../activities/motion";

/**
 * One shimmer block. Compose per-page skeletons from these (DESIGN-002).
 *
 * Reduced motion needs more than the global duration collapse: zeroing the
 * animation leaves the sweep gradient painted at its start frame, so every bar
 * dissolves into the ground on one side and shows a seam on the other. The
 * flat tint replaces the gradient outright, which is also what keeps the
 * near-white midpoint of the sweep off a paper ground (DESIGN-006 §Identity).
 */
const FLAT_TINT = { backgroundImage: "none", backgroundColor: "var(--ts-line-200)" };

export function Skeleton({ className = "" }: { className?: string }) {
  const reduced = useReducedMotion();
  return (
    <div
      className={`ts-skeleton ${className}`}
      style={reduced ? FLAT_TINT : undefined}
      aria-hidden
    />
  );
}

/**
 * Wrapper that hides the skeleton for its first 150ms to avoid flash
 * (DESIGN-005), then crossfades at `base` (DESIGN-004), and labels the region
 * busy for assistive tech. The children stay mounted (opacity only) so their
 * space is reserved from the first frame — collapsing to zero height here
 * caused a full-card layout shift when data arrived near the 150ms boundary
 * (QA-004 CLS).
 */
export function SkeletonGroup({
  children,
  label = "Loading",
  className = "",
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), 150);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className={`${className} transition-opacity duration-(--ts-dur-base) ease-(--ts-ease-out) ${
        show ? "opacity-100" : "invisible opacity-0"
      }`}
    >
      {children}
    </div>
  );
}

/**
 * The other half of the skeleton handoff: real content fades up over 240ms when
 * it lands, so the swap reads as one crossfade instead of a snap.
 */
export function ContentFade({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), 20);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div
      className={`${className} transition-opacity duration-(--ts-dur-base) ease-(--ts-ease-out) ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    >
      {children}
    </div>
  );
}
