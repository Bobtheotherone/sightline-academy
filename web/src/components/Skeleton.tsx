import { useEffect, useState, type ReactNode } from "react";

/** One shimmer block. Compose per-page skeletons from these (DESIGN-002). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`ts-skeleton ${className}`} aria-hidden />;
}

/**
 * Wrapper that delays skeleton render by 150ms to avoid flash (DESIGN-005),
 * and labels the region busy for assistive tech.
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
    <div aria-busy="true" aria-label={label} className={className}>
      {show ? children : null}
    </div>
  );
}
