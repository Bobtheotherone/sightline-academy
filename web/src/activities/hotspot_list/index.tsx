/* hotspot_list renderer (SPEC-007 §6, DESIGN-004 §Play): two phases on one
 * authored scene.
 *
 * SPOT — the hunt. The scene opens unmarked and the rider taps where they see
 * something worth a closer look. A hit settles a blaze in with the cue's name
 * (retrieval practice — the asset registry's own acceptance criterion for the
 * hazards scene is "name the cues WITHOUT the markers on"); a miss gets one
 * soft ripple and costs nothing. Giving up is always one tap away and names
 * how many are left, and keyboard riders aim a crosshair with the arrow keys.
 * Spotting unaided feeds the lesson's sharp streak; hunt misses are scanning,
 * not answers, so they never break it.
 *
 * A hotspot may carry a traced `region` — the outline of the feature it names.
 * When it does, that polygon (plus a small tolerance) is the hit target, so a
 * tap has to land on the log, the ruts, the gravel. Without one the hotspot
 * keeps the older elliptical window around its centre.
 *
 * REVIEW — the read. Exactly the classic renderer: markers pulse until
 * visited, panels/bottom sheet carry the field notes, the list mirrors every
 * hotspot for accessibility, and completion still means visiting all of them.
 * Evidence and completion contracts are untouched by the hunt — finding a cue
 * is not the same as reading it.
 *
 * Resume/revisit skips straight to REVIEW: the hunt is a first-encounter
 * moment, never a toll gate.
 */
import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Crosshair, Eye, MapPin, MoveRight } from "lucide-react";
import type { ActivityProps, Hotspot, HotspotListPayload, HotspotsValue } from "../types";
import { SlotArt } from "../../components/SlotArt";
import { hotspotInsetSlot } from "../../assets/slotmap";
import { BlazeMarker } from "../../components/BlazeMarker";
import { FeedbackStrip } from "../../components/FeedbackStrip";
import { Markdown } from "../Markdown";
import { BottomSheet } from "../sheet";
import { CleanRun, useStreak } from "../streak";

/* Elliptical hit window around each authored coordinate, in scene percent.
 * ±9% width / ±14% height ≈ a 45px-radius target on the 500x300 canvas —
 * forgiving enough for thumbs, honest enough that a guess still has to land
 * on the feature. This is the FALLBACK: it applies to any hotspot that has
 * not been given a traced `region`, and it is why an oval on a scene with a
 * dozen small cues used to accept taps well clear of the thing being named. */
const HIT_RX = 9;
const HIT_RY = 14;

/* The scene is authored on a 500x300 canvas, so working in those units keeps
 * distance isotropic — one unit is the same length across and down, which
 * percent-of-width and percent-of-height are not. */
const CANVAS_W = 500;
const CANVAS_H = 300;
/* Forgiving margin around a traced region, in canvas units (~1.8% of width,
 * about 13px at a 700px-wide scene). Thin cues — the downed limb is only ~10
 * units deep — stay a fair tap without the region having to claim ground it
 * does not mean. */
const REGION_TOLERANCE = 9;

type Pt = [number, number];

const toCanvas = (x: number, y: number): Pt => [(x / 100) * CANVAS_W, (y / 100) * CANVAS_H];

/** Ray-cast point-in-polygon. */
function inPolygon([px, py]: Pt, poly: Pt[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Shortest distance from a point to a segment, in canvas units. */
function segmentDistance([px, py]: Pt, [ax, ay]: Pt, [bx, by]: Pt): number {
  const vx = bx - ax;
  const vy = by - ay;
  const len = vx * vx + vy * vy;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / len)) : 0;
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
}

/** True when the tap lands in the traced shape, or within tolerance of it. */
function inRegion(point: Pt, region: [number, number][]): boolean {
  const poly = region.map(([x, y]) => toCanvas(x, y));
  if (inPolygon(point, poly)) return true;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if (segmentDistance(point, poly[j], poly[i]) <= REGION_TOLERANCE) return true;
  }
  return false;
}
/** Crosshair nudge per arrow press (percent of scene); Shift steps bigger. */
const STEP = 2;
const STEP_BIG = 6;

