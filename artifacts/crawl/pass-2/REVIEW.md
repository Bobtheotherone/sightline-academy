# Crawl pass 2 review — Wave 1 exit (run qa/crawl-runs/20260806-050051)

77 screenshots, 1 skip. Reviewed against DESIGN-006. The app now shows real
data density everywhere: mid fixture (340 XP, Pathfinder, m3 frontier),
grad (all complete), 12-message tutor history with all grounding treatments.

## Harness work this pass (fix-forward, logged in BUILDLOG)
- LessonPage stage now carries data-step-id (STARTER harness contract).
- drive_state upgraded: ?step deep links, interstitial dismissal, generic
  activity interaction with button cycling, patience window before SKIP.
- stability_explorer state fixture mid → grad (module 4 is locked for mid).

## Renderer deep states (new this pass) — desktop
- prediction_reveal: PASS — locked-in option, per-option + general reveal, answered chip.
- checkpoint-multiple_choice, branching_decision (field-report card + choices),
  reflection, journal_builder (live notebook preview, counters, footer reason),
  sort_categorize (tray + zones + n-of-m), match: all PASS at product quality.
- hotspot_list / lab walkaround / lab stability / checkpoint-structured_response:
  designed "can't be shown" state — EXPECTED until Wave 2 renderers; re-verify pass 3.
- renderer-content: SKIP (harness raced a lazy chunk; patience window added after
  this run; probe-verified the state renders correctly — capture at pass 3).

## Findings
- P2 dashboard--mid: Recent XP rows truncate labels mid-word ("Check...", "Predic...")
  five rows in a column — reads unfinished. Widen/reflow or use lesson-scoped labels.
- P2 (standing): all illustration slots still SlotArt placeholders — Wave 2 art lane.
- P3 course map rings: grad shows "100" where mid dashboard shows "43%" — unify percent display.
- P3 full-page captures paint the sticky footer mid-page (capture artifact only).
- Assessment / certificate / instructor states render their Wave 0 designed shells —
  Wave 2 scope, correctly designed placeholders (locked/not-yet/403 are real states).

## Verdict
Wave 1 exit criteria met: Module 1 playable start-to-finish (browser-verified by
the learning lane and re-verified through the crawl's own activity driving),
tutor acceptance Q1/Q3 spec-exact + Q2 settled honest-label (BUILDLOG), crawl
pass 2 produced and reviewed with fixes applied. P2s routed to Wave 2 briefs.
