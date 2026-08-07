/**
 * SlotArt — resolves an illustration slot (DESIGN-002 §Illustration slots) to
 * its art. Slots, files, and alt text live in src/assets/manifest.json.
 *
 * Two media, chosen per slot by `kind` in the manifest:
 *
 *   svg-authored (default) — a house-style plate from src/assets/svg/. Drawn on
 *     paper-0 with quiet edges and rendered object-CONTAIN, so any requested
 *     aspect ratio letterboxes invisibly. This is right for diagrams, where the
 *     drawing IS the information and cropping it would destroy meaning.
 *
 *   raster — a rendered illustration from src/assets/raster/, delivered as a
 *     <picture> with an AVIF/WebP/PNG ladder and rendered object-COVER so it
 *     fills the card edge to edge. Contain would letterbox a full-bleed
 *     illustration against paper-0, which reads as a mistake rather than a
 *     plate. Sources are exported pre-cropped to the presentation aspect, so
 *     cover is not throwing away bytes that were paid for.
 *
 * Slots without real art fall back to the designed placeholder: contour panel
 * + blaze + slot label in mono.
 *
 * Hotspot bases (scene-atv-anatomy, scene-trail-hazards) are authored at 5:3 —
 * present those at ratio "5 / 3" so percent coordinates stay exact. They are
 * svg-authored for exactly this reason and must never become raster.
 */
import manifest from "../assets/manifest.json";
import { ContourPanel } from "./ContourPanel";
import { BlazeMarker } from "./BlazeMarker";

interface SlotMeta {
  status: string;
  kind?: string;
  file?: string;
  /** Raster only: intrinsic widths exported for this slot, largest first. */
  widths?: number[];
  alt?: string;
  note?: string;
}

const SLOTS: Record<string, SlotMeta | undefined> = manifest.slots;

/** Eager URL map of every produced plate, keyed by its path from this file. */
const ART_URLS = import.meta.glob<string>("../assets/svg/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
});

const RASTER_URLS = import.meta.glob<string>("../assets/raster/*.{avif,webp,png}", {
  eager: true,
  query: "?url",
  import: "default",
});

/** Build one format's srcset, skipping widths that failed to export. */
function srcset(slot: string, widths: number[], ext: string): string {
  return widths
    .map((w) => [RASTER_URLS[`../assets/raster/${slot}-${w}w.${ext}`], w] as const)
    .filter(([url]) => Boolean(url))
    .map(([url, w]) => `${url} ${w}w`)
    .join(", ");
}

export function SlotArt({
  slot,
  variant = "light",
  ratio = "3 / 2",
  className = "",
  sizes = "(min-width: 1024px) 50vw, 100vw",
  priority = false,
}: {
  /** Slot name from DESIGN-002 §Illustration slots (e.g. "hero-landing"). */
  slot: string;
  variant?: "light" | "dark";
  /** CSS aspect-ratio for the plate. */
  ratio?: string;
  className?: string;
  /** Raster only: layout hint so the browser picks the right rung. */
  sizes?: string;
  /** Raster only: set on the LCP image so it is not lazy-loaded. */
  priority?: boolean;
}) {
  const meta = SLOTS[slot];
  const frame = `block overflow-hidden rounded-md border bg-paper-0 ${
    variant === "dark" ? "border-paper-0/15" : "border-line-200"
  } ${className}`;

  if (meta?.status === "real" && meta.kind === "raster" && meta.widths?.length) {
    const widths = meta.widths;
    const avif = srcset(slot, widths, "avif");
    const webp = srcset(slot, widths, "webp");
    const png = srcset(slot, widths, "png");
    const fallback =
      RASTER_URLS[`../assets/raster/${slot}-${widths[widths.length - 1]}w.png`];
    if (fallback) {
      return (
        <span style={{ aspectRatio: ratio }} className={frame}>
          <picture>
            {avif && <source type="image/avif" srcSet={avif} sizes={sizes} />}
            {webp && <source type="image/webp" srcSet={webp} sizes={sizes} />}
            <img
              src={fallback}
              srcSet={png || undefined}
              sizes={png ? sizes : undefined}
              alt={meta.alt ?? `Illustration: ${slot}`}
              loading={priority ? "eager" : "lazy"}
              // fetchPriority is a valid img attribute; React 18 passes it through.
              fetchPriority={priority ? "high" : undefined}
              decoding="async"
              className="h-full w-full object-cover"
            />
          </picture>
        </span>
      );
    }
  }

  const src =
    meta?.status === "real" && meta.file ? ART_URLS[`../assets/${meta.file}`] : undefined;

  if (src) {
    return (
      <span style={{ aspectRatio: ratio }} className={frame}>
        <img
          src={src}
          alt={meta?.alt ?? `Illustration plate: ${slot}`}
          className="h-full w-full object-contain"
        />
      </span>
    );
  }

  return (
    <ContourPanel
      variant={variant}
      style={{ aspectRatio: ratio }}
      className={`flex items-center justify-center overflow-hidden rounded-md border ${
        variant === "dark" ? "border-paper-0/15" : "border-line-200"
      } ${className}`}
      role="img"
      aria-label={`Illustration plate: ${slot}`}
    >
      <span className="flex flex-col items-center gap-2.5">
        <BlazeMarker state={variant === "dark" ? "active" : "todo"} size="l" />
        <span
          className={`font-mono text-xs tracking-wide ${
            variant === "dark" ? "text-paper-0/60" : "text-ink-500"
          }`}
        >
          {slot}
        </span>
      </span>
    </ContourPanel>
  );
}
