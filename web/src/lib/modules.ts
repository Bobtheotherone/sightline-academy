/* Static course-map facts used by public and first-run surfaces before the
 * course API loads (titles, taglines, missions from CURRICULUM front-matter —
 * real curriculum content, mirrored verbatim; the API remains the source of
 * truth once course data is loaded).
 */

import type { ArtifactType } from "./api";

export interface ModuleFacts {
  id: string;
  order: number;
  title: string;
  tagline: string;
  mission: string;
  minutes: number;
  badgeId: string;
  heroSlot: string;
  artifactType: ArtifactType;
  objectives: string[];
}

export const MODULE_FACTS: ModuleFacts[] = [
  {
    id: "m1-riders-mindset",
    order: 1,
    title: "The Rider's Mindset",
    tagline: "Most crashes are decided before the wheels turn.",
    mission:
      "Understand why ATV crashes actually happen, and build your personal risk profile so you know which mistakes are most likely to be yours.",
    minutes: 45,
    badgeId: "b-mindset",
    heroSlot: "hero-m1-mindset",
    artifactType: "risk_profile",
    objectives: [
      "Name the handful of factors behind most serious ATV crashes",
      "Recognize how social pressure and familiarity distort risk judgment",
      "Build a personal risk profile identifying your own highest-risk situations",
    ],
  },
  {
    id: "m2-know-your-machine",
    order: 2,
    title: "Know Your Machine",
    tagline: "You can't judge what you can't name.",
    mission:
      "Learn the ATV's anatomy and controls, master the T-CLOC pre-ride walkaround, and understand why rider-machine fit is a hard rule.",
    minutes: 55,
    badgeId: "b-mechanic",
    heroSlot: "hero-m2-machine",
    artifactType: "inspection_log",
    objectives: [
      "Identify the major systems of an ATV and what each does for stability and control",
      "Know the five T-CLOC inspection zones and what a walkaround is checking for",
      "Explain why machine size and fit rules exist, especially for young riders",
    ],
  },
  {
    id: "m3-gear-up",
    order: 3,
    title: "Gear Up",
    tagline: "Gear is the only safety decision that keeps working after a mistake.",
    mission:
      "Understand what protective gear actually does, get helmet choice and fit right, and build the gear card you'll pack from.",
    minutes: 40,
    badgeId: "b-geared",
    heroSlot: "hero-m3-gear",
    artifactType: "gear_card",
    objectives: [
      "Explain what a helmet does and what makes one fit correctly",
      "Know the every-ride gear set from head to toe and what each item protects against",
      "Build a personal gear card including condition and replacement awareness",
    ],
  },
  {
    id: "m4-reading-the-terrain",
    order: 4,
    title: "Reading the Terrain",
    tagline: "The ground announces itself. Learn its language.",
    mission:
      "Learn to read terrain and hazards early, understand the stability envelope that governs every slope and side-hill, and write your first hazard brief.",
    minutes: 55,
    badgeId: "b-terrain",
    heroSlot: "hero-m4-terrain",
    artifactType: "hazard_brief",
    objectives: [
      "Identify common trail hazards and the early cues that reveal them",
      "Explain the center-of-gravity / support concept behind ATV stability on slopes",
      "Apply a scan-and-decide rhythm to terrain scenarios",
    ],
  },
  {
    id: "m5-environment-emergencies",
    order: 5,
    title: "Weather, Environment & Emergencies",
    tagline: "The ride starts before the ride, and help starts before the emergency.",
    mission:
      "Learn how conditions change the whole risk picture, how a ride plan and communication turn remoteness from a danger into a variable, and how to think in the first minutes when something goes wrong.",
    minutes: 50,
    badgeId: "b-prepared",
    heroSlot: "hero-m5-environment",
    artifactType: "readiness_plan",
    objectives: [
      "Adjust the risk picture for weather, temperature, light, and dust",
      "Build the before-you-go trio — ride plan, communication plan, carry kit",
      "Apply the stop-assess-communicate pattern to trouble scenarios",
    ],
  },
  {
    id: "m6-roads-rules-people",
    order: 6,
    title: "Roads, Rules & Other People",
    tagline: "The machine's limits, the law's categories, and everyone who shares the ground.",
    mission:
      "Understand why ATVs and pavement don't mix, how crossings, passengers, and loads really work, and how to ride among other people — then build your capstone Ride Plan.",
    minutes: 60,
    badgeId: "b-roadwise",
    heroSlot: "hero-m6-roads",
    artifactType: "ride_plan",
    objectives: [
      "Explain the physics of why ATVs handle unpredictably on pavement",
      "Apply the rules-categories for road crossings, passengers, and cargo",
      "Commit to the impairment and shared-trail standards",
      "Synthesize the whole course into a complete Ride Plan",
    ],
  },
];

