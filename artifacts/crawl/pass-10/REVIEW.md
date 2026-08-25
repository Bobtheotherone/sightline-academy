# Crawl pass 10 — GPT art pack integration (run 20260816-063724)

**Scope of change under review:** 83 slots moved to GPT-raster ladders (heroes,
lesson cards, insets, scenarios, callout vignettes, moments, states, Tier G
games + R-series), new consumers (CalloutCard art, games hub art, CleanRun art,
tutor error plates, state-art routing), vite `assetsInlineLimit: 0`.

**Run:** 94 screenshots, 0 skipped/failed, reduced motion emulated, production
build on :4173 against FIXTURES=1 API on :8022. Plus 8 manual gap shots
(`manual-gaps/`) for surfaces the qa manifest does not cover: games hub,
walkaround clean run, replay header, raster anatomy inset, certificate
not-yet, mobile callout stack, mobile games hub.

## Reviewed one by one (changed surfaces)

| Surface | Verdict |
| --- | --- |
| `/` landing hero + six module cards | ✅ a001 bleeds off the dark panel; six heroes read as one series |
| Dashboard continue card (5:2 crop) + graduate variant | ✅ crop keeps subject; b083 graduate band earns the summit |
| Module page hero backdrop + lesson thumbs | ✅ raster thumbs legible at row size incl. locked grey treatment |
| Lesson content callout (m1-l1-s1) desktop + mobile | ✅ c020 as right plate / full-width stack on mobile |
| Hotspot panel: chassis (rejected slot) + brakes (raster) | ✅ SVG fallback proves graceful degradation; c122 zoom correct |
| Branching scenario field report (creek) + replay | ✅ c050 matches prose beat for beat |
| Lesson complete + module complete + next-trail card | ✅ d007 thumb; d008 right-bleed panel art |
| Assessment locked / intro / results-pass | ✅ d016 honors §5.4.1; hero-graduate fade upgraded |
| Progress badge shelf | ✅ d010 vignette beside heading, does not crowd |
| Games hub / order clean run / replay | ✅ g001 band, range chips, card arts, g007 in CleanRun |
| Certificate not-yet | ✅ d011 under the copy that promises it |

## Findings → fixes applied in this pass

1. **P3 · results-pass banner crowding** — d011 as a third art element squeezed
   the headline to four lines. Fixed: d011 moved to `/certificate` not-yet
   state (its copy names the exact moment); pass banner back to medal + hero.
2. **P3 · locked/intro assessment art seam** — bright plate hard-cut against
   the dark panel and overflowed the corner radius. Fixed: `overflow-hidden`
   on both panels + 22% left mask fade (DESIGN-006 "staged, not boxed").
3. **P2 · bundle** — found during gates, not the crawl: 24 small AVIFs
   base64-inlined into JS (and 472 KB of SVG data-URIs at HEAD, pre-existing).
   Fixed: `assetsInlineLimit: 0`; SlotArt chunk 472→48 KB, total JS −40%,
   first-paint 155.5 KB gz (budget 350).

## Gates

tsc ✅ · eslint ✅ · build ✅ · asset lint 207 slots / 0 orphans / 0 problems ✅ ·
J1–J3 ✅ (24.4s, first try). Capture-integrity note: `manual-gaps/` shots were
taken with a minimal script that does not drop sticky chrome on full-page
frames — mid-page floating bars in two shots are capture artifacts, not
product defects (verified against the crawl's own chrome-handled frames).
