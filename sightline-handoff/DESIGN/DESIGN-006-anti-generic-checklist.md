# DESIGN-006 — The Real-Product Checklist (v2)

> **v2 supersedes v1** (2026-08-10, owner directive). v1 policed "not
> vibe-coded"; v2 raises the bar to "indistinguishable from a funded product's
> release". Design QA applies this to EVERY screenshot in every crawl pass.
> A screen passes only if all items hold. ⛔ = automatic P1.
> Crawl operational note: screenshots are taken with reduced motion emulated
> (DESIGN-004 §Verification) — items below judge the settled frame; the
> ceremony list is verified by a human pass per release.

## Identity
- [ ] ⛔ Recognizably Sightline with the logo covered: contour motif and/or
      blaze markers present and correctly used; blaze is still the only
      rotated-square element.
- [ ] Display type (Bricolage) leads the hierarchy; big numerals are mono.
- [ ] ⛔ Token palette only — no stray library grays/blues, no pure #000/#fff
      surfaces, no off-token gradients.
- [ ] Would not be mistaken for: a shadcn/Bootstrap template, the
      cream+serif+terracotta AI default, or a wireframe.

## Depth & liveliness (the v2 core)
- [ ] ⛔ **No dead-flat screens**: an interactive surface shows a real
      elevation hierarchy (ground wash → shadow-1 cards → chrome/overlays).
      A screen where everything sits at one depth fails.
- [ ] ⛔ **No hollow bands**: every full-width band composes to its edges at
      1440px; >40% dead width in a composed band fails. No card with a
      button pinned under a void.
- [ ] Page ends with a footer (marketing or app variant) — no route ends
      mid-air on bare ground.
- [ ] Interactive elements have visible hover AND focus states; cards lift,
      CTAs glow/nudge per DESIGN-004 (spot-check via :focus and hover shots).
- [ ] Progress indicators never render pre-filled on first paint states where
      a draw/fill is specced (checked against the reveal-emulated frame:
      values must be at end state, bars at final width — mid-flight captures
      indicate the harness lost reduced-motion emulation).
- [ ] Art is staged, not boxed: heroes bleed or scrim per DESIGN-003; the
      boxed-plate look appears only in diagram/figure contexts.

## Finish
- [ ] ⛔ No placeholder text, lorem, "TODO", raw slot labels, or attribute
      leaks ("undefined", "NaN", "[object Object]").
- [ ] ⛔ No default browser UI: unstyled controls, default focus outline,
      default validation bubbles.
- [ ] Spacing sits on the 4px grid; nothing collides or touches edges; no
      awkward orphans at tested widths.
- [ ] Icons consistent (Lucide 1.5px); no emoji-as-icons, no mixed sets.
- [ ] Illustrations render real art in the house style; no stock photos, no
      style clashes; scrim text passes 4.5:1 at its darkest position.

## Content
- [ ] Copy is real product copy in the brief's voice — active verbs, sentence
      case, no "Submit"/"Click here"/"Welcome to our platform".
- [ ] Numbers/dates/codes use mono where DESIGN-001 says so; earned numbers
      use CountUp surfaces.
- [ ] Empty/loading/error variants match DESIGN-005 exactly.

## Depth of state (anti-"stagnant demo", kept from v1)
- [ ] ⛔ Screens show REAL data density via the crawl fixtures; hollow
      zero-state everywhere (outside intended first-run shots) fails.
- [ ] Deep states captured, not just landing states (mid-activity, feedback,
      wrong-answer, revisit, locked, offline).
- [ ] Mobile 375px holds the same bar: no horizontal scroll, no crushed
      layouts, tab bar correct, full-bleed headers crop sensibly.

## Motion & performance (human pass, once per release)
- [ ] The ceremony list (DESIGN-004 §Ceremonies) plays as specced in a normal
      browser; nothing exceeds 700ms (cert 900ms excepted); spring easing
      appears only in ceremonies.
- [ ] Reduced-motion parity: with `prefers-reduced-motion`, every flow is
      instant and complete — no waiting out delays, no information lost.
- [ ] No animation-driven layout shift (CLS ≈ 0 stands); only the two ambient
      layers carry `will-change`.
- [ ] Lighthouse on landing + dashboard + a lesson stays ≥ the shipped
      100/100/99 within noise; initial JS stays under R9.2's 350 KB gz.

## Coherence (gallery-level, once per crawl)
- [ ] The whole gallery reads as one product, one voice, one palette, one
      depth system; screens from different lanes indistinguishable in quality.
- [ ] The showcase surfaces — course map, landing, labs, module headers —
      genuinely showcase.
