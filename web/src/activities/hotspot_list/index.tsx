/* hotspot_list renderer (SPEC-007 §6): explore labeled waypoints on an
 * illustrated scene. Markers sit at payload x/y percentages over the scene's
 * asset slot (SlotArt frame until real art lands), pulse until visited
 * (reduced motion → static ring via the global rule), and open a side panel on
 * desktop / bottom sheet on mobile. Both surfaces render the same `detail()`
 * body, so the C-120…C-134 inset plate lands in each of them once. A list
 * fallback below the scene mirrors every hotspot as buttons for accessibility.
 * Complete when all are visited.
 */
import { useState } from "react";
import { MapPin, MoveRight } from "lucide-react";
import type { ActivityProps, Hotspot, HotspotListPayload, HotspotsValue } from "../types";
import { SlotArt } from "../../components/SlotArt";
import { hotspotInsetSlot } from "../../assets/slotmap";
import { BlazeMarker } from "../../components/BlazeMarker";
import { FeedbackStrip } from "../../components/FeedbackStrip";
import { Markdown } from "../Markdown";
import { BottomSheet } from "../sheet";

const MARKER_KEYFRAMES = `
@keyframes ts-hotspot-pulse {
  0% { transform: scale(1); opacity: 0.65; }
  70% { transform: scale(1.9); opacity: 0; }
  100% { transform: scale(1.9); opacity: 0; }
}
.ts-hotspot-ring { animation: ts-hotspot-pulse 2.2s var(--ts-ease-in-out) infinite; }
`;

