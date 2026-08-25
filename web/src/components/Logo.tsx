import { Link } from "react-router-dom";
import { BlazeMarker } from "./BlazeMarker";

/** Wordmark subtitle. One source of truth — the marketing footer renders the
 * same lockup at a larger size and must never drift from this. */
export const WORDMARK_SUBTITLE = "ATV Safety Academy";

/**
 * The Sightline ATV Safety Academy wordmark: blaze glyph + stacked name.
 *
 * Spacing note (the descender fix): "Sightline" is set in Bricolage Grotesque,
 * whose `g` descends about a quarter of its em. With `leading-none` the line
 * box is exactly the font size, so the descender overflows its own box and
 * lands on the caps line beneath — no margin can compensate, because the glyph
 * is outside the box the margin moves. The leading on the name is therefore
 * the load-bearing part of the fix; the gap below it is the finishing touch.
 *
 * `size="s"` is the compact header lockup; `size="l"` is the marketing footer,
 * which previously hand-rolled its own copy of this markup and so had to be
 * fixed twice.
 */
export function Logo({
  to = "/",
  onDark = false,
  size = "s",
  showMarker = true,
  className = "",
}: {
  to?: string;
  onDark?: boolean;
  size?: "s" | "l";
  /** The marketing footer's lockup has never carried the blaze glyph; keeping
   * that true here means the footer can share this component without its
   * appearance changing. */
  showMarker?: boolean;
  className?: string;
}) {
  const large = size === "l";
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2.5 rounded-sm ${className}`}
      aria-label="Sightline ATV Safety Academy — home"
    >
      {showMarker && <BlazeMarker state="active" size="l" />}
      {/* No `leading-none` here: the wrapper's line-height is inherited by the
          subtitle, and zeroing it removes the half-leading that keeps the caps
          clear of the descender above them. */}
      <span className="flex flex-col">
        <span
          className={`font-display font-bold ${large ? "text-3xl leading-[1.1]" : "text-lg leading-[1.15]"} ${
            onDark ? "text-paper-0" : "text-pine-950"
          }`}
        >
          Sightline
        </span>
        <span
          className={`${large ? "mt-1.5 text-xs" : "mt-1 text-[10px]"} font-semibold uppercase ${
            // Slightly tighter tracking than the old two-word subtitle: "ATV
            // Safety Academy" is four characters wider and would otherwise
            // overrun "Sightline" in the narrow header lockup.
            large ? "tracking-[0.14em]" : "tracking-[0.11em]"
          } ${onDark ? "text-paper-0/70" : "text-ink-500"}`}
        >
          {WORDMARK_SUBTITLE}
        </span>
      </span>
    </Link>
  );
}
