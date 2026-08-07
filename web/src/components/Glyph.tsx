/**
 * Glyph — the shared renderer for the monochrome UI marks (VISUAL_ASSETS §7.2:
 * B-036…B-042 corpus topics, B-043…B-054 activity types, B-055…B-060 section
 * arc). Every one of these is authored `stroke="currentColor"` with no baked
 * colour precisely so the consuming surface can tint it by state — a rail
 * section that is done reads pine-700, the active one reads pine-950.
 *
 * That is why the markup is INLINED rather than pointed at with <img>: an
 * external image cannot inherit `currentColor`, which would throw away the
 * whole reason these were drawn monochrome. The plate art in `SlotArt` keeps
 * using ?url — those are full-colour and belong out of the JS bundle. Only the
 * three glyph families are globbed here (25 files, ~9 kB raw), never the whole
 * svg/ directory.
 *
 * Unknown names render nothing at all — never a broken box.
 */

/* Eager ?raw glob, narrowed to the three glyph families by prefix. */
const RAW = import.meta.glob<string>(
  [
    "../assets/svg/section-*.svg",
    "../assets/svg/act-*.svg",
    "../assets/svg/topic-*.svg",
  ],
  { eager: true, query: "?raw", import: "default" },
);

/* These are first-party assets we authored, so inlining them is safe. The
 * guard is a sanity check against an asset pipeline that ever starts emitting
 * anything executable — a glyph is paths and nothing else. */
const UNSAFE = /<\s*(script|foreignObject|iframe|use\b[^>]*href\s*=\s*["']\s*http)/i;

const GLYPHS: Record<string, string> = {};
for (const [path, markup] of Object.entries(RAW)) {
  const name = path.slice(path.lastIndexOf("/") + 1, -".svg".length);
  if (UNSAFE.test(markup)) {
    console.error(`Glyph: refusing to inline "${name}" — unexpected markup`);
    continue;
  }
  GLYPHS[name] = markup;
}

/** True when a glyph exists — lets a caller skip its own layout gap. */
export function hasGlyph(name: string | null | undefined): boolean {
  return Boolean(name && name in GLYPHS);
}

/**
 * A decorative inline mark that inherits `currentColor` from its container.
 * Always aria-hidden: every placement in the app sits beside its own label.
 */
export function Glyph({
  name,
  size = 16,
  className = "",
}: {
  /** Manifest slot name, e.g. "section-learn", "act-match", "topic-gear". */
  name: string;
  /** Rendered box in px (glyphs are authored on a square canvas). */
  size?: number;
  className?: string;
}) {
  const markup = GLYPHS[name];
  if (!markup) return null;
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={`inline-grid shrink-0 place-items-center [&>svg]:block [&>svg]:size-full ${className}`}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