/* Marker shape, by base plate.
 *
 * The default is a PIN: a filled diamond dropped on the feature it names. That
 * is right when the feature is a big drawn thing you point INTO — a wheel, a
 * brake caliper on scene-atv-anatomy — where a pin covering a few percent of it
 * costs nothing.
 *
 * scene-six-decisions is the opposite case. Each waypoint there IS a small drawn
 * medallion, only a little larger than the marker itself, so a pin centred on
 * one hides the very drawing the step exists to teach — and it cannot just be
 * pushed clear, because the top and bottom medallions sit close to the plate
 * edge. There the marker becomes a SEAL: a clay disc that covers the medallion
 * until it is opened, then irises away from the centre to reveal it.
 *
 * A plate opts into that treatment by registering an alpha CUT-OUT twin — the
 * same artwork with its background flood-filled to transparent. The renderer
 * stacks plate / pink / cut-out / controls, which is what lets the ping and the
 * selection disc sit UNDER the drawing instead of painting over it. */
const CUTOUT_TWIN: Record<string, string> = {
  "scene-six-decisions": "scene-six-decisions-cut",
};

/** Medallion diameter as a share of plate width (186px measured on a 1707px
 * plate). Everything on these markers is sized from this, so the geometry holds
 * at any viewport instead of only where a fixed pixel size happens to match. */
const MEDALLION = "10.9%";

interface Ripple {
  x: number;
  y: number;
  n: number;
}

