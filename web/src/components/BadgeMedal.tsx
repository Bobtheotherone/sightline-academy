import { useEffect, useState } from "react";
import { Medal } from "lucide-react";
import manifest from "../assets/manifest.json";

export type BadgeMedalSize = "m" | "l";

const SIZE: Record<BadgeMedalSize, { frame: string; inner: string; icon: string; art: string }> = {
  m: { frame: "size-16", inner: "size-11", icon: "size-5", art: "size-8" },
  l: { frame: "size-24", inner: "size-16", icon: "size-7", art: "size-11" },
};

/** Badge plates from the manifest (badge-<id> slots), as bundled URLs. */
const ART_URLS = import.meta.glob<string>("../assets/svg/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
});

function badgeArt(badgeId: string): string | undefined {
  const meta = (manifest.slots as Record<string, { status: string; file?: string } | undefined>)[
    `badge-${badgeId}`
  ];
  return meta?.status === "real" && meta.file ? ART_URLS[`../assets/${meta.file}`] : undefined;
}

/**
 * BadgeMedal (DESIGN-002 §Learning): badge art in a blaze-shaped frame — the
 * rotated rounded-diamond signature at medal scale. Earned medals get the
 * pine frame with a sun-gold art plate; unearned render as embossed outlines.
 * The badge-<id> slot's plate renders inside the frame (Wave 3 art); the medal
 * glyph remains the fallback for ids without shipped art.
 */
export function BadgeMedal({
  badgeId,
  name,
  earned,
  detail,
  size = "m",
  ceremony = false,
  className = "",
}: {
  badgeId: string;
  name: string;
  earned: boolean;
  /** Small line under the name (trigger copy or award date). */
  detail?: string;
  size?: BadgeMedalSize;
  /**
   * The earn ceremony (DESIGN-004 §Ceremonies 3): spring scale 0.85→1 with one
   * shine sweep across the medal, once. Off on the shelf — earn time only.
   */
  ceremony?: boolean;
  className?: string;
}) {
  const s = SIZE[size];
  const art = badgeArt(badgeId);
  // idle → run on the next frame → done, at which point the sweep unmounts.
  const [sweep, setSweep] = useState<"idle" | "run" | "done">(ceremony ? "idle" : "done");
  useEffect(() => {
    if (!ceremony) return;
    const frame = requestAnimationFrame(() => setSweep("run"));
    const end = window.setTimeout(() => setSweep("done"), 800);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(end);
    };
  }, [ceremony]);
  return (
    <figure
      className={`flex flex-col items-center gap-2.5 text-center ${className}`}
      role="img"
      aria-label={`${name} badge — ${earned ? "earned" : "not earned yet"}${detail ? `. ${detail}` : ""}`}
      data-badge-slot={`badge-${badgeId}`}
    >
      <span
        className={`relative grid ${s.frame} place-items-center ${
          ceremony
            ? `transition-transform duration-(--ts-dur-epic) ease-spring ${
                sweep === "idle" ? "scale-[0.85]" : "scale-100"
              }`
            : ""
        }`}
        aria-hidden
      >
        {/* Blaze-shaped frame */}
        <span
          className={`absolute inset-1 rotate-45 rounded-[22%] border-2 ${
            earned
              ? "border-pine-700 bg-paper-0 shadow-soft"
              : "border-line-200 bg-moss-100"
          }`}
        />
        {/* Art plate — the badge-<id> slot's plate, kept upright inside the
         * rotated frame and inscribed so its corners stay within the diamond;
         * unearned medals show the same art embossed (grayscale, faded). */}
        <span
          className={`relative grid ${s.inner} place-items-center rotate-45 rounded-[22%] ${
            earned ? "bg-sun-400/20" : "bg-transparent"
          }`}
        >
          {art ? (
            <img
              src={art}
              alt=""
              className={`${s.art} -rotate-45 ${earned ? "" : "opacity-45 grayscale"}`}
            />
          ) : (
            <Medal
              className={`${s.icon} -rotate-45 ${earned ? "text-sun-400" : "text-line-200"}`}
              strokeWidth={1.5}
            />
          )}
        </span>
        {/* One shine sweep, clipped to the medal, removed once it has crossed. */}
        {sweep !== "done" && (
          <span className="pointer-events-none absolute -inset-2 overflow-hidden">
            <span
              className={`absolute inset-y-0 w-1/2 -skew-x-12 bg-linear-to-r from-transparent via-paper-0/70 to-transparent transition-transform duration-(--ts-dur-epic) ease-(--ts-ease-in-out) ${
                sweep === "run" ? "translate-x-[220%]" : "-translate-x-[160%]"
              }`}
            />
          </span>
        )}
      </span>
      <figcaption className="flex flex-col gap-0.5">
        <span
          className={`text-xs font-semibold leading-tight ${
            earned ? "text-pine-950" : "text-ink-500"
          }`}
        >
          {name}
        </span>
        {detail && <span className="text-xs leading-tight text-ink-500">{detail}</span>}
      </figcaption>
    </figure>
  );
}
