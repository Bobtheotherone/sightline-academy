/* The four pieces of ground the stability lab rides (SPEC-007 §11).
 *
 * A scenario is just terrain plus a job: a tilt profile along the run, one
 * trail event that arrives whether you are ready or not, and whatever is
 * strapped to the rack. Nothing here knows about the rider — the setup is the
 * learner's half of the bargain, and the simulation decides how it ends.
 *
 * The angles are illustrative. They are tuned so that the intended lesson is
 * the thing that decides each run and nothing clears on luck; a real machine on
 * real ground gives way earlier than this, never later.
 *
 * The numbers here are the input to a rigid-body simulation (stabilityRun.ts),
 * not to a formula: the profile is the ground that gets built and the event is
 * a shape cut into it. They were tuned on stabilityRun.check.ts.
 */

export interface ProfilePoint {
  /** 0..1 along the run, ascending; first is 0, last is 1. */
  s: number;
  deg: number;
}

export interface TrailEvent {
  s: number;
  kind: "rut" | "rock" | "washout";
  /** Extra tilt at the centre of the event, always in the steepening direction. */
  impulseDeg: number;
  /**
   * The size of the thing, in metres — what the simulation actually builds.
   * rut: how deep the groove is. washout: how deep the bite out of the trail
   * is. rock: how far the boulder or the band stands above the surface.
   * `impulseDeg` is the tilt that works out to, kept for the readouts.
   */
  sizeM?: number;
  label: string;
}

export type ScenarioId = "traverse" | "haul" | "descent" | "shortcut";

export interface Scenario {
  id: ScenarioId;
  title: string;
  eyebrow: string;
  brief: string;
  view: "rear" | "side";
  profile: ProfilePoint[];
  event?: TrailEvent;
  cargo?: number;
  cargoLocked?: boolean;
  noGo?: boolean;
  hints: { rollover: string; riderOff: string; clean: string; noGoAfterFail?: string };
}

