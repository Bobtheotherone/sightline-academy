# DESIGN-003 — Screen Blueprints (v2)

> **v2 supersedes v1** (2026-08-10, owner directive). Blueprints, not pixel
> specs — honor the intent, use the tokens, let the crawl judge. Two standing
> rules replace v1's sparse compositions: **(1) every band composes to its
> edges at 1440px** — a title band is title + meta + action, never a lonely
> h1 with 40% dead width; **(2) every page runs the entrance choreography**
> (DESIGN-004) — first paint is staged, not dumped. Route geometry that code
> already implements (containers, rails, the 760px stage) is retained so v2 is
> an evolution, not a rebuild.

## Landing `/` — the sell page (container: 1280px bands)

1. **Hero** — full-bleed `--ts-grad-panel` band with drifting contour layer
   (strong variant). Left: eyebrow, fluid display headline ("Ride like you've
   thought it through."), one-line sub, CTA row (primary clay "Start the course
   — it's free" + ghost "See the six modules" anchor), and under it a **mono
   facts strip**: `6 modules · 22 lessons · ~5 hrs · free`. Right: the
   hero-landing plate **bleeding out of the panel's bottom-right edge** (no box,
   no border), with a soft `--ts-glow-clay` placed behind it. Blaze-diamond
   scroll cue at the band's bottom center.
2. **Trail section** (ground wash) — "Six modules, one trail." The trail path
   **draws in** as the section reveals; six waypoint **ModuleCards WITH their
   hero art** (5/2 crop) alternate along it. Hover/tap expands the card's
   summary line (grid-rows trick, 240ms, grows into the row's empty half —
   must not reflow neighbors) and lifts + zooms art per DESIGN-004. Locked
   modules do not exist here — marketing shows all six in full color.
3. **Ranger demo** (paper band) — the chat mockup **plays itself** on reveal:
   question rises, typing dots, grounded answer rises with its source chip
   (≤1.5s total, once). Beside it: heading + the provenance explanation + one
   suggested-prompt chip row. This demos the differentiator instead of
   describing it.
4. **What you'll build** (moss band) — three JournalCard-style artifact
   previews (risk profile, gear card, ride plan) with their real in-product
   look, staggered reveal. Honest credibility: the course produces artifacts,
   show them.
5. **Honest expectations** (paper band) — the three cards kept, now elevated
   (shadow-1, icon in a tinted circle, hover lift).
