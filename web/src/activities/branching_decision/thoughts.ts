/**
 * Thought bubbles for the scenario plates (owner directive 2026-08-16): each
 * rider in the creek scenes carries a tap-to-reveal thought, so the plate
 * teaches the same moment from four heads at once.
 *
 * Why this lives in code, not the payloads: the anchors are PIXEL-SPACE claims
 * about specific rasters (scenario-creek-line / scenario-creek-pressure), the
 * same kind of contract as the hotspot bases' coordinate tables — if the art
 * is re-rolled, these numbers move with it, and ADR-006 keeps that churn out
 * of the authored curriculum. Keyed by plate SLOT, so a node that keeps the
 * header plate keeps its thoughts too.
 *
 * x/y are percentages of the rendered plate (16:9 crop as shipped in the
 * raster ladder, NOT the source PNG). `side` names the free space the bubble
 * opens into — chosen by looking at the plate, verified by screenshot: keep
 * bubbles over sky and water, never over a rider or the crossing marker.
 */
export interface Thought {
  id: string;
  /** Marker anchor, percent of plate width/height. */
  x: number;
  y: number;
  /** Which way the bubble opens from the marker. */
  side: "top-left" | "top-right" | "left" | "right";
  /** Who is thinking it — carried into the accessible name. */
  who: string;
  text: string;
  /** Text measure in px — tuned per thought so it wraps to 2–3 short lines
   * and the cloud stays a compact oval instead of a wide strip. */
  w: number;
  /** Screenshot-tuned nudges in px. The one binding rule they serve: a cloud
   * must NEVER cover another rider's marker chip (owner directive — a covered
   * chip can't be clicked). dx shifts along the anchor axis, dy vertically;
   * gap sets a side bubble's runway from marker to cloud. */
  dx?: number;
  dy?: number;
  gap?: number;
}

export const PLATE_THOUGHTS: Record<string, Thought[]> = {
  // Mid-morning at the crossing (c050): two across, two stopped on the bank.
  "scenario-creek-line": [
    { id: "far-a", x: 57.5, y: 26, side: "left", who: "The first rider across", text: "Woo-hoo!! We made it!", w: 76, gap: 64, dy: -20 },
    { id: "far-b", x: 76, y: 25, side: "right", who: "The second rider across", text: "That was actually a little scary for a second.", w: 104, gap: 56, dy: 0 },
    { id: "friend", x: 12.5, y: 39, side: "top-right", who: "Your friend to your left", text: "Let's just go already.", w: 84, dx: 10 },
    { id: "you", x: 47, y: 39, side: "top-left", who: "You", text: "What should I do?", w: 82, dx: -6 },
  ],
  // The night return (c051): same place, the light gone.
  "scenario-creek-pressure": [
    { id: "far-a", x: 57.5, y: 18, side: "left", who: "The first rider across", text: "We've got headlights. Just come.", w: 110, gap: 66, dy: -8 },
    { id: "far-b", x: 75, y: 17, side: "right", who: "The second rider across", text: "How will we make it back?", w: 96, gap: 56, dy: 8 },
    { id: "friend", x: 12, y: 35, side: "top-right", who: "Your friend to your left", text: "I'm not sure about this.", w: 96, dx: 10 },
    { id: "you", x: 46.5, y: 37, side: "top-left", who: "You", text: "What should I do?", w: 82, dx: -6 },
  ],
};
