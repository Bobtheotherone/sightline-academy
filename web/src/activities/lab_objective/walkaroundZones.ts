/* T-CLOC zone data for the walkaround lab. The awareness-card copy quotes and
 * condenses the authored Module 2 curriculum (m2-l3-s1 keylist, m2-l1-s2
 * waypoint descriptions) — no new safety claims are introduced here.
 *
 * Two coordinate spaces, and they are not the same one. `x`/`y` are percentages
 * of the INSET machine drawing — the drop region on the ATV itself. `labelX`/
 * `labelY` are percentages of the whole scene box: where the placed label parks,
 * out in the plate's free margin, joined back to its region by a leader line.
 * Centring the chip on the anchor buried the machine under its own labels.
 */

export interface WalkaroundZone {
  id: string;
  letter: string;
  /** Tray label ("T — Tires & wheels"). */
  label: string;
  /** Short name for placed chips and cards. */
  name: string;
  /** Drop region center, % of the inset machine drawing. */
  x: number;
  y: number;
  /** Placed-label park position, % of the whole scene box. */
  labelX: number;
  labelY: number;
  /** Where the region sits on the machine (for tap-to-assign + screen readers). */
  regionName: string;
  /** Positional nudge after a wrong drop — navigation help, not new content. */
  hint: string;
  /** "What you're looking for" — the m2-l3-s1 keylist detail, verbatim. */
  looking: string;
  /** "Why it matters" — condensed from the authored module-02 copy. */
  why: string;
}

export const WALKAROUND_ZONES: Record<string, WalkaroundZone> = {
  tires: {
    id: "tires",
    letter: "T",
    label: "T — Tires & wheels",
    name: "Tires & wheels",
    x: 19,
    y: 32,
    labelX: 11,
    labelY: 40,
    regionName: "Front-left wheel",
    hint: "Tires & wheels live at the corners — where the machine meets the ground.",
    looking:
      "Pressure by gauge (not by eye), tread condition, sidewall damage, wheel fasteners snug.",
    why: "Low-pressure tires deforming around terrain IS the grip — pressure a few PSI off changes handling more than you'd expect.",
  },
  controls: {
    id: "controls",
    letter: "C",
    label: "C — Controls & cables",
    name: "Controls & cables",
    x: 50,
    y: 27,
    labelX: 89,
    labelY: 9,
    regionName: "Handlebars",
    hint: "Controls & cables are where your hands work — look to the handlebars.",
    looking:
      "Throttle moves freely and snaps closed. Brake levers firm, not spongy. Steering sweeps lock to lock without binding.",
    why: "The check happens before you need the controls — the bottom of a hill is a bad place to learn your brake lever is soft.",
  },
  lights: {
    id: "lights",
    letter: "L",
    label: "L — Lights & electrics",
    name: "Lights & electrics",
    x: 50,
    y: 8,
    labelX: 11,
    labelY: 9,
    regionName: "Front of the machine",
    hint: "Lights & electrics face the trail — look to the very front of the machine.",
    looking:
      "Headlight, taillight, engine stop switch actually stops the engine. Matters double at dawn, dusk, and dust.",
    why: "The stop-switch test is a function check, not a glance — it has to actually kill the engine, findable without looking.",
  },
  oil: {
    id: "oil",
    letter: "O",
    label: "O — Oil & fuel",
    name: "Oil & fuel",
    x: 50,
    y: 48,
    labelX: 89,
    labelY: 42,
    regionName: "Tank & engine, mid-frame",
    hint: "Oil & fuel sit at the heart of the machine — tank and engine, mid-frame.",
    looking:
      "Levels checked, no fresh drips underneath, fuel enough for the ride plus reserve.",
    why: "Running dry or seizing far from the trailhead turns a ride into a recovery.",
  },
  chassis: {
    id: "chassis",
    letter: "C",
    label: "C — Chassis",
    name: "Chassis",
    x: 50,
    y: 88,
    labelX: 50,
    labelY: 92,
    regionName: "Rear rack & frame",
    hint: "The chassis look-over sweeps frame and racks — start at the rear deck.",
    looking:
      "The look-over: cracks, loose fasteners, anything hanging or freshly bent. Load racks secure.",
    why: "Small findings here are cheap; discovered-on-trail findings are not. The walkaround is a change detector.",
  },
};