6. **Closing CTA** — dark contour band mirroring the hero: display line ("The
   trail is more fun when you can read it."), one clay CTA, compass glyph.
7. **Footer** — the real anchor: pine-950 ground with dark contour texture,
   large display wordmark, four columns (brand + blurb / The course: module
   anchor links / Account: log in · create account · verify a certificate /
   The fine print), blaze-diamond divider row, mono copyright line.

## Auth `/login` `/register`

Split layout kept (it works): left form card now **elevated** (shadow-2,
paper-50, radius-lg) on the ground wash; right pine gradient panel with
drifting contour + rotating field-note quote (kept, crossfade 400ms). Form
fields stagger-rise on mount. Never center-a-lonely-card-in-void (kept law).

## Dashboard `/dashboard` — a bento, not a row of voids (1120px)

Greeting row: display "Good to see you, {name}" + right cluster (level ring +
emblem + mono XP total that counts on reveal). Below, a **bento grid**
(12-col; heights aligned, no hollow middles):

- **Continue card** (span ~8, two rows tall) — dark gradient panel, current
  module's hero art full-bleed behind a left-side scrim, contour drift,
  progress bar draws on reveal, one clay CTA. First-run: welcome variant with
  hero-m1 art. Graduate: `hero-graduate` + certificate CTA + ceremony on first
  render.
- **Trail mini** (span ~4, tall) — vertical six-blaze rail; completed segments
  drawn solid, current blaze breathes; each row is a link with hover tint.
- **Field Journal peek** (span ~4) — latest artifact mini-card, list stretches
  to fill, action pinned bottom.
- **Ask Ranger** (span ~4) — two real SuggestionButton prompts (tappable, they
  deep-link into /tutor) above the CTA — function fills the card, no voids.
- **Recent XP** (span ~4) — ledger rows, icons in clay-100 circles, mono
  amounts; rows rise-stagger on reveal.

All cards: shadow-1 resting, hover lift, entrance stagger. Every widget's
action row sits on the same baseline across the bento.

## Course map `/course` — the signature screen (kept concept, elevated)

Full-page contour ground. Header band composes to its edges: title + lead on
the left, **mono trail stats cluster** right (modules complete / minutes
remaining / XP so far, counting on reveal). The trail **draws** on load
(completed = solid pine-500 draw, future = static dashed), waypoint cards carry
art (kept), locked stays grayscale (kept), current card gets a breathing blaze
and a subtle clay edge glow. Summit card: dark mini-panel with cert-seal glyph.

## Module overview `/course/:moduleId`

**Full-bleed art header** replaces the boxed layout: the module hero fills the
band behind `--ts-grad-scrim`; over it — eyebrow, display title, tagline,
mission line, mono meta (minutes · lessons · XP), objectives as blaze list,
ProgressRing top-right. Lesson list: LessonRows as elevated cards with hover
lift; completed rows' blazes drawn. Complete state: BadgeMedal ceremony slot +
journal artifact card. Locked: scrimmed grayscale header, lock, unlock hint
(kept copy).

## Lesson player `/learn/:lessonId`

Geometry kept exactly (StepRail 240px | stage max 760px | optional right rail;
sticky footer). v2 dresses it: the stage sits on an elevated surface
(paper-50, shadow-1, radius-lg) over the ground wash; rail's section spine is
a thin progress line that draws as steps complete; current step's blaze
breathes; step advance = 240ms directional crossfade; sticky footer goes
translucent + blur with shadow once scrolled. Activity ceremonies per
DESIGN-004. Interstitial kept.

## Journal `/journal` and detail

Header band: title + one-line explainer left; right cluster: mono artifact
count + last-updated. Cards keep the ruled-paper identity, gain shadow-1 +
hover lift + reveal stagger. Detail: ArtifactPreview on an elevated sheet,
provenance line, print for ride_plan (kept).

## Progress `/progress` — the trophy room

Hero band: level ring (draws on mount) + display level title + mono XP total
(counts up) left; right: next-level line ("{n} XP to {title}") with a thin
progress bar that fills on reveal. Badge shelf: earned badges full color with
hover lift (+ the shine sweep ONLY at earn time, not on revisit); unearned
embossed ghosts (kept). Module bars: fill from zero staggered, mono
percentages count alongside. Recent XP feed: stagger-reveal rows.

## Assessment `/assessment` & Certificate `/certificate`

Assessment intro: facts grid becomes four stat tiles with big mono numerals
(20 questions · 80% bar · no timer · attempts). CTA band: dark gradient panel
with `hero-assessment` art bleed. Attempt flow: kept one-question-at-a-time,
question transitions use the directional crossfade; **no inline feedback until
submission** (kept law). Results: pass ceremony per DESIGN-004; fail
interstitial stays calm and directive (kept copy). Certificate: diploma
treatment kept (generous margins, seal, mono code, print) + the 900ms reveal.

## Tutor `/tutor`

Full-height chat kept. v2: messages rise 8px once on entry; Ranger bubbles get
shadow-1 on paper-50; grounding labels and source chips unchanged (they're a
product signature); suggestion chips become pill buttons with hover lift;
composer sticky with translucent blur. The empty-column problem at wide
viewports: the conversation column stays ≤760px but sits on a full-height
contour ground so the margins are *textured*, not blank.

## Instructor `/instructor`

Stat tiles with big mono count-up numerals; tables zebra-striped with pine-100
tint; "serious analytics product" bar kept.

## 404 / locked / 403 / verify

EmptyState compositions kept (art + heading + one action), now with art rise +
staggered text reveal. Never default text (kept).

## App chrome (all authenticated pages)

- **Header:** sticky, translucent paper + blur, shadow on scroll; active nav
  item gets a pill tint (pine-100) — not just color; Ask Ranger button keeps
  its outline.
- **Footer (new):** one-line app footer on every authenticated page — hairline
  top, small wordmark, mono fine-print, verify link. Pages must not end
  mid-air.
- Mobile: bottom tab bar kept (Course, Journal, Ranger, Progress), active tab
  = pill tint + blaze dot.

## Responsive rules

Breakpoints 640/1024 kept. Trail → vertical path; StepRail → top progress bar;
hotspot panel → bottom sheet; touch targets ≥44px (all kept). v2 additions:
bento collapses to a single column in DOM order; full-bleed art headers crop
center-right at mobile (subject stays visible); fluid display type handles the
rest — no separate mobile type scale.
