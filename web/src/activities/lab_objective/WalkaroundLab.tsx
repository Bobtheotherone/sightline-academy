/* WalkaroundLab (SPEC-007 §11, Module 2) — showcase piece. A top-down ATV
 * authored inline in the house style (flat vector, brand tokens, 1.5px pine
 * linework). Stage 1: drag (or tap-to-assign) the five T-CLOC zone labels onto
 * the machine — wrong drops shake back with a positional hint, correct drops
 * settle with a blaze check. Stage 2: step through each zone's "what you're
 * looking for" awareness card. Objectives place_all and review_all tick live
 * in the shared checklist.
 */
import { useState, type DragEvent } from "react";
import { ChevronLeft, ChevronRight, GripVertical, Search } from "lucide-react";
import { Button } from "../../components/Button";
import { BlazeMarker } from "../../components/BlazeMarker";
import { FeedbackStrip } from "../../components/FeedbackStrip";
import { BlazeCheckDraw } from "../motion";
import { BottomSheet } from "../sheet";
import type { LabComponentProps } from "./index";
import { WALKAROUND_ZONES, type WalkaroundZone } from "./walkaroundZones";

/* The drawing is inset inside a 4:3 plate so the placed labels have somewhere
 * to live that isn't on top of the machine. Both axes scale by the same factor
 * (the plate and the drawing share 4:3), so one mapping serves for x and y. */
const MACHINE_SCALE = 0.72;
const toScene = (v: number) => (100 * (1 - MACHINE_SCALE)) / 2 + MACHINE_SCALE * v;

