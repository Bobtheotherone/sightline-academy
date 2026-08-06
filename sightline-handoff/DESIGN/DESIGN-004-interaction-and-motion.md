# DESIGN-004 — Interaction & Motion

Motion is one orchestrated system, tuned quiet. Every rule below respects
`prefers-reduced-motion` (replace movement with opacity, keep durations ≤120ms).

## Tokens
- Durations: 120ms (micro), 200ms (standard), 320ms (scene). Easing:
  `cubic-bezier(0.2, 0, 0, 1)` (standard), `cubic-bezier(0.34, 1.4, 0.64, 1)`
  (settle — used for correct-drop and badge moments only).
- Nothing animates longer than 600ms except the certificate reveal (one 900ms
  draw-in, once).

## Signature moments (the only choreographed animations — do these WELL)
1. **Correct sort/match settle** — card scales 1.03→1 with settle easing, blaze
   check draws in (120ms stroke), FeedbackStrip slides up 8px+fade.
2. **Section interstitial** — contour lines translate slowly behind the section
   title fade (320ms total), then auto-continue.
3. **Lesson complete** — XP chips count up staggered 60ms; badge (if any)
   settles in a BlazeMarker frame.
4. **Reveal (prediction_reveal)** — per-option response unmasks with a wipe,
   then general reveal fades in 200ms later.
5. **Level-up toast** — slides in with settle, ring fills, 5s dwell.
6. **Ranger typing** — three-dot pulse in a ranger bubble; streamed tokens
   appear without per-token animation (no typewriter gimmick).

## Micro-interaction defaults
- Hover: interactive cards translate -2px + border darken (150ms). Buttons
  darken 6%. Focus-visible: 2px pine-300 ring, 2px offset, everywhere.
- Press: scale 0.98 (80ms).
- Skeletons shimmer at 1.6s; no full-page spinners — always layout-shaped
  skeletons (DESIGN-002).
- Route transitions: none (instant), except lesson-step advance which
  cross-fades the stage 120ms.

## Feedback latency rules
- Optimistic UI on evidence writes; if the server rejects, roll back with an
  error toast (should be rare — client validates first).
- Any action >400ms shows its own local pending state (button spinner), never a
  global overlay.

## Sound: none. (Deliberate; note in README.)
