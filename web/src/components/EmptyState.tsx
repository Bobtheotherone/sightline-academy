import type { ReactNode } from "react";

/**
 * The one empty-surface composition (DESIGN-002): illustration slot + heading +
 * one-line body + primary action. Every empty surface uses this — no bare
 * "No data" text anywhere.
 */
export function EmptyState({
  art,
  heading,
  body,
  action,
  className = "",
}: {
  /** Illustration slot — usually <SlotArt/> until real art lands. */
  art?: ReactNode;
  heading: string;
  body: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center px-6 py-10 text-center ${className}`}>
      {art && <div className="mb-6 w-full max-w-[280px]">{art}</div>}
      <h2 className="font-display text-xl font-bold text-pine-950">{heading}</h2>
      <p className="mt-2 max-w-md text-sm text-ink-500">{body}</p>
      {action && <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}
