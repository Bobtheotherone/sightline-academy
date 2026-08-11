import type { ReactNode } from "react";
import { RiseIn } from "../activities/motion";
import { StagedArt } from "./SlotArt";

/**
 * The one empty-surface composition (DESIGN-002): illustration slot + heading +
 * one-line body + primary action. Every empty surface uses this — no bare
 * "No data" text anywhere. v2: the art rises first, the text follows one
 * stagger step behind it.
 *
 * The art is staged, not boxed (DESIGN-001/006): the slot renders inside
 * <StagedArt/> so it drops its plate frame here without every caller having to
 * pass `bleed`, and it is sized to carry the composition rather than float in
 * it as a small card.
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
      {art && (
        <RiseIn className="mb-6 w-full max-w-[360px]">
          <StagedArt>{art}</StagedArt>
        </RiseIn>
      )}
      <RiseIn delay={60} className="flex flex-col items-center">
        <h2 className="font-display text-xl font-bold text-pine-950">{heading}</h2>
        <p className="mt-2 max-w-md text-sm text-ink-500">{body}</p>
      </RiseIn>
      {action && (
        <RiseIn delay={120} className="mt-5 flex flex-wrap justify-center gap-3">
          {action}
        </RiseIn>
      )}
    </div>
  );
}