export function WalkaroundLab({ payload, met, meet, revisit }: LabComponentProps) {
  const config = payload.config as { zones?: string[] };
  const zones = (config.zones ?? [])
    .map((id) => WALKAROUND_ZONES[id])
    .filter((z): z is WalkaroundZone => Boolean(z));

  const [placed, setPlaced] = useState<Set<string>>(
    () => new Set(met.has("place_all") ? zones.map((z) => z.id) : []),
  );
  const [viewed, setViewed] = useState<Set<string>>(
    () => new Set(met.has("review_all") ? zones.map((z) => z.id) : []),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [wrong, setWrong] = useState<{ zoneId: string; n: number } | null>(null);
  const [justPlacedId, setJustPlacedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [cardIndex, setCardIndex] = useState<number | null>(null);

  const allPlaced = placed.size === zones.length && zones.length > 0;
  const stage: 1 | 2 = allPlaced ? 2 : 1;
  const trayZones = zones.filter((z) => !placed.has(z.id));
  const wrongZone = wrong ? zones.find((z) => z.id === wrong.zoneId) : undefined;

  const attempt = (labelId: string, regionId: string) => {
    if (placed.has(labelId)) return;
    setSelectedId(null);
    setDragOverId(null);
    if (labelId === regionId) {
      const next = new Set(placed);
      next.add(labelId);
      setPlaced(next);
      setJustPlacedId(labelId);
      setWrong(null);
      if (next.size === zones.length) meet("place_all");
    } else {
      setWrong((w) => ({ zoneId: labelId, n: (w?.n ?? 0) + 1 }));
      setShakingId(labelId);
    }
  };

  const openCard = (index: number) => {
    const zone = zones[index];
    if (!zone) return;
    setCardIndex(index);
    const next = new Set(viewed);
    next.add(zone.id);
    setViewed(next);
    if (next.size === zones.length) meet("review_all");
  };

  const onDrop = (e: DragEvent, regionId: string) => {
    e.preventDefault();
    const labelId = e.dataTransfer.getData("text/plain");
    if (labelId) attempt(labelId, regionId);
  };

  const card = (zone: WalkaroundZone, index: number) => (
    <article aria-label={`${zone.name} awareness card`} className="flex flex-col gap-3.5">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-sm bg-pine-950 font-mono text-xl font-medium text-sun-400">
          {zone.letter}
        </span>
        <div className="min-w-0">
          <p className="ts-eyebrow">
            Zone {index + 1} of {zones.length}
          </p>
          <h3 className="font-display text-lg font-bold text-pine-950">{zone.name}</h3>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-pine-700">
          What you're looking for
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-pine-950">{zone.looking}</p>
      </div>
      <p className="border-l-2 border-pine-300 pl-3 text-sm italic text-ink-500">{zone.why}</p>
      <nav aria-label="Zone cards" className="mt-1 flex items-center justify-between gap-2">
        <Button
          variant="secondary"
          size="s"
          disabled={index === 0}
          onClick={() => openCard(index - 1)}
          iconLeft={<ChevronLeft className="size-4" strokeWidth={1.5} aria-hidden />}
        >
          Back
        </Button>
        <span className="flex items-center gap-1.5" aria-hidden>
          {zones.map((z, i) => (
            <BlazeMarker
              key={z.id}
              state={i === index ? "active" : viewed.has(z.id) ? "done" : "todo"}
              size="s"
            />
          ))}
        </span>
        {index < zones.length - 1 ? (
          <Button
            size="s"
            className="whitespace-nowrap"
            onClick={() => openCard(index + 1)}
            iconRight={<ChevronRight className="size-4" strokeWidth={1.5} aria-hidden />}
          >
            Next zone
          </Button>
        ) : (
          <Button size="s" variant="secondary" onClick={() => setCardIndex(null)}>
            Done
          </Button>
        )}
      </nav>
    </article>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Scene */}
        <figure className="min-w-0">
          <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-line-200 bg-paper-0">
            {/* The machine, inset so the labels have a margin to park in.
             * Unplaced regions are compact round targets on the drawing; once
             * placed, the region keeps only its blaze and the name parks out in
             * the margin, joined back by a leader line. */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ width: `${MACHINE_SCALE * 100}%` }}
            >
              <AtvTopDown />
              {zones
                .filter((zone) => !placed.has(zone.id))
                .map((zone) => {
                  const targetable = Boolean(selectedId) || dragOverId === zone.id;
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => selectedId && attempt(selectedId, zone.id)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverId(zone.id);
                      }}
                      onDragLeave={() => setDragOverId((z) => (z === zone.id ? null : z))}
                      onDrop={(e) => onDrop(e, zone.id)}
                      aria-label={
                        selectedId
                          ? `Place "${zones.find((z) => z.id === selectedId)?.name}" on the ${zone.regionName.toLowerCase()}`
                          : `Drop region: ${zone.regionName.toLowerCase()}`
                      }
                      style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
                      className={`absolute grid size-9 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-2 border-dashed font-mono text-sm transition-all duration-(--ts-dur-fast) lg:size-10 ${
                        targetable
                          ? "scale-110 border-pine-700 bg-pine-300/35 text-pine-700"
                          : "border-pine-300 bg-paper-0/70 text-ink-500 hover:border-pine-700 hover:bg-pine-300/15"
                      }`}
                    >
                      <span aria-hidden>?</span>
                    </button>
                  );
                })}
            </div>

            {/* Leader lines: each parked label back to the region it annotates. */}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden
              className="pointer-events-none absolute inset-0 size-full"
            >
              {zones
                .filter((zone) => placed.has(zone.id))
                .map((zone) => (
                  <line
                    key={zone.id}
                    x1={toScene(zone.x)}
                    y1={toScene(zone.y)}
                    x2={zone.labelX}
                    y2={zone.labelY}
                    stroke="var(--ts-pine-700)"
                    strokeWidth="1"
                    strokeOpacity="0.5"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
            </svg>

            {/* The blaze the drop earned, drawn on the region it belongs to. */}
            {zones
              .filter((zone) => placed.has(zone.id))
              .map((zone) => (
                <span
                  key={zone.id}
                  aria-hidden
                  style={{ left: `${toScene(zone.x)}%`, top: `${toScene(zone.y)}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                >
                  <BlazeCheckDraw />
                </span>
              ))}

            {/* Placed labels, parked clear of the drawing. */}
            {zones
              .filter((zone) => placed.has(zone.id))
              .map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => stage === 2 && openCard(zones.indexOf(zone))}
                  aria-label={
                    stage === 1
                      ? `${zone.regionName}: ${zone.name} placed`
                      : `Review ${zone.name}`
                  }
                  style={{ left: `${zone.labelX}%`, top: `${zone.labelY}%` }}
                  className={`absolute flex min-h-9 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm border-2 border-pine-700 bg-paper-0 px-1.5 py-1 text-center text-xs leading-tight font-semibold text-pine-950 shadow-soft transition-colors duration-(--ts-dur-fast) lg:min-h-11 lg:w-20 ${
                    stage === 2 ? "cursor-pointer hover:bg-pine-300/20" : ""
                  } ${justPlacedId === zone.id ? "ts-act-settle" : ""}`}
                >
                  <span className="min-w-0 max-lg:hidden">{zone.name}</span>
                  <span className="font-mono text-sm lg:hidden" aria-hidden>
                    {zone.letter}
                  </span>
                </button>
              ))}
          </div>
          <figcaption className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm italic text-ink-500">
              Top-down view — front of the machine at the top.
            </span>
            <span className="font-mono text-sm text-ink-500" aria-live="polite">
              {stage === 1
                ? `${placed.size} of ${zones.length} placed`
                : `${viewed.size} of ${zones.length} reviewed`}
            </span>
          </figcaption>
        </figure>

        {/* Stage panel */}
        <div className="min-w-0">
          {stage === 1 ? (
            <section aria-label="Zone labels">
              <p className="ts-eyebrow">Zone labels</p>
              <p className="mt-1 text-sm text-ink-500">
                {selectedId
                  ? "Now tap the machine region where it belongs."
                  : "Drag a label onto the machine — or tap it, then tap its region."}
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {trayZones.map((zone) => {
                  const isSelected = selectedId === zone.id;
                  return (
                    <li
                      key={zone.id}
                      className={shakingId === zone.id ? "ts-act-shake" : ""}
                      onAnimationEnd={() =>
                        setShakingId((s) => (s === zone.id ? null : s))
                      }
                    >
                      <button
                        type="button"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", zone.id);
                          setSelectedId(null);
                        }}
                        onClick={() => setSelectedId(isSelected ? null : zone.id)}
                        aria-pressed={isSelected}
                        className={`flex min-h-11 w-full cursor-grab items-center gap-2 rounded-sm border px-3 py-2 text-sm font-medium text-pine-950 transition-all duration-(--ts-dur-fast) active:scale-[0.98] ${
                          isSelected
                            ? "border-pine-700 bg-pine-300/15"
                            : "border-line-200 bg-paper-0 hover:-translate-y-0.5 hover:border-pine-300"
                        }`}
                      >
                        <GripVertical
                          className="size-4 shrink-0 text-ink-500/60"
                          strokeWidth={1.5}
                          aria-hidden
                        />
                        {zone.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : (
            <>
              {/* Desktop: card inline in the panel */}
              <div className="hidden rounded-md border border-line-200 bg-paper-0 p-5 lg:block">
                {cardIndex !== null && zones[cardIndex] ? (
                  card(zones[cardIndex], cardIndex)
                ) : (
                  <ReviewIntro viewedCount={viewed.size} total={zones.length} onStart={() => openCard(0)} />
                )}
              </div>
              {/* Mobile: zone list opens the bottom sheet */}
              <div className="lg:hidden">
                <p className="ts-eyebrow">Zone review</p>
                <p className="mt-1 text-sm text-ink-500">
                  All five placed. Open each zone to see what its check looks for.
                </p>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {zones.map((zone, i) => (
                    <li key={zone.id}>
                      <button
                        type="button"
                        onClick={() => openCard(i)}
                        className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-sm border border-line-200 bg-paper-0 px-3 py-2 text-left text-sm font-medium text-pine-950 transition-all duration-(--ts-dur-fast) hover:border-pine-300 active:scale-[0.98]"
                      >
                        <BlazeMarker
                          state={viewed.has(zone.id) ? "done" : "active"}
                          size="m"
                          label={viewed.has(zone.id) ? "Reviewed" : "Not reviewed yet"}
                        />
                        <span className="min-w-0 flex-1">{zone.label}</span>
                        <ChevronRight
                          className="size-4 text-ink-500"
                          strokeWidth={1.5}
                          aria-hidden
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {wrongZone && stage === 1 && (
        <FeedbackStrip
          key={`wrong-${wrong?.n}`}
          tone="caution"
          label={`Not where "${wrongZone.name}" lives`}
          md={wrongZone.hint}
        />
      )}

      {revisit && stage === 2 && viewed.size === zones.length && cardIndex === null && (
        <p className="text-sm text-ink-500">
          Zones stay open on revisit — tap any placed label to reread its card.
        </p>
      )}

      {/* Mobile card sheet */}
      <BottomSheet
        open={stage === 2 && cardIndex !== null}
        onClose={() => setCardIndex(null)}
        title={cardIndex !== null && zones[cardIndex] ? zones[cardIndex].name : "Zone card"}
      >
        {cardIndex !== null && zones[cardIndex] && card(zones[cardIndex], cardIndex)}
      </BottomSheet>
    </div>
  );
}

function ReviewIntro({
  viewedCount,
  total,
  onStart,
}: {
  viewedCount: number;
  total: number;
  onStart: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3">
      <Search className="size-5 text-clay-500" strokeWidth={1.5} aria-hidden />
      <p className="text-sm font-semibold text-pine-950">All five zones placed</p>
      <p className="text-sm text-ink-500">
        Now walk the machine: step through what each zone's check is actually looking for.
      </p>
      <Button size="s" onClick={onStart}>
        {viewedCount >= total
          ? "Reread the zones"
          : viewedCount > 0
            ? "Continue the review"
            : "Start the review"}
      </Button>
    </div>
  );
}

/* ── The scene: top-down ATV in the house style ──────────────────────────── */

function AtvTopDown() {
  const ink = "var(--ts-pine-950)";
  return (
    <svg
      viewBox="0 0 480 360"
      role="img"
      aria-label="Top-down illustration of an ATV: handlebars and headlights at the front, fuel tank and seat in the middle, cargo racks front and rear, a wheel at each corner."
      className="block h-auto w-full"
    >
      {/* Ground pad */}
      <ellipse cx="240" cy="190" rx="196" ry="162" fill="var(--ts-moss-100)" />
      {/* Front bumper */}
      <path d="M204 44 Q240 20 276 44" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      {/* Headlights */}
      <rect x="210" y="24" width="18" height="11" rx="3.5" fill="var(--ts-sun-400)" stroke={ink} strokeWidth="1.5" />
      <rect x="252" y="24" width="18" height="11" rx="3.5" fill="var(--ts-sun-400)" stroke={ink} strokeWidth="1.5" />
      {/* Front rack */}
      <rect x="168" y="48" width="144" height="26" rx="6" fill="var(--ts-paper-0)" stroke={ink} strokeWidth="1.5" />
      <path d="M196 48v26M224 48v26M252 48v26M280 48v26" stroke={ink} strokeWidth="1.5" opacity="0.45" />
      {/* Wheels */}
      {[
        [64, 82],
        [362, 82],
        [64, 216],
        [362, 216],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="54" height="68" rx="16" fill={ink} />
          <path
            d={`M${x + 8} ${y + 18}h38M${x + 8} ${y + 34}h38M${x + 8} ${y + 50}h38`}
            stroke="var(--ts-paper-0)"
            strokeWidth="2"
            opacity="0.3"
            strokeLinecap="round"
          />
        </g>
      ))}
      {/* Body: front fender bar + tub + rear fender bar as one silhouette */}
      <path
        d="M142 76 H338 A14 14 0 0 1 352 90 A14 14 0 0 1 338 104 H304 C310 140 310 220 304 256 H338 A14 14 0 0 1 352 270 A14 14 0 0 1 338 284 H142 A14 14 0 0 1 128 270 A14 14 0 0 1 142 256 H176 C170 220 170 140 176 104 H142 A14 14 0 0 1 128 90 A14 14 0 0 1 142 76 Z"
        fill="var(--ts-pine-300)"
        stroke={ink}
        strokeWidth="1.5"
      />
      {/* Handlebars */}
      <path d="M240 112 v-14" stroke={ink} strokeWidth="5" strokeLinecap="round" />
      <path d="M152 106 C192 86 288 86 328 106" fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" />
      <circle cx="152" cy="106" r="7" fill="var(--ts-clay-500)" stroke={ink} strokeWidth="1.5" />
      <circle cx="328" cy="106" r="7" fill="var(--ts-clay-500)" stroke={ink} strokeWidth="1.5" />
      {/* Brake levers */}
      <path d="M166 96 l20 -12 M314 96 l-20 -12" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
      {/* Fuel tank with cap */}
      <rect x="206" y="146" width="68" height="52" rx="12" fill="var(--ts-paper-0)" stroke={ink} strokeWidth="1.5" />
      <circle cx="240" cy="164" r="8" fill="var(--ts-clay-500)" stroke={ink} strokeWidth="1.5" />
      <path d="M236 164 h8" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
      {/* Seat */}
      <rect x="200" y="204" width="80" height="64" rx="18" fill="var(--ts-pine-700)" stroke={ink} strokeWidth="1.5" />
      <path d="M212 226 h56 M212 246 h56" stroke="var(--ts-paper-0)" strokeWidth="1.5" opacity="0.35" />
      {/* Rear rack */}
      <rect x="168" y="292" width="144" height="44" rx="6" fill="var(--ts-paper-0)" stroke={ink} strokeWidth="1.5" />
      <path
        d="M196 292v44M224 292v44M252 292v44M280 292v44M168 314h144"
        stroke={ink}
        strokeWidth="1.5"
        opacity="0.45"
      />
      {/* Taillights */}
      <rect x="206" y="338" width="13" height="8" rx="2.5" fill="var(--ts-danger-600)" stroke={ink} strokeWidth="1.5" />
      <rect x="261" y="338" width="13" height="8" rx="2.5" fill="var(--ts-danger-600)" stroke={ink} strokeWidth="1.5" />
    </svg>
  );
}
