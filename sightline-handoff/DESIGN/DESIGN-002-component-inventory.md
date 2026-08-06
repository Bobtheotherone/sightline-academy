# DESIGN-002 — Component Inventory

Build these once in `web/src/components/`; pages compose them. Names are
binding (crawl reviews reference them). Radix primitives noted where used.

## Foundation
- **Button** — variants: primary (pine-700), secondary (outline), ghost, danger,
  accent (clay, XP contexts only); sizes s/m/l; loading spinner state; icon
  slots. Focus ring: 2px pine-300 offset 2.
- **Input / Textarea / PasswordInput** — label, hint, error, char counter;
  PasswordInput has visibility toggle + live strength hint (SPEC-005).
- **SelectChips** — tappable chip group (single/multi) used by journal options,
  reflection chips, reason chips.
- **Card** — base surface; `interactive` prop adds hover lift (2px translate +
  border darken, 150ms).
- **CalloutCard** — tip (pine) / caution (sun) / story (sky) / risk (danger);
  icon + title + md body; the left edge carries a 3px semantic bar.
- **BlazeMarker** — the signature rounded-diamond glyph; props: state
  (todo/active/done/locked), size. Used by: step dots, list markers, map pins,
  checkboxes-in-spirit.
- **ContourPanel** — section/hero wrapper that lays the contour SVG background
  (see STARTER/design-tokens.css comment for the SVG pattern) behind children.
- **ProgressRing / ProgressBar** — ring for module cards + level; bar for
  in-lesson.
- **Toast** (Radix Toast) — success/info/error + the level-up variant (badge
  art, slightly larger, 5s).
- **Modal / SlideOver** (Radix Dialog) — slide-over hosts Ranger on lesson pages.
- **Tabs** (Radix Tabs), **Popover** (Radix), **Tooltip** (Radix).
- **EmptyState** — illustration slot + heading + one-line body + primary action.
  EVERY empty surface uses this; no bare "No data" text anywhere.
- **Skeleton** — shimmer blocks matching each page's real layout (per-page
  skeleton compositions, not one generic bar).
- **AppShell / PublicShell** — navigation chrome per DESIGN-003.

## Learning
- **ModuleCard** — hero slot art, title, tagline, minutes, ProgressRing,
  locked state (desaturated + lock + unlock hint), badge shown when complete.
- **LessonRow** — order blaze, title, minutes, status.
- **StepRail** — the lesson progress rail (section-grouped BlazeMarkers,
  labels, current highlight; collapses to a top bar on mobile).
- **SectionInterstitial** — the Learn→Try etc. transition moment.
- **ActivityHost** + one component per renderer (SPEC-007) in `web/src/activities/`.
- **FeedbackStrip** — the reusable right/not-quite/explanation strip activities
  share (semantic colors, icon, md body).
- **KnowledgeOption** — MC option card with the four states (idle, selected,
  best, not-best) and inline feedback reveal.
- **XpChip** — "+25 XP" clay chip with count-up.
- **BadgeMedal** — badge art in a blaze-shaped frame; earned/unearned states.
- **CertificateLayout** — the print-grade certificate.

## Journal
- **JournalCard** — notebook-textured card (paper-0 + subtle ruled lines),
  artifact type eyebrow, title, updated time, status stitch.
- **ArtifactPreview** — live-building preview inside journal_builder.

## Tutor
- **ChatMessage** — user (right, pine tint) / ranger (left, paper card with a
  small ranger-hat glyph avatar); markdown body; GroundingLabel;
  SourceChips row; timestamp on hover.
- **GroundingLabel** — curriculum (pine dot "From the course") / mixed (half
  dot "Course + Ranger's knowledge") / general (sky dot "Ranger's general
  knowledge — not covered in the course").
- **SourceChip** — chunk title + module ref; links to /course/:moduleId.
- **SuggestionButtons** — 2–3 tappable follow-ups.
- **TutorComposer** — input + send + counter; disabled-with-reason while
  streaming.

## Illustration slots (assetSlot names used by CURRICULUM/)
`hero-landing`, `hero-m1-mindset`, `hero-m2-machine`, `hero-m3-gear`,
`hero-m4-terrain`, `hero-m5-environment`, `hero-m6-roads`,
`scene-atv-anatomy` (hotspot base, side view), `scene-walkaround-top`
(lab base, top view), `scene-helmet-fit`, `scene-trail-hazards` (hotspot base),
`scene-crossing` (road crossing scene), `scene-loading-cargo`,
`badge-*` (9 badges per SPEC-009), `empty-journal`, `empty-tutor`, `state-404`,
`state-locked`, `cert-seal`.
Produce as consistent flat-vector SVG/PNG per DESIGN-001 §Illustration. If an
asset is not yet produced, the slot renders a **designed** placeholder (contour
panel + blaze + slot label in mono) — acceptable at wave exits 0–1 only; by
wave 3 every slot has real art. Track in `web/src/assets/manifest.json`.
