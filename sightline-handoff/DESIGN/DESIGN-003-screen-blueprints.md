# DESIGN-003 — Screen Blueprints

Layout intent per screen. ASCII sketches are desktop; responsive behavior at
the end. These are blueprints, not pixel specs — honor the intent, use the
tokens, and let the crawl judge the result.

## Landing `/`
Hero is a thesis: a wide ContourPanel in pine-950 with paper-0 type —
display headline ("Ride like you've thought it through."), one-line sub, single
primary CTA "Start the course — it's free", and the hero-landing illustration
(rider + machine rendered as a field-guide plate) bleeding from the right.
Below: the six modules as a *trail map* — a winding path with six blaze
waypoints, each expanding a ModuleCard on hover/tap; then a Ranger teaser
(real chat mockup with one curriculum-grounded exchange, source chips visible);
then the honest-expectations strip (awareness course, certificate disclaimer,
hands-on training encouragement); footer.

## Auth `/login` `/register`
Split layout: left = compact form card on moss-100; right = pine-950 contour
panel with a rotating field-note quote (three authored quotes about judgment).
Forms per SPEC-005 with live validation. Never center-a-lonely-card-in-void.

## Dashboard `/dashboard`
Greeting row (display name, level ring + trail title). Primary: the
**Continue card** — large, hero-slot art of current module, lesson title, step
progress, one CTA. Secondary rank: course-map mini (six blazes with state),
Journal peek (latest artifact JournalCard or EmptyState), recent XP list,
"Ask Ranger" card with one contextual suggested prompt. First-run variant swaps
Continue for a welcome card introducing the course + Ranger. Graduate variant
per SPEC-006.

## Course map `/course`
The trail-map motif full-page: winding contour path, six waypoints as
ModuleCards along it, connective path fills in pine-300 as modules complete.
This page must be a screenshot-worthy signature screen.

## Module overview `/course/:moduleId`
ContourPanel header: hero art, title, tagline, mission, minutes, objectives as
blaze list, ProgressRing. Body: LessonRows. Complete state adds BadgeMedal +
journal artifact card. Locked state: desaturated header, lock, "Complete
<previous> to unlock", link back.

## Lesson player `/learn/:lessonId`  (see SPEC-006)
Three-zone: StepRail (240px) | Stage (max 760px, centered) | contextual right
rail only when a step declares helper/asset overflow. Footer bar sticky.
Ranger slide-over trigger floats bottom-right (not overlapping the footer CTA).

## Journal `/journal` and `/journal/:artifactType`
Index: JournalCards in a 2-col masonry on a subtly ruled background; header
explains the journal in one line. Detail: full ArtifactPreview, edit action,
provenance line ("Built in Module 3 · Gear Up"), print for ride_plan.

## Progress `/progress`
Level ring hero + XP total (mono numerals), badge shelf (BadgeMedal grid,
unearned as embossed outlines), per-module completion bars, recent XP feed.

## Assessment `/assessment` & Certificate `/certificate`
Assessment intro: what it covers, 20 questions, 80% bar, no timer (say so).
Questions one-at-a-time with the KnowledgeOption component but **no inline
feedback until submission**; review screen per SPEC-006. Certificate per
SPEC-009 — treat it like a diploma, not a webpage: generous margins, cert-seal
slot, mono verification code, print button.

## Tutor `/tutor`  (see SPEC-008 §UI)
Full-height chat: slim header (Ranger name, grounding legend popover,
offline badge when relevant, overflow menu), message list, SuggestionButtons
above TutorComposer. First-run intro card centered in the empty list.

## Instructor `/instructor` — four sections per SPEC-011, data-dense but calm;
mono numerals; this page should look like a serious analytics product.

## 404 / locked / 403 — EmptyState compositions with state-404 / state-locked
art, one clear way back. Never default text.

## Responsive rules
Breakpoints 640/1024. Nav collapses to bottom tab bar (Course, Journal, Ranger,
Progress) < 1024. StepRail → top progress bar + section label. Trail map →
vertical path. Hotspot side panel → bottom sheet. All touch targets ≥ 44px.
