import { Link } from "react-router-dom";
import { BlazeMarker } from "./BlazeMarker";

/** The Sightline Safety Academy wordmark: blaze glyph + stacked name. */
export function Logo({
  to = "/",
  onDark = false,
  className = "",
}: {
  to?: string;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2.5 rounded-sm ${className}`}
      aria-label="Sightline Safety Academy — home"
    >
      <BlazeMarker state="active" size="l" />
      <span className="flex flex-col leading-none">
        <span
          className={`font-display text-lg leading-none font-bold ${onDark ? "text-paper-0" : "text-pine-950"}`}
        >
          Sightline
        </span>
        <span
          className={`mt-0.5 text-[10px] font-semibold tracking-[0.14em] uppercase ${
            onDark ? "text-paper-0/70" : "text-ink-500"
          }`}
        >
          Safety Academy
        </span>
      </span>
    </Link>
  );
}
