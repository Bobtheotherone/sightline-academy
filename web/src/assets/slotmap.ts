/**
 * slotmap — binds curriculum item ids to illustration slots (VISUAL_ASSETS §7.2
 * B-001…B-022, §7.3 C-070…C-134) so the sort, match, hotspot and lesson-list
 * renderers can show per-item art.
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
// C-120 … C-134 · Hotspot detail insets (15)
// ---------------------------------------------------------------------------

/**
 * `${stepId}:${hotspotId}` → slot name, for the `hotspot_list` detail panel.
 *
 * The base scene answers *where*; the inset answers *what you are looking at*
 * (VISUAL_ASSETS §7.3, SET-C-HOTSPOT-INSET). Hotspot ids are only unique inside
 * their step, hence the compound key — same shape as the maps above.
 */
export const HOTSPOT_INSET_SLOT: Record<string, string> = {
  // m2-l1-s2 · scene-atv-anatomy (C-120…C-127)
  "m2-l1-s2:tires": "inset-tires",
  "m2-l1-s2:handlebars": "inset-handlebars",
  "m2-l1-s2:brakes": "inset-brakes",
  "m2-l1-s2:suspension": "inset-suspension",
  "m2-l1-s2:engine": "inset-engine",
  "m2-l1-s2:footwells": "inset-footwells",
  "m2-l1-s2:racks": "inset-racks",
  "m2-l1-s2:chassis": "inset-chassis",

  // m4-l1-s2 · scene-trail-hazards (C-128…C-134)
  "m4-l1-s2:crest": "inset-crest",
  "m4-l1-s2:side_slope": "inset-side-slope",
  "m4-l1-s2:shadow_rut": "inset-shadow-rut",
  "m4-l1-s2:wet_clay": "inset-wet-clay",
  "m4-l1-s2:loose_over_hard": "inset-loose-over-hard",
  "m4-l1-s2:deadfall": "inset-deadfall",
  "m4-l1-s2:soft_edge": "inset-soft-edge",
};

// ---------------------------------------------------------------------------
// B-001 … B-022 · Lesson cards (22)
// ---------------------------------------------------------------------------

/**
 * A lesson id carries a trailing name (`m2-l3-walkaround`, `m6-l4-ride-plan`);
 * its card slot is the module/lesson stem alone — `lesson-m2-l3`. One rule
 * beats twenty-two hand-copied rows, so the mapping is derived rather than
 * tabulated and the manifest stays the sole authority on which cards exist: an
 * unproduced stem resolves to `undefined` and `LessonRow` draws no thumbnail.
 *
 * The produced set, for the record and so the asset lint can see this wiring
 * (§10.4 resolves `family-${…}` template slots only for the glyph prefixes, and
 * `lesson-` is not one of them) — verified equal to the manifest's `lesson-*`
 * keys and to the stems of all 22 authored lesson ids:
 *
 *   lesson-m1-l1  lesson-m1-l2  lesson-m1-l3
 *   lesson-m2-l1  lesson-m2-l2  lesson-m2-l3  lesson-m2-l4
 *   lesson-m3-l1  lesson-m3-l2  lesson-m3-l3
 *   lesson-m4-l1  lesson-m4-l2  lesson-m4-l3  lesson-m4-l4
 *   lesson-m5-l1  lesson-m5-l2  lesson-m5-l3  lesson-m5-l4
 *   lesson-m6-l1  lesson-m6-l2  lesson-m6-l3  lesson-m6-l4
 */
const LESSON_STEM = /^(m\d+-l\d+)(?:-|$)/;

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

/**
 * Slot name for a hotspot's detail inset, or undefined when it has no produced
 * plate. Returns the *slot* rather than a URL because the panel presents it
 * through `SlotArt`, which carries the manifest's teaching alt text — but the
 * caller still needs to know whether art exists so an unmapped hotspot renders
 * exactly as it did before the insets landed, with no placeholder frame.
 */
export function hotspotInsetSlot(stepId: string, hotspotId: string): string | undefined {
  const slot = HOTSPOT_INSET_SLOT[`${stepId}:${hotspotId}`];
  return slot && slotIconUrl(slot) ? slot : undefined;
}

/** Card-art URL for a lesson id, or undefined when its card has not been made. */
export function lessonCardUrl(lessonId: string): string | undefined {
  const stem = LESSON_STEM.exec(lessonId)?.[1];
  return stem ? slotIconUrl(`lesson-${stem}`) : undefined;
}
