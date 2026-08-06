/**
 * SlotArt — the DESIGNED placeholder for illustration slots (DESIGN-002
 * §Illustration slots): contour panel + blaze + slot label in mono. Acceptable
 * at waves 0–1; real art replaces it by wave 3. Slots tracked in
 * src/assets/manifest.json.
 */
import { ContourPanel } from "./ContourPanel";
import { BlazeMarker } from "./BlazeMarker";

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
