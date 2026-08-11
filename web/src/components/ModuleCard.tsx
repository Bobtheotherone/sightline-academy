import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, Medal } from "lucide-react";
import { BlazeMarker } from "./BlazeMarker";
import { ProgressRing } from "./Progress";
import { SlotArt } from "./SlotArt";

/**
 * Module card (DESIGN-002 §Learning): hero slot art, title, tagline, minutes,
 * ProgressRing, locked treatment (desaturated + lock + unlock hint), badge
 * shown when complete. v2: shadow-1 resting, hover lift + interior art zoom,
 * clay edge on the current module, and the landing trail's `expandOnHover`
 * summary (grid-rows unfold — the card grows downward, siblings never move).
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
  current = false,
  expandOnHover = false,
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
  /** The module you are on — clay edge + breathing blaze. */
  current?: boolean;
  /** Landing trail variant: the tagline unfolds on hover/focus (open on touch). */
  expandOnHover?: boolean;
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
  const interactive = Boolean(to) && !locked;
  const body = (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-md border bg-paper-0 shadow-1 ${
        current && !locked ? "border-clay-500/50 shadow-glow-clay" : "border-line-200"
      } ${
        interactive
          ? "transition-all duration-(--ts-dur-fast) ease-(--ts-ease-out) hover:-translate-y-[3px] hover:border-pine-300 hover:shadow-2"
          : ""
      } ${className}`}
    >
      <div
        className={`relative ${locked ? "opacity-60 grayscale" : ""} ${
          interactive
            ? "transition-transform duration-(--ts-dur-base) ease-(--ts-ease-out) group-hover:scale-[1.03]"
            : ""
        }`}
      >
        {hero ?? <SlotArt slot={heroSlot} ratio="5 / 2" className="rounded-none border-0" />}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="ts-eyebrow flex items-center gap-1.5">
              {current && !locked && <BlazeMarker state="active" size="s" current />}
              Module {order}
            </p>
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
        {expandOnHover ? (
          <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-(--ts-dur-base) ease-(--ts-ease-out) group-hover:grid-rows-[1fr] group-focus-within:grid-rows-[1fr] [@media(hover:none)]:grid-rows-[1fr]">
            <p className="min-h-0 overflow-hidden text-sm text-ink-500">{tagline}</p>
          </div>
        ) : (
          <p className="text-sm text-ink-500">{tagline}</p>
        )}
        {/* Wrapping row, not a rigid 2-column split: the unlock hint is a whole
         * sentence and claims its own full-width line under the duration when
         * the card is narrow, instead of ragging out in a half-width gutter. */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-2">
          <span className="inline-flex shrink-0 items-center gap-1.5 text-sm whitespace-nowrap text-ink-500">
            <Clock className="size-4" strokeWidth={1.5} aria-hidden />
            {minutes} min
          </span>
          {locked && unlockHint ? (
            <span className="w-full text-left text-xs text-balance text-ink-500 sm:w-auto sm:text-right">
              {unlockHint}
            </span>
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
          ) : current && !locked ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-pine-700">
              {percent > 0 ? "Continue" : "Start module"}
              <ArrowRight
                className="size-4 transition-transform duration-(--ts-dur-fast) ease-(--ts-ease-out) group-hover:translate-x-0.5"
                strokeWidth={2}
                aria-hidden
              />
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );

  if (to && !locked) {
    return (
      <Link to={to} className="group block h-full rounded-md">
        {body}
      </Link>
    );
  }
  return body;
}
