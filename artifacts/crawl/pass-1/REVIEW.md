# Crawl pass 1 review — Wave 0 exit (run qa/crawl-runs/20260806-032128)

66 screenshots, 12 skips (all /learn renderer states — no course data until Wave 1 seed; skips visible in run-log, not silent). Reviewed against DESIGN-006. Gallery coherence: one product, one palette, display face present everywhere, zero browser-default surfaces, zero placeholder text (slot-label placeholders are the sanctioned designed SlotArt treatment, acceptable ≤ Wave 1).

## Cross-cutting
- P2: All 27 illustration slots render the designed SlotArt placeholder — real art required by Wave 3 (tracked in web/src/assets/manifest.json).
- P2: mid/grad fixtures show first-run data (0%, all locked) — blocked on Wave 1 seed/progress; every "mid-course"/"graduate"/"partial"/"complete" manifest state re-verifies at pass 2.
- Harness: drive_state has no drivers yet for validation-errors, duplicate-email, rate-limited, scrolled-*, delete-confirm reachable? (delete works), assessment/tutor deep states — extend in Wave 3 per QA-001.

## dashboard--first-run--desktop
- Pass. P3: "Ask Ranger" tile bottom-pinned button leaves tall empty middle at 1440.

## course--mixed-locked-unlocked--desktop
- P2: trail path is a straight vertical line; DESIGN-003 wants a winding path whose fill turns pine-300 as modules complete (signature screen — schedule for Wave 2 polish).
- P3: lock chips on the path slightly kiss card corners at 1440.

## root--default--desktop
- P3: closing CTA heading orphans "it." on its own line.
- P2: trail-map section path likewise straight; same winding treatment as /course.

## login/register (all states)
- Pass. P3: field-note quote does not visibly rotate between page loads (both shots show the same quote).
- Harness gap: invalid-credentials/duplicate-email/rate-limited states captured as default renders — need drive_state drivers.

## learn--continue-disabled-with-reason
- Pass for Wave 0: designed "Couldn't open this lesson" error inside the player frame, footer reason line live, Continue disabled with reason. Real step states verify at pass 2.

## journal--empty / tutor--first-run / verify--invalid / 404
- Pass. DESIGN-005 copy verbatim; EmptyState compositions correct.

## mobile set (dashboard, course, journal, tutor, learn)
- Pass: no horizontal scroll, bottom tab bar correct, type scale holds.
- P3: header "Ask Ranger" pill wraps to two lines at 375 — tighten or icon-only at small widths.
- P3: mobile shows both header Ask-Ranger pill and Ranger tab (redundant affordance).
- Note: fixed bottom tab bar paints mid-page in full-page captures — screenshot artifact, verify on device/viewport shots in Wave 3.

## Verdict
Wave 0 exit criteria met: auth roundtrip live, every route renders designed states in the real shells, gallery produced and reviewed. P2 fixes routed into Wave 1/2 lane briefs (winding trail path, fixture-driven deep states, slot art by Wave 3).