export const BADGE_FACTS: { id: string; name: string; trigger: string }[] = [
  { id: "b-mindset", name: "Clear Eyes", trigger: "Complete Module 1" },
  { id: "b-mechanic", name: "Walkaround Ready", trigger: "Complete Module 2" },
  { id: "b-geared", name: "Geared Up", trigger: "Complete Module 3" },
  { id: "b-terrain", name: "Terrain Reader", trigger: "Complete Module 4" },
  { id: "b-prepared", name: "Storm Smart", trigger: "Complete Module 5" },
  { id: "b-roadwise", name: "Road Wise", trigger: "Complete Module 6" },
  { id: "b-journal", name: "Field Scribe", trigger: "Complete all six journal artifacts" },
  { id: "b-scholar", name: "Sharp Eye", trigger: "Ten first-try checkpoint bests" },
  { id: "b-graduate", name: "Sightline Safety Academy Graduate", trigger: "Earn your certificate" },
];

export const LEVEL_TITLES = [
  "Trailhead",
  "Greenhorn",
  "Pathfinder",
  "Trailhand",
  "Ridge Runner",
  "Wayfinder",
  "Trail Boss",
];

/** Cumulative XP thresholds per level (SPEC-009 §Levels; server-authoritative —
 * mirrored here only to fire the level-up toast the moment XP lands). */
export const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1400];

export function levelFor(xpTotal: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xpTotal >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

export function levelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(Math.max(level - 1, 0), LEVEL_TITLES.length - 1)];
}

/** Fraction of the way from the current level's floor to the next threshold
 * (0..1; 1 at the top of the ladder). Mirrors the server's ring math so the
 * level ring can paint truthfully before /progress resolves. */
export function levelProgressFor(xpTotal: number): number {
  const level = levelFor(xpTotal);
  const floor = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const ceiling = LEVEL_THRESHOLDS[level];
  if (ceiling === undefined) return 1;
  return Math.min(1, Math.max(0, (xpTotal - floor) / (ceiling - floor)));
}

export const ARTIFACT_FACTS: Record<
  ArtifactType,
  { name: string; moduleId: string; moduleTitle: string; moduleOrder: number; blurb: string }
> = {
  risk_profile: {
    name: "Risk profile",
    moduleId: "m1-riders-mindset",
    moduleTitle: "The Rider's Mindset",
    moduleOrder: 1,
    blurb: "Your own highest-risk situations, named and ranked.",
  },
  inspection_log: {
    name: "Inspection log",
    moduleId: "m2-know-your-machine",
    moduleTitle: "Know Your Machine",
    moduleOrder: 2,
    blurb: "Your T-CLOC walkaround, written down the way you'll actually run it.",
  },
  gear_card: {
    name: "Gear card",
    moduleId: "m3-gear-up",
    moduleTitle: "Gear Up",
    moduleOrder: 3,
    blurb: "The head-to-toe gear set you pack from, with condition notes.",
  },
  hazard_brief: {
    name: "Hazard brief",
    moduleId: "m4-reading-the-terrain",
    moduleTitle: "Reading the Terrain",
    moduleOrder: 4,
    blurb: "The hazards on your home terrain and the cues that give them away.",
  },
  readiness_plan: {
    name: "Readiness plan",
    moduleId: "m5-environment-emergencies",
    moduleTitle: "Weather, Environment & Emergencies",
    moduleOrder: 5,
    blurb: "Ride plan, communication plan, and carry kit — the before-you-go trio.",
  },
  ride_plan: {
    name: "Ride Plan",
    moduleId: "m6-roads-rules-people",
    moduleTitle: "Roads, Rules & Other People",
    moduleOrder: 6,
    blurb: "The capstone: everything you've built, folded into one printable plan.",
  },
};
