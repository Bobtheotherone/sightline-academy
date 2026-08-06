/**
 * SlotArt — resolves an illustration slot (DESIGN-002 §Illustration slots) to
 * its house-style SVG plate. Slots, files, and alt text live in
 * src/assets/manifest.json; the art itself in src/assets/svg/. Slots without
 * real art (e.g. the lab-owned walkaround scene) fall back to the designed
 * placeholder: contour panel + blaze + slot label in mono.
 *
 * Plates are drawn on paper-0 with quiet edges and rendered object-contain on
 * a paper-0 ground, so any requested aspect ratio letterboxes invisibly.
 * Hotspot bases (scene-atv-anatomy, scene-trail-hazards) are authored at 5:3 —
 * present those at ratio "5 / 3" so percent coordinates stay exact.
 */
import manifest from "../assets/manifest.json";
import { ContourPanel } from "./ContourPanel";
import { BlazeMarker } from "./BlazeMarker";

interface SlotMeta {
  status: string;
  file?: string;
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

export function SlotArt({
  slot,
  variant = "light",
  ratio = "3 / 2",
  className = "",
}: {
  /** Slot name from DESIGN-002 §Illustration slots (e.g. "hero-landing"). */
  slot: string;
  variant?: "light" | "dark";
  /** CSS aspect-ratio for the plate. */
  ratio?: string;
  className?: string;
}) {
  const meta = SLOTS[slot];
  const src =
    meta?.status === "real" && meta.file
      ? ART_URLS[`../assets/${meta.file}`]
      : undefined;

  if (src) {
    return (
      <span
        style={{ aspectRatio: ratio }}
        className={`block overflow-hidden rounded-md border bg-paper-0 ${
          variant === "dark" ? "border-paper-0/15" : "border-line-200"
        } ${className}`}
      >
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