export default function HotspotListActivity({ step, evidence, onEvidence }: ActivityProps) {
  const payload = step.payload as HotspotListPayload;
  const prior = (evidence?.value ?? null) as HotspotsValue | null;

  const [visited, setVisited] = useState<string[]>(() => prior?.visited ?? []);
  /* Resume/revisit opens on the last waypoint this rider read: a finished
   * activity must never greet them with its own empty prompt. The sheet stays
   * shut on mount — only a tap opens it — so mobile still lands on the scene. */
  const [openId, setOpenId] = useState<string | null>(() => {
    const seen = prior?.visited ?? [];
    for (let i = seen.length - 1; i >= 0; i--) {
      if (payload.hotspots.some((h) => h.id === seen[i])) return seen[i];
    }
    return null;
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [revisit] = useState(Boolean(evidence?.complete));

  const total = payload.hotspots.length;
  const allVisited = visited.length === total;
  const open = payload.hotspots.find((h) => h.id === openId) ?? null;
  const openIndex = open ? payload.hotspots.indexOf(open) : -1;
  const nextUnvisited = payload.hotspots.find(
    (h) => !visited.includes(h.id) && h.id !== openId,
  );

  const visit = (hotspot: Hotspot) => {
    setOpenId(hotspot.id);
    setSheetOpen(true);
    if (visited.includes(hotspot.id)) return;
    const next = [...visited, hotspot.id];
    setVisited(next);
    onEvidence({
      kind: "hotspots",
      value: { visited: next },
      complete: payload.requireAll ? next.length === total : next.length > 0,
    });
  };

  const detail = (hotspot: Hotspot, index: number) => {
    /* C-120…C-134: the scene shows *where* the waypoint is, the inset shows
     * *what you are looking at* — a zoom in the same drawing conventions.
     * Authored 320x240, so present it at 4:3; the base scene's 5:3 is a
     * coordinate contract and is set independently below. An unmapped hotspot
     * gets `undefined` here and the panel renders exactly as it did before.
     *
     * The 15rem cap is the desktop panel's own inner width: it makes the plate
     * the same size on both surfaces, and stops the bottom sheet from spending
     * half its 75dvh on the picture and pushing the field note out of view. */
    const insetSlot = hotspotInsetSlot(step.id, hotspot.id);
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <span className="relative grid size-7 shrink-0 place-items-center">
            <span className="absolute size-5 rotate-45 rounded-[4px] bg-pine-700" />
            <span className="relative font-mono text-xs font-medium text-paper-0">{index + 1}</span>
          </span>
          <h3 className="font-display text-lg font-bold text-pine-950">{hotspot.label}</h3>
        </div>
        {insetSlot && <SlotArt slot={insetSlot} ratio="4 / 3" className="w-full max-w-60" />}
        <p className="text-sm leading-relaxed text-pine-950">
          <Markdown inline md={hotspot.description} />
        </p>
        {hotspot.detail && (
          <div className="rounded-sm border border-line-200 bg-moss-100/60 px-3.5 py-3 text-sm text-ink-500">
            <Markdown md={hotspot.detail} />
          </div>
        )}
        {nextUnvisited && (
          <button
            type="button"
            onClick={() => visit(nextUnvisited)}
            className="inline-flex min-h-11 items-center gap-2 self-start rounded-sm px-1 text-sm font-medium text-pine-700 transition-colors duration-(--ts-dur-fast) hover:text-pine-950"
          >
            Next waypoint: {nextUnvisited.label}
            <MoveRight className="size-4" strokeWidth={1.5} aria-hidden />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <style>{MARKER_KEYFRAMES}</style>

      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* Scene with positioned markers. Hotspot bases are authored on a
         * 500x300 canvas (assets/manifest.json) — the frame must stay 5:3 so
         * the payload's percent coordinates land on the drawn features. */}
        <figure className="min-w-0">
          <div className="relative">
            <SlotArt slot={payload.assetSlot} ratio="5 / 3" />
            {payload.hotspots.map((hotspot, i) => {
              const isVisited = visited.includes(hotspot.id);
              const isOpen = hotspot.id === openId;
              return (
                <button
                  key={hotspot.id}
                  type="button"
                  onClick={() => visit(hotspot)}
                  aria-label={`Waypoint ${i + 1}: ${hotspot.label}${isVisited ? " (visited)" : ""}`}
                  aria-expanded={isOpen}
                  style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
                  className="absolute grid size-9 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center lg:size-11"
                >
                  {!isVisited && (
                    <span
                      aria-hidden
                      className="ts-hotspot-ring absolute size-5 rounded-full border-2 border-clay-500 opacity-65 lg:size-7"
                    />
                  )}
                  <span
                    aria-hidden
                    className={`absolute size-4 rotate-45 rounded-[4px] border border-paper-0/70 shadow-soft transition-all duration-(--ts-dur-fast) lg:size-5 ${
                      isVisited ? "bg-pine-700" : "bg-clay-500"
                    } ${isOpen ? "scale-125" : ""}`}
                  />
                  <span className="relative font-mono text-[10px] font-medium text-paper-0 lg:text-xs">
                    {i + 1}
                  </span>
                </button>
              );
            })}
          </div>
          <figcaption className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm italic text-ink-500">{payload.intro}</span>
            <span className="font-mono text-sm text-ink-500" aria-live="polite">
              {visited.length} of {total} explored
            </span>
          </figcaption>
        </figure>

        {/* Desktop side panel */}
        {/* Stretches to the scene's height so the two-column band has no void
         * under the right card. */}
        <aside
          aria-label="Waypoint details"
          className="hidden rounded-md border border-line-200 bg-paper-0 p-5 lg:flex lg:flex-col"
        >
          {open ? (
            detail(open, openIndex)
          ) : (
            <div className="flex flex-col items-start gap-3 py-2">
              <MapPin className="size-5 text-clay-500" strokeWidth={1.5} aria-hidden />
              <p className="text-sm font-semibold text-pine-950">Pick a waypoint</p>
              <p className="text-sm text-ink-500">
                Tap any marker on the scene — or use the waypoint list — and its field notes appear
                here.
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* Accessibility list fallback — mirrors every hotspot as buttons. */}
      <section aria-label="All waypoints">
        <p className="ts-eyebrow">Waypoint list</p>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {payload.hotspots.map((hotspot, i) => {
            const isVisited = visited.includes(hotspot.id);
            const isOpen = hotspot.id === openId;
            return (
              <li key={hotspot.id}>
                <button
                  type="button"
                  onClick={() => visit(hotspot)}
                  aria-expanded={isOpen}
                  className={`flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-sm border px-3 py-2 text-left text-sm font-medium transition-all duration-(--ts-dur-fast) active:scale-[0.98] ${
                    isOpen
                      ? "border-pine-700 bg-pine-300/15 text-pine-950"
                      : "border-line-200 bg-paper-0 text-pine-950 hover:-translate-y-0.5 hover:border-pine-300"
                  }`}
                >
                  <BlazeMarker
                    state={isVisited ? "done" : "active"}
                    size="m"
                    label={isVisited ? "Visited" : "Not yet visited"}
                  />
                  <span className="min-w-0 flex-1">{hotspot.label}</span>
                  <span className="font-mono text-xs text-ink-500">{i + 1}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {allVisited && (
        <FeedbackStrip
          tone="positive"
          label="Every waypoint explored"
          animate={!revisit}
          md="You've read the whole scene. The waypoints above stay open — revisit any of them before you continue."
        />
      )}

      {/* Mobile bottom sheet */}
      <BottomSheet
        open={sheetOpen && Boolean(open)}
        onClose={() => setSheetOpen(false)}
        title={open?.label ?? "Waypoint"}
      >
        {open && detail(open, openIndex)}
      </BottomSheet>
    </div>
  );
}
