/**
 * slotmap — binds curriculum item ids to illustration slots (VISUAL_ASSETS §7.3,
 * C-070…C-110) so the sort and match renderers can show per-item art.
 *
 * Why the mapping lives in code and not in the payloads: the curriculum
 * (`content/curriculum/*.md`) is the teaching source of truth and does not name
 * assets — ADR-006 keeps content declarative about *meaning*, and art is a
 * presentation concern that can ship, change, or lag without a content edit.
 * Keys are `${stepId}:${itemId}` because item ids ("p1", "helmet") are only
 * unique inside their own step.
 *
 * An id absent from these maps resolves to `undefined` and the renderer draws
 * exactly what it drew before the art existed — no gap, no broken image.
 */
import manifest from "./manifest.json";

interface SlotMeta {
  status: string;
  file?: string;
  alt?: string;
}

const SLOTS = manifest.slots as Record<string, SlotMeta | undefined>;

/**
 * Eager URL map of every produced plate, keyed by its path from this file —
 * the same resolution SlotArt and BadgeMedal do. It is repeated rather than
 * imported because SlotArt is a *presentational* contract (bordered plate with
 * a labelled placeholder fallback) and these icons need the opposite: a bare
 * inline glyph that renders nothing at all when there is no art.
 */
const ART_URLS = import.meta.glob<string>("./svg/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
});

// ---------------------------------------------------------------------------
// C-070 … C-095 · Sort item icons (26)
// ---------------------------------------------------------------------------

/** `${stepId}:${itemId}` → slot name, for `sort_categorize` items. */
export const SORT_ITEM_SLOT: Record<string, string> = {
  // m3-l2-s1 · "Sort the gear" (C-070…C-080)
  "m3-l2-s1:helmet": "sort-gear-helmet",
  "m3-l2-s1:eyes": "sort-gear-eyes",
  "m3-l2-s1:boots": "sort-gear-boots",
  "m3-l2-s1:gloves": "sort-gear-gloves",
  "m3-l2-s1:longs": "sort-gear-longs",
  "m3-l2-s1:chest": "sort-gear-chest",
  "m3-l2-s1:hiviz": "sort-gear-hiviz",
  "m3-l2-s1:layers": "sort-gear-layers",
  "m3-l2-s1:loose": "sort-gear-loose",
  "m3-l2-s1:flipflops": "sort-gear-flipflops",
  "m3-l2-s1:headphones": "sort-gear-headphones",

  // m5-l1-s2 · "Condition to adjustment" (C-081…C-088)
  "m5-l1-s2:dust_cone": "sort-cond-dust",
  "m5-l1-s2:wet_roots": "sort-cond-wet-roots",
  "m5-l1-s2:fading_light": "sort-cond-fading-light",
  "m5-l1-s2:storm_line": "sort-cond-storm",
  "m5-l1-s2:numb_hands": "sort-cond-cold-hands",
  "m5-l1-s2:heat_headache": "sort-cond-heat",
  "m5-l1-s2:swollen_crossing": "sort-cond-swollen-creek",
  "m5-l1-s2:first_frost": "sort-cond-frost",

  // m6-l2-s2 · "Passengers & cargo calls" (C-089…C-095)
  "m6-l2-s2:kid_behind": "sort-cargo-kid-behind",
  "m6-l2-s2:two_up_designed": "sort-cargo-two-up",
  "m6-l2-s2:rack_limits": "sort-cargo-rack-limits",
  "m6-l2-s2:heavy_high": "sort-cargo-heavy-high",
  "m6-l2-s2:towing": "sort-cargo-towing",
  "m6-l2-s2:sibling_lap": "sort-cargo-lap",
  "m6-l2-s2:loose_tools": "sort-cargo-loose-tools",
};

// ---------------------------------------------------------------------------
// C-100 … C-110 · Match pair icons (11)
// ---------------------------------------------------------------------------

/** `${stepId}:${pairId}` → slot name, for the LEFT (term) column of `match`. */
export const MATCH_PAIR_SLOT: Record<string, string> = {
  // m2-l2-s1 · "Match the controls" (C-100…C-105)
  "m2-l2-s1:p1": "match-thumb-throttle",
  "m2-l2-s1:p2": "match-front-brake",
  "m2-l2-s1:p3": "match-rear-brake",
  "m2-l2-s1:p4": "match-stop-switch",
  "m2-l2-s1:p5": "match-gear-selector",
  "m2-l2-s1:p6": "match-body-position",

  // m5-l2-s2 · "Plan element to failure prevented" (C-106…C-110)
  "m5-l2-s2:p1": "match-turnaround-time",
  "m5-l2-s2:p2": "match-off-ride-contact",
  "m5-l2-s2:p3": "match-water-food",
  "m5-l2-s2:p4": "match-nav",
  "m5-l2-s2:p5": "match-warmth",
};

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/** Bundled URL for a slot's plate, or undefined if the slot has no real art. */
export function slotIconUrl(slot: string | undefined): string | undefined {
  if (!slot) return undefined;
  const meta = SLOTS[slot];
  return meta?.status === "real" && meta.file ? ART_URLS[`./${meta.file}`] : undefined;
}

/** Icon URL for a `sort_categorize` item, or undefined when it has no art. */
export function sortItemIconUrl(stepId: string, itemId: string): string | undefined {
  return slotIconUrl(SORT_ITEM_SLOT[`${stepId}:${itemId}`]);
}

/** Icon URL for a `match` pair's left-column term, or undefined when unmapped. */
export function matchPairIconUrl(stepId: string, pairId: string): string | undefined {
  return slotIconUrl(MATCH_PAIR_SLOT[`${stepId}:${pairId}`]);
}