export const SCENARIOS: Scenario[] = [
  {
    id: "traverse",
    title: "Side-hill traverse",
    eyebrow: "Crossing the face",
    view: "rear",
    brief:
      "You are crossing an open face that steepens to 26 degrees, and there is a rut cut across the line near the top. Set your weight before you get there, because there is nowhere on this face to stop and fix it.",
    profile: [
      { s: 0, deg: 0 },
      { s: 0.15, deg: 8 },
      { s: 0.45, deg: 24 },
      { s: 0.6, deg: 26 },
      { s: 1, deg: 26 },
    ],
    event: { s: 0.62, kind: "rut", impulseDeg: 10, sizeM: 0.12, label: "rut" },
    cargo: 0,
    hints: {
      rollover:
        "Your body stayed over the middle of the machine, so the whole centre of gravity leaned out with the hill and the plumb line walked past the downhill tyres. The rut only had to add a few degrees. Move your weight up the hill — 60 percent uphill seated, or stand on the pegs and 40 percent is enough.",
      riderOff:
        "Leaning downhill hung your weight out over the low side. The plumb line reached the downhill tyres with your body already outside them, so you left the machine before it finished going over. On a side-slope your body goes up the hill, never down it.",
      clean:
        "Weight up the hill pulled the plumb line back toward the middle of the track, so even the rut did not push it past the downhill tyres. That gap between the line and the edge is the only thing holding you on the face.",
    },
  },
  {
    id: "haul",
    title: "The hunt haul",
    eyebrow: "Full rack, uphill",
    view: "side",
    brief:
      "You are taking a loaded rack up a 26 degree pitch to the truck, with a rock step waiting where it is steepest. Every kilo of that load sits behind you, over the back wheels.",
    profile: [
      { s: 0, deg: 0 },
      { s: 0.25, deg: 14 },
      { s: 0.55, deg: 26 },
      { s: 0.8, deg: 26 },
      { s: 1, deg: 6 },
    ],
    event: { s: 0.62, kind: "rock", impulseDeg: 20, sizeM: 0.20, label: "rock step" },
    cargo: 1,
    cargoLocked: true,
    hints: {
      rollover:
        "The climb plus the load put the plumb line behind the back axle and the machine went over backwards. Nothing on the rack can be argued with, so the only weight left to move is yours, and it has to go forward before the pitch does.",
      riderOff:
        "The load had already pushed the balance toward the rear wheels, and the climb lifted the front further. When the rock step took the last of it the machine came up and you went off the back. Get your chest forward over the bars — 40 percent uphill lean or more — or stand and ride it forward.",
      clean:
        "You put your weight forward early, so the plumb line stayed well ahead of the back axle and the front wheels kept some load through the steep part. Loaded climbs are won before the pitch, not on it.",
    },
  },
  {
    id: "descent",
    title: "Steep drop",
    eyebrow: "Down the fall line",
    view: "side",
    brief:
      "You are dropping into a 30 degree pitch with a light load on the rack and a washout part way down where the trail has been cut away and drops half a metre onto the bank below it. Gravity is already pulling everything toward the front wheels.",
    /* The pitch itself never passes 30 degrees. The washout is not a steeper
     * piece of hill, it is a piece of hill that is no longer there: the trail
     * has been scoured out, drops away sheer, and stands up again on the far
     * side. One terrain slab is 0.25 m long, so the spikes below are single
     * slabs stood on end — a 0.50 m ledge at s 0.625 and the far bank of the
     * scour two slabs later. The stage draws its surface from this same
     * profile, so what is painted is what the machine rides off. */
    profile: [
      { s: 0, deg: 0 },
      { s: 0.2, deg: -12 },
      { s: 0.5, deg: -30 },
      { s: 0.615, deg: -30 },
      { s: 0.625, deg: -63.4 },
      { s: 0.6295, deg: -30 },
      { s: 0.6759, deg: -30 },
      { s: 0.6804, deg: 28 },
      { s: 0.7083, deg: 28 },
      { s: 0.7128, deg: -30 },
      { s: 0.85, deg: -30 },
      { s: 1, deg: -10 },
    ],
    event: { s: 0.625, kind: "washout", impulseDeg: 63, sizeM: 0.05, label: "washout" },
    cargo: 0.15,
    hints: {
      rollover:
        "The front wheels dropped off the ledge and landed against the bank, the plumb line ran out past them, and the machine pitched over its own nose. On a drop this steep the centre of gravity is already forward of where it sits on the flat, and the ledge only has to take the rest.",
      riderOff:
        "Sitting forward on a descent puts your weight on top of the front wheels, and then the ground under them was not there. Coming off the ledge into the bank stopped the front while the rest of you kept going, and there was no seat left in front of you to slide onto. Get back — 40 percent into the hill is enough here, and standing lets you ride the drop with your legs instead of your backside.",
      clean:
        "You kept enough weight behind the front axle that the plumb line held between the wheels, so the front kept steering instead of just carrying and the drop was something the machine landed rather than something that landed on you. The ledge still took a bite out of the margin — you had margin to spend.",
    },
  },
  {
    id: "shortcut",
    title: "The shortcut",
    eyebrow: "The tempting line",
    view: "rear",
    brief:
      "You are looking across a 40 degree face with a rock band through the middle of it, and taking it saves ten minutes of riding. Set it up however you like and watch what the hill does.",
    profile: [
      { s: 0, deg: 0 },
      { s: 0.2, deg: 22 },
      { s: 0.45, deg: 34 },
      { s: 0.7, deg: 40 },
      { s: 1, deg: 40 },
    ],
    event: { s: 0.5, kind: "rock", impulseDeg: 12, sizeM: 0.26, label: "rock band" },
    cargo: 0,
    noGo: true,
    hints: {
      rollover:
        "The face is steeper than the machine can hold at any body position. The plumb line is outside the downhill tyres before the rock band, and the rock band is only the moment it becomes obvious.",
      riderOff:
        "Leaning downhill on ground this steep threw you off the low side early. Leaning the other way lasts longer, but the face still runs out of track underneath you.",
      clean:
        "Nothing in the setup gets you across this face.",
      noGoAfterFail:
        "This one has no setup that works. Standing, fully committed up the hill, the plumb line still leaves the downhill tyres partway across — the face is simply steeper than the track is wide. Turning back is the skill being tested, and it is the only answer that gets you home.",
    },
  },
];
