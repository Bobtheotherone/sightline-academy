# DESIGN-006 — Anti-Generic Checklist (the "doesn't look vibe-coded" rubric)

Design QA applies this to EVERY screenshot in every crawl. A screen passes only
if all items hold. Items marked ⛔ are automatic P1 findings.

## Identity
- [ ] ⛔ The screen is recognizably Sightline Safety Academy with the logo covered: contour
      motif and/or blaze markers present and correctly used.
- [ ] Display type (Bricolage) appears in the screen's hierarchy; the screen is
      not 100% default-weight Inter.
- [ ] Palette is the token palette; ⛔ no stray grays/blues from library
      defaults (Tailwind slate/blue tells), no #000/#fff surfaces.
- [ ] The screen would not be mistaken for: a shadcn dashboard template, a
      Bootstrap admin, or the cream+serif+terracotta AI default.

## Finish
- [ ] ⛔ No placeholder text, lorem, "TODO", raw slot labels (past wave 1), or
      empty attribute leaks ("undefined", "NaN", "[object Object]").
- [ ] ⛔ No default browser UI: unstyled buttons/selects/scroll areas, default
      focus outline, default validation bubbles.
- [ ] Spacing sits on the 4px grid; nothing visually collides or touches edges;
      text doesn't orphan awkwardly at the tested widths.
- [ ] Icons are consistent (Lucide 1.5px) — no emoji-as-icons, no mixed sets.
- [ ] Every interactive element has visible hover AND focus states (spot-check
      via the crawl's :focus screenshots).
- [ ] Illustrations/asset slots render real art (wave 3) in the house style —
      no stock photos, no style clashes.

## Content
- [ ] Copy is real product copy in the brief's voice — active verbs on buttons,
      sentence case, no "Submit"/"Click here"/"Welcome to our platform".
- [ ] Numbers/dates/codes use the mono face where DESIGN-001 says so.
- [ ] Empty/loading/error variants match DESIGN-005 exactly.

## Depth (the anti-"stagnant demo" test)
- [ ] ⛔ The screen has REAL data density: the crawl account has genuine
      mid-course state — screenshots of hollow zero-state everywhere (except the
      intended first-run shots) fail the pass.
- [ ] Deep states were captured, not just the route's landing state
      (mid-activity, feedback shown, wrong-answer, revisit mode…).
- [ ] Mobile 375px shot holds the same bar (no horizontal scroll, no crushed
      layouts, tab bar correct).

## Coherence (gallery-level, once per crawl)
- [ ] Viewing the whole gallery: one product, one voice, one palette; screens
      built by different lanes are indistinguishable in quality.
- [ ] The two showcase surfaces (course map, labs) genuinely showcase.
