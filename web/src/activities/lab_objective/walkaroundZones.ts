/* T-CLOC zone data for the walkaround change detector (m2-l3-s2).
 *
 * The lesson's own thesis is that a walkaround "isn't really a mechanical
 * inspection — it's a change detector": you saw the machine yesterday, and the
 * ritual makes you see it again. So each zone shows the machine twice, and the
 * learner has to put a finger on what moved — click the fault in today's plate.
 * Landing on it opens the card that says what it is and why it bites.
 *
 * Every `looking` string is the m2-l3-s1 keylist detail verbatim, and every
 * fault maps to a check item the curriculum already authored (fresh drips,
 * load racks secure, lights, control surfaces). No new safety claims here.
 *
 * HOTSPOTS are percentages of the plate, x/y from the top-left. They were not
 * eyeballed: each pair was pixel-diffed, the difference blurred to merge the
 * fault into one blob and wash out the 1px line noise that separately-drawn
 * plates leave everywhere, and the dominant region read off a percentage grid.
 * Two detectors disagreed on two of the four zones — the brightest point found
 * the grip and the drip, the highest-energy region found the lens — so every
 * rect below was finally confirmed by drawing it back onto its plate and
 * looking. A zone may carry several rects: the loose strap reads as a fault
 * both where it sags over the lid and where its end hangs, and a learner is
 * right either way.
 *
 * NOTE ON TIRES: the T zone is absent. Its "after" plate came back as the same
 * wheel drawn smaller and floating off the ground line rather than a squatting
 * one — a drawing inconsistency, not a fault, and translation-testing confirmed
 * it (aligning improved the match 6%, against 41% for the genuinely
 * misregistered lights pair). It is staged as _spare-tire-rejected.png. Drop a
 * real low-pressure plate in as `walk-tires-low` and add the entry below; the
 * lab picks it up with no other change.
 */

/** What a fault is worth: fixable where you stand, or the end of the ride. */
export type Call = "sort" | "stop";

/** A click target on the plate, as percentages of its box. */
export interface HotRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WalkaroundZone {
  id: string;
  /** T-CLOC letter. */
  letter: string;
  name: string;
  /** What a check in this zone is looking for — m2-l3-s1 keylist, verbatim. */
  looking: string;
  /** The machine as it was yesterday. */
  okSlot: string;
  /** The machine today, carrying the fault. */
  badSlot: string;
  /** Where the fault is. A click inside any rect counts. */
  spots: HotRect[];
  /** Card title once they land on it. */
  faultName: string;
  /** What they just clicked. */
  faultIs: string;
  /** Why it bites — the reason this is a hazard and not a blemish. */
  hazard: string;
  call: Call;
  callWhy: string;
  /** Nudge after a couple of misses — where to look, never what to conclude. */
  hint: string;
}

/** T-CLOC order. The fixed order is the ritual, and the ritual is the point. */
export const ZONE_ORDER = ["controls", "lights", "oil", "chassis"] as const;

export const WALKAROUND_ZONES: Record<string, WalkaroundZone> = {
  controls: {
    id: "controls",
    letter: "C",
    name: "Controls & cables",
    looking:
      "Throttle moves freely and snaps closed. Brake levers firm, not spongy. Steering sweeps lock to lock without binding.",
    okSlot: "walk-controls-ok",
    badSlot: "walk-controls-torn",
    spots: [{ x: 79, y: 41, w: 18, h: 24 }],
    faultName: "The grip has come apart",
    faultIs:
      "The grip has split at its outboard end and pulled back off the bar, leaving the bar end bare.",
    hazard:
      "This is the surface your throttle hand works from. A grip already lifting off the bar can turn under your hand — and it turns when you are holding on hardest, which is when you can least afford to let go.",
    call: "sort",
    callWhy:
      "Fixable before you leave, and not ignorable. Sort it at the trailhead.",
    hint: "Work outward along the bar, past the lever, to where your hand actually sits.",
  },

  lights: {
    id: "lights",
    letter: "L",
    name: "Lights & electrics",
    looking:
      "Headlight, taillight, engine stop switch actually stops the engine. Matters double at dawn, dusk, and dust.",
    okSlot: "walk-lights-ok",
    badSlot: "walk-lights-cracked",
    spots: [{ x: 28, y: 31, w: 38, h: 30 }],
    faultName: "The lens has taken a hit",
    faultIs:
      "A star of cracks radiates from a single impact point across the headlight lens. The housing behind it is intact.",
    hazard:
      "A cracked lens throws light where the crack sends it rather than where you aimed it, and it lets water and dust into a housing built to keep them out. In open daylight that costs you little. At dusk, in dust, or under trees it costs you the exact thing the light was for.",
    call: "sort",
    callWhy:
      "Sort it before you ride. Hold onto this one, though: the answer flips with your plan. Same fault, different call, because what this zone is worth depends on when you will be out in it.",
    hint: "The housing is fine. Look at the glass.",
  },

  oil: {
    id: "oil",
    letter: "O",
    name: "Oil & fuel",
    looking:
      "Levels checked, no fresh drips underneath, fuel enough for the ride plus reserve.",
    okSlot: "walk-oil-ok",
    badSlot: "walk-oil-drip",
    /* One rect only. A second was placed higher up, over what the diff read as
     * a drip running off the plate — cropping that region showed bare ground,
     * grass tufts and the edge of the old stain. It highlighted nothing. The
     * fresh droplet on the ground is the whole finding. */
    spots: [{ x: 42, y: 84, w: 16, h: 14 }],
    faultName: "Something is leaking today",
    faultIs:
      "A fresh wet drip off the skid plate, and a new glossy spot on the ground beneath it. The big dry stain was there yesterday too — that one is history. This is the news.",
    hazard:
      "You do not know what is leaking, how fast, or how much is left above it. That is the whole problem: a fluid you cannot see the level of, going down at a rate you cannot see, on a machine you are about to take somewhere far from the trailhead.",
    call: "stop",
    callWhy:
      "Ride's off. Your job on a walkaround was to catch it, not to diagnose it — and this one goes to a qualified mechanic. That is exactly the line this course draws.",
    hint: "The big stain is in both plates. Look for what is only in one.",
  },

  chassis: {
    id: "chassis",
    letter: "C",
    name: "Chassis",
    looking:
      "The look-over: cracks, loose fasteners, anything hanging or freshly bent. Load racks secure.",
    okSlot: "walk-chassis-ok",
    badSlot: "walk-chassis-loose",
    spots: [
      { x: 45, y: 15, w: 20, h: 32 },
      { x: 52, y: 47, w: 16, h: 36 },
    ],
    faultName: "The strap has gone slack",
    faultIs:
      "The strap sags across the case instead of lying flat on it, and its free end is hanging down past the rack rail.",
    hazard:
      "A load that can move changes where the machine's weight sits — and you do not get to choose when, which is usually mid-corner or mid-climb. The hanging end is its own problem: loose webbing near a turning wheel is exactly how a strap ends up wound around an axle.",
    call: "sort",
    callWhy:
      "Thirty seconds with the strap and it is done. Sort it before you ride.",
    hint: "Follow the strap from the lid all the way down to where it should anchor.",
  },
};
