/* HotspotFigure — a content-block figure whose plate carries click targets.
 *
 * Built for the T-CLOC loop (m2-l3-s1), where the plate already draws five
 * inspection stops as icon badges around a machine. Each badge starts sealed
 * under a clay disc carrying its number in the walk order, pulsing until it is
 * opened; opening one lifts the seal, shows the icon the artwork drew, and adds
 * that stop's term and detail to the panel.
 *
 * The seal is the point. A static plate lets the eye skid over five icons in a
 * second; sealing them means the learner arrives at each one deliberately, in
 * the order the caption says matters.
 *
 * Two things this layout exists to fix, both found by using it:
 *
 *   The panel sits BESIDE the plate from lg up, and immediately beneath it
 *   below that — never after the caption. A 3:2 plate at the full 760px stage
 *   measure is over 500px tall, so a reveal placed after it opened off-screen:
 *   the learner clicked, and as far as they could see nothing happened.
 *
 *   The seal LIFTS rather than disappearing. Swapping two elements on the same
 *   frame reads as a glitch; scaling and fading the seal off while the ring
 *   springs in behind it reads as an act. `lifting` keeps the seal mounted for
 *   the length of that animation after its stop is already open.
 *
 * This is a Learn-section content block, so it holds no evidence and no
 * pass/fail. Nothing is gated: "Open all" is always one click away for anyone
 * who would rather read than hunt.
 */
import { useEffect, useRef, useState } from "react";
import { SlotArt } from "../../components/SlotArt";
import { BlazeMarker } from "../../components/BlazeMarker";
import { Button } from "../../components/Button";
import type { ContentBlock } from "../types";

type Block = Extract<ContentBlock, { type: "hotspot_figure" }>;

/** Long enough for ts-seal-lift to finish before the seal unmounts. */
const LIFT_MS = 400;

export function HotspotFigure({ block }: { block: Block }) {
  const stops = block.stops;
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [lifting, setLifting] = useState<Set<string>>(() => new Set());
  const [latest, setLatest] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(window.clearTimeout);
  }, []);

  const drop = (id: string) =>
    setLifting((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  const openStop = (id: string) => {
    if (open.has(id)) return;
    setOpen((prev) => new Set(prev).add(id));
    setLifting((prev) => new Set(prev).add(id));
    setLatest(id);
    timers.current.push(window.setTimeout(() => drop(id), LIFT_MS));
  };

  /* The escape hatch opens them in walk order rather than all on one frame —
   * the same seal lift, five times, reads as the loop being walked quickly. */
  const openAll = () => {
    stops.forEach((s, i) => {
      timers.current.push(window.setTimeout(() => openStop(s.id), i * 110));
    });
  };

  const allOpen = open.size === stops.length;
  const opened = stops.filter((s) => open.has(s.id));

  return (
    <figure className="flex flex-col gap-3">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,1fr)] lg:items-start">
        {/* ---- the plate ---- */}
        <div className="relative overflow-hidden rounded-md border border-line-200 bg-paper-0">
          <SlotArt
            slot={block.assetSlot}
            ratio={block.ratio ?? "3 / 2"}
            bleed
            className="h-full w-full"
          />
          <div className="absolute inset-0">
            {stops.map((stop, i) => {
              const isOpen = open.has(stop.id);
              const isLifting = lifting.has(stop.id);
              const size = stop.size ?? 13;
              return (
                <button
                  key={stop.id}
                  type="button"
                  onClick={() => openStop(stop.id)}
                  disabled={isOpen}
                  aria-label={
                    isOpen
                      ? `Stop ${i + 1}, ${stop.term} — opened`
                      : `Stop ${i + 1} of ${stops.length} — open it`
                  }
                  style={{ left: `${stop.x}%`, top: `${stop.y}%`, width: `${size}%` }}
                  className={`absolute aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform duration-(--ts-dur-fast) ${
                    isOpen ? "cursor-default" : "cursor-pointer hover:scale-110"
                  }`}
                >
                  {isOpen && (
                    <span
                      aria-hidden
                      className="ts-seal-settle absolute inset-0 rounded-full border-2 border-pine-700/45"
                    />
                  )}
                  {(!isOpen || isLifting) && (
                    <span
                      aria-hidden
                      className={`absolute inset-0 ${isLifting ? "ts-seal-lift" : ""}`}
                    >
                      {!isOpen && (
                        <span className="ts-hotspot-ring absolute inset-0 rounded-full bg-clay-500" />
                      )}
                      <span className="absolute inset-0 grid place-items-center rounded-full border-2 border-paper-0/70 bg-clay-500 shadow-soft">
                        <span className="font-mono text-xs font-semibold text-paper-0 sm:text-sm">
                          {i + 1}
                        </span>
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ---- the panel: beside the plate on wide screens, under it below ---- */}
        <div className="flex min-w-0 flex-col gap-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="ts-eyebrow text-ink-500">The walk</p>
            <p className="font-mono text-xs text-ink-500" aria-live="polite">
              {open.size} of {stops.length} opened
            </p>
          </div>

          {opened.length === 0 && (
            <p className="rounded-sm border border-dashed border-line-200 px-3.5 py-3 text-sm text-ink-500">
              {block.prompt ?? "Open each stop to walk the loop."}
            </p>
          )}

          <ol className="flex flex-col gap-2">
            {stops.map((stop, i) =>
              open.has(stop.id) ? (
                <li
                  key={stop.id}
                  className={`ts-act-settle rounded-sm border px-3.5 py-2.5 transition-colors duration-(--ts-dur-base) ${
                    latest === stop.id && !allOpen
                      ? "border-pine-300 bg-pine-300/10"
                      : "border-line-200 bg-paper-0"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <BlazeMarker state="done" size="s" />
                    <span className="font-mono text-xs font-semibold text-ink-500">{i + 1}</span>
                    <span className="text-sm font-medium text-pine-950">{stop.term}</span>
                  </span>
                  <span className="mt-1 block text-sm text-ink-500">{stop.detail}</span>
                </li>
              ) : null,
            )}
          </ol>

          {!allOpen && (
            <div>
              <Button size="s" variant="ghost" onClick={openAll}>
                Open all {stops.length}
              </Button>
            </div>
          )}
        </div>
      </div>

      {block.caption && (
        <figcaption className="text-sm text-ink-500">{block.caption}</figcaption>
      )}
    </figure>
  );
}