export default function HotspotListActivity({ step, evidence, onEvidence }: ActivityProps) {
  const payload = step.payload as HotspotListPayload;
  const prior = (evidence?.value ?? null) as HotspotsValue | null;
  const streak = useStreak();

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

  /* The hunt is for first encounters only — any prior progress (or a finished
   * step) lands directly in review. */
  /* Which phase the step opens on.
   *
   * A learner with progress always returns to the read. A learner with none
   * used to land in the hunt, which paints the plate bare — medallions
   * unsealed, no numbers, no clay. That is the state the step was reported
   * "broken" in: it looks like the artwork lost its treatment rather than like
   * an invitation to hunt, and deleting an account put every fresh signup
   * straight back into it. The hunt is now opt-in per step via `spotFirst`,
   * so the default first impression is the sealed, pulsing, numbered plate. */
  const [phase, setPhase] = useState<"spot" | "review">(() => {
    const hasProgress = evidence?.complete || (prior?.visited?.length ?? 0) > 0;
    if (hasProgress) return "review";
    return payload.spotFirst ? "spot" : "review";
  });
  const [found, setFound] = useState<string[]>([]);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleSeq = useRef(0);
  const [cross, setCross] = useState<{ x: number; y: number } | null>(null);
  const [announce, setAnnounce] = useState("");
  /** True when every cue was spotted unaided — earns the clean-run moment. */
  const [sweptClean, setSweptClean] = useState(false);

  const cutSlot = CUTOUT_TWIN[payload.assetSlot];
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

  /* ---- Spot phase mechanics ---- */

  const guess = (x: number, y: number) => {
    /* A traced region wins outright — it is the shape of the thing being
     * named, so there is nothing to rank. Only the ellipse fallback needs a
     * tie-break, and there the nearest centre is the honest answer. */
    const point = toCanvas(x, y);
    let best: Hotspot | null = null;
    let bestD = Infinity;
    for (const h of payload.hotspots) {
      if (found.includes(h.id)) continue;
      if (h.region?.length) {
        if (inRegion(point, h.region)) {
          best = h;
          break;
        }
        continue;
      }
      const d = ((x - h.x) / HIT_RX) ** 2 + ((y - h.y) / HIT_RY) ** 2;
      if (d <= 1 && d < bestD) {
        best = h;
        bestD = d;
      }
    }
    if (best) {
      const hit = best;
      const nextFound = [...found, hit.id];
      setFound(nextFound);
      setAnnounce(`Spotted: ${hit.label}. ${nextFound.length} of ${total}.`);
      streak.report(true);
      if (nextFound.length === total) {
        setSweptClean(true);
        setPhase("review");
      }
    } else {
      rippleSeq.current += 1;
      const ripple = { x, y, n: rippleSeq.current };
      setRipples((r) => [...r.slice(-2), ripple]);
      window.setTimeout(() => {
        setRipples((r) => r.filter((p) => p.n !== ripple.n));
      }, 600);
    }
  };

  const onSceneClick = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    /* A click places the crosshair too, so pointer and keys stay in sync. */
    setCross({ x, y });
    guess(x, y);
  };

  const onSceneKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const stepBy = e.shiftKey ? STEP_BIG : STEP;
    const at = cross ?? { x: 50, y: 50 };
    const move = (dx: number, dy: number) => {
      e.preventDefault();
      setCross({
        x: Math.min(97, Math.max(3, at.x + dx)),
        y: Math.min(95, Math.max(5, at.y + dy)),
      });
    };
    if (e.key === "ArrowLeft") move(-stepBy, 0);
    else if (e.key === "ArrowRight") move(stepBy, 0);
    else if (e.key === "ArrowUp") move(0, -stepBy);
    else if (e.key === "ArrowDown") move(0, stepBy);
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (cross) guess(cross.x, cross.y);
      else setCross(at);
    }
  };

  const reveal = () => setPhase("review");

  const foundHotspots = payload.hotspots.filter((h) => found.includes(h.id));

  /* ---- Shared detail body (review panel + bottom sheet) ---- */

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

  /* ---- Spot phase ---- */

  if (phase === "spot") {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <figure className="min-w-0">
            <div className="relative overflow-hidden rounded-md">
              <SlotArt slot={payload.assetSlot} ratio="5 / 3" />
              {/* One overlay button owns every pointer/keyboard interaction;
               * markers, ripples, and the crosshair render above it inert. */}
              <button
                type="button"
                onClick={onSceneClick}
                onKeyDown={onSceneKey}
                aria-label={`Spot check: aim with the arrow keys and press Enter to mark a spot. ${found.length} of ${total} found. Use the button below to be shown the ones you have not found.`}
                className="absolute inset-0 cursor-crosshair rounded-md"
              />
              {foundHotspots.map((hotspot) => (
                <span
                  key={hotspot.id}
                  aria-hidden
                  style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
                  className="ts-act-settle pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5"
                >
                  <span className="size-4 shrink-0 rotate-45 rounded-[4px] border border-paper-0/70 bg-pine-700 shadow-soft lg:size-5" />
                  <span className="max-w-32 rounded-sm bg-pine-950/85 px-1.5 py-0.5 text-[11px] font-medium leading-tight text-paper-0">
                    {hotspot.label}
                  </span>
                </span>
              ))}
              {ripples.map((r) => (
                <span
                  key={r.n}
                  aria-hidden
                  style={{ left: `${r.x}%`, top: `${r.y}%` }}
                  className="ts-spot-miss pointer-events-none absolute size-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink-500/70"
                />
              ))}
              {cross && (
                <span
                  aria-hidden
                  style={{ left: `${cross.x}%`, top: `${cross.y}%` }}
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-pine-950/80"
                >
                  <Crosshair className="size-6" strokeWidth={1.5} />
                </span>
              )}
            </div>
            <figcaption className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm italic text-ink-500">{payload.intro}</span>
              <span className="font-mono text-sm text-ink-500">
                Spotted {found.length} of {total}
              </span>
            </figcaption>
          </figure>

          {/* Hunt panel — instructions and the always-open exit. */}
          <aside
            aria-label="Spot check"
            className="flex flex-col gap-3 rounded-md border border-line-200 bg-paper-0 p-5"
          >
            <Eye className="size-5 text-clay-500" strokeWidth={1.5} aria-hidden />
            <p className="text-sm font-semibold text-pine-950">Read the scene first</p>
            <p className="text-sm text-ink-500">
              Tap anywhere you see something worth a closer look. A wrong guess costs nothing —
              this is how trail eyes get built.
            </p>
            {foundHotspots.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Spotted so far">
                {foundHotspots.map((h) => (
                  <li
                    key={h.id}
                    className="rounded-full border border-pine-300 bg-pine-100 px-2.5 py-0.5 text-xs font-medium text-pine-950"
                  >
                    {h.label}
                  </li>
                ))}
              </ul>
            )}
            {/* The way out, always open and never buried: a learner who cannot
             * find a cue should be able to be shown it rather than stall on a
             * hunt. Naming the count makes it a decision, not a mystery. */}
            <button
              type="button"
              onClick={reveal}
              className="mt-auto inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 self-stretch rounded-sm border border-line-200 bg-paper-0 px-4 text-sm font-medium text-pine-950 transition-all duration-(--ts-dur-fast) hover:-translate-y-0.5 hover:border-pine-300 active:scale-[0.98]"
            >
              {found.length === 0
                ? `Show me all ${total}`
                : `Show me the last ${total - found.length}`}
              <MoveRight className="size-4" strokeWidth={1.5} aria-hidden />
            </button>
          </aside>
        </div>
        <p aria-live="polite" className="sr-only">
          {announce}
        </p>
      </div>
    );
  }

  /* ---- Review phase (the classic renderer, plus the hunt's result) ---- */

  return (
    <div className="flex flex-col gap-4">
      {sweptClean && (
        <CleanRun
          label="Spotted them all unaided"
          detail={`All ${total} before the reveal — that's trail eyes. Now read what each one means.`}
        />
      )}
      {!sweptClean && found.length > 0 && (
        <p className="font-mono text-sm text-ink-500">
          You spotted {found.length} of {total} on your own — the rest are marked below.
        </p>
      )}

      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* Scene with positioned markers. Hotspot bases are authored on a
         * 500x300 canvas (assets/manifest.json) — the frame must stay 5:3 so
         * the payload's percent coordinates land on the drawn features. */}
        <figure className="min-w-0">
          <div className="relative">
            <SlotArt slot={payload.assetSlot} ratio="5 / 3" />
            {cutSlot && (
              <>
                {/* Pink, drawn BETWEEN the two copies of the plate: the ping and
                    the selection disc sit on the background but can never paint
                    over a medallion or the rider. It also means neither has to be
                    a hairline ring — a filled disc slightly larger than the
                    medallion reads as a perfect annulus once the artwork masks
                    its middle. */}
                <div aria-hidden className="pointer-events-none absolute inset-0">
                  {payload.hotspots.map((h) => {
                    const seen = visited.includes(h.id);
                    return (
                      <span
                        key={h.id}
                        style={{ left: `${h.x}%`, top: `${h.y}%`, width: MEDALLION }}
                        className="absolute aspect-square -translate-x-1/2 -translate-y-1/2"
                      >
                        {!seen && (
                          <span className="ts-hotspot-ring absolute inset-0 rounded-full bg-clay-500" />
                        )}
                        {seen && h.id === openId && (
                          <span className="absolute -inset-[7%] rounded-full bg-clay-500" />
                        )}
                      </span>
                    );
                  })}
                </div>
                {/* The same plate with its background cut away, laid back on top
                    so the artwork wins over the pink underneath. */}
                <div aria-hidden className="pointer-events-none absolute inset-0">
                  <SlotArt slot={cutSlot} ratio="5 / 3" bleed className="h-full w-full" />
                </div>
              </>
            )}
            {payload.hotspots.map((hotspot, i) => {
              const isVisited = visited.includes(hotspot.id);
              const isOpen = hotspot.id === openId;
              const ringMarker = Boolean(cutSlot);
              return (
                <button
                  key={hotspot.id}
                  type="button"
                  onClick={() => visit(hotspot)}
                  aria-label={`Waypoint ${i + 1}: ${hotspot.label}${isVisited ? " (visited)" : ""}`}
                  aria-expanded={isOpen}
                  style={
                    ringMarker
                      ? /* the medallions are 209px across on a 1707px plate, so the
                           marker is sized as a PERCENTAGE of the plate — a fixed px
                           size only matches at one viewport width and drifts at all
                           the others. */
                        { left: `${hotspot.x}%`, top: `${hotspot.y}%`, width: MEDALLION }
                      : { left: `${hotspot.x}%`, top: `${hotspot.y}%` }
                  }
                  className={`absolute grid -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center ${
                    ringMarker ? "aspect-square" : "size-9 lg:size-11"
                  }`}
                >
                  {ringMarker ? (
                    <>
                      {/* The seal, and the way it opens. The inner disc carries a
                          huge box-shadow, so everything OUTSIDE it is clay; grown
                          from scale 0 to 1 inside a round, clipped parent that
                          reads as an iris opening from the centre rather than a
                          lid shrinking away. -7% so the seal also swallows the
                          helmet icon, which overflows its own medallion. */}
                      <span
                        aria-hidden
                        className="absolute -inset-[7%] overflow-hidden rounded-full"
                      >
                        <span
                          /* inline, not a Tailwind arbitrary value: the
                             utility form of this shadow does not survive the
                             build, and a missing seal means the plate ships
                             already-revealed. */
                          style={{ boxShadow: "0 0 0 9999px var(--ts-clay-500)" }}
                          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-(--ts-dur-slow) ease-(--ts-ease-out) ${
                            isVisited ? "size-[112%]" : "size-0"
                          }`}
                        />
                      </span>
                      {/* One blaze that travels: centred on the seal while shut,
                          gliding out to the rim once the medallion is showing. */}
                      <span
                        aria-hidden
                        style={{
                          left: isVisited ? "80.3%" : "50%",
                          top: isVisited ? "80.3%" : "50%",
                        }}
                        className={`absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center transition-all duration-(--ts-dur-slow) ease-(--ts-ease-out) ${
                          isVisited ? "size-5" : "size-6"
                        }`}
                      >
                        <span
                          className={`absolute inset-0 rotate-45 rounded-[4px] border border-paper-0/80 shadow-soft transition-colors duration-(--ts-dur-base) ${
                            isVisited ? "bg-pine-700" : "bg-pine-950"
                          }`}
                        />
                        <span
                          className={`relative font-mono font-medium text-paper-0 ${
                            isVisited ? "text-[10px]" : "text-[11px]"
                          }`}
                        >
                          {i + 1}
                        </span>
                      </span>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
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
