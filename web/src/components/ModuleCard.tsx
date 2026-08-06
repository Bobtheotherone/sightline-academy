import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Clock, Medal } from "lucide-react";
import { BlazeMarker } from "./BlazeMarker";
import { ProgressRing } from "./Progress";
import { SlotArt } from "./SlotArt";

/**
 * Module card (DESIGN-002 §Learning): hero slot art, title, tagline, minutes,
 * ProgressRing, locked treatment (desaturated + lock + unlock hint), badge
 * shown when complete.
 */
export function ModuleCard({
  order,
  title,
  tagline,
  minutes,
  heroSlot,
  percent,
  complete = false,
  locked = false,
  unlockHint,
  badgeName,
  to,
  hero,
  className = "",
}: {
  order: number;
  title: string;
  tagline: string;
  minutes: number;
  heroSlot: string;
  /** 0–100 module progress. */
  percent: number;
  complete?: boolean;
  locked?: boolean;
  /** Shown on locked cards, e.g. "Finish Know Your Machine first". */
  unlockHint?: string;
  /** Badge name shown when the module is complete. */
  badgeName?: string;
  /** Link target; omitted or locked renders a static card. */
  to?: string;
  /** Real hero art once produced; defaults to the designed SlotArt plate. */
  hero?: ReactNode;
  className?: string;
}) {
  const body = (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-md border border-line-200 bg-paper-0 ${
        to && !locked
          ? "transition-all duration-150 ease-in-out hover:-translate-y-0.5 hover:border-pine-300"
          : ""
      } ${className}`}
    >
      <div className={`relative ${locked ? "opacity-60 grayscale" : ""}`}>
        {hero ?? <SlotArt slot={heroSlot} ratio="5 / 2" className="rounded-none border-0" />}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="ts-eyebrow">Module {order}</p>
            <h3 className="mt-1 font-display text-xl font-bold text-pine-950">{title}</h3>
          </div>
          {locked ? (
            <BlazeMarker state="locked" size="l" label="Locked" className="mt-1" />
          ) : (
            <ProgressRing
              value={percent}
              size={44}
              strokeWidth={4}
              label={`Module ${order}: ${Math.round(percent)} percent complete`}
            >
              {/* Percent always carries its % sign (crawl pass-2 P3 unification). */}
              <span className="font-mono text-[11px] font-medium text-pine-950">
                {Math.round(percent)}
                <span className="text-[9px]">%</span>
              </span>
            </ProgressRing>
          )}
        </div>
        <p className="text-sm text-ink-500">{tagline}</p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <span className="inline-flex items-center gap-1.5 text-sm text-ink-500">
            <Clock className="size-4" strokeWidth={1.5} aria-hidden />
            {minutes} min
          </span>
          {locked && unlockHint ? (
            <span className="text-right text-xs text-ink-500">{unlockHint}</span>
          ) : complete && badgeName ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sun-400/60 bg-sun-400/15 px-2.5 py-1 text-xs font-medium text-pine-950">
              <Medal className="size-3.5 text-sun-400" strokeWidth={2} aria-hidden />
              {badgeName}
            </span>
          ) : complete ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-pine-700">
              <BlazeMarker state="done" size="s" />
              Complete
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );

  if (to && !locked) {
    return (
      <Link to={to} className="block h-full rounded-md">
        {body}
      </Link>
    );
  }
  return body;
}
