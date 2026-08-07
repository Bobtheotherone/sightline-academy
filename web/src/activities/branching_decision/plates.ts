/**
 * Scenario plates for `branching_decision` (VISUAL_ASSETS §7.3 · SET-C-SCENARIO,
 * C-050…C-055): the establishing shot that sits in the field-report card, plus
 * the plate that replaces it once the scenario has moved on to its next
 * decision. One plate is on screen at a time — these are the *same place, later*,
 * not a gallery, so the swap is what carries the sense of the ride progressing.
 *
 * Why the mapping lives in code and not in the payloads: the curriculum
 * (`content/curriculum/*.md`) is the teaching source of truth and does not name
 * assets — ADR-006 keeps content declarative about *meaning*, and art is a
 * presentation concern that can ship, change, or lag without a content edit.
 * Same rule as `assets/slotmap.ts`, which owns the per-item icon maps; this map
 * is renderer-local because the thing it keys on — a decision node — exists
 * nowhere outside this renderer.
 *
 * Keys are `${stepId}` for the header plate and `${stepId}:${nodeId}` for a node
 * that owns a later moment, because node ids ("n1", "n2") are only unique inside
 * their own step. A node with no key of its own keeps the header plate showing
 * (node 1 *is* the header state), and a step with no key at all draws exactly
 * what it drew before the art existed — no gap, no placeholder frame.
 */
import manifest from "../../assets/manifest.json";

const SLOTS = manifest.slots as Record<string, { status: string } | undefined>;

/** `${stepId}` → establishing plate; `${stepId}:${nodeId}` → that node's plate. */
export const SCENARIO_PLATE: Record<string, string> = {
  // m1-l2-s2 · "Scenario — the creek line" (C-050 / C-051)
  "m1-l2-s2": "scenario-creek-line",
  "m1-l2-s2:n2": "scenario-creek-pressure",

  // m4-l3-s1 · "Scenario — the shortcut slope" (C-052 / C-053)
  "m4-l3-s1": "scenario-shortcut-slope",
  "m4-l3-s1:n2": "scenario-offcamber-wet",

  // m5-l3-s2 · "Scenario — the silent radio" (C-054 / C-055)
  "m5-l3-s2": "scenario-silent-radio",
  "m5-l3-s2:n2": "scenario-one-bar",
};

/**
 * The plate for where the learner currently stands in a scenario, or undefined
 * when this step has no art. The node's own plate wins; otherwise the header
 * plate holds. A slot that is registered but not yet drawn resolves to undefined
 * rather than to `SlotArt`'s labelled placeholder — a 16:9 empty frame in the
 * middle of the field report would be worse than no picture at all.
 */
export function scenarioPlateSlot(
  stepId: string,
  nodeId: string | null | undefined,
): string | undefined {
  const slot =
    (nodeId ? SCENARIO_PLATE[`${stepId}:${nodeId}`] : undefined) ?? SCENARIO_PLATE[stepId];
  return slot && SLOTS[slot]?.status === "real" ? slot : undefined;
}
