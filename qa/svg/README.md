# qa/svg — SVG candidates for owner inspection (not wired)

Everything in this folder is a **candidate**. Nothing here is referenced by
`web/src/assets/manifest.json`; the app still serves what it served before. Wiring is
a separate step after you have looked.

- `BRIEFS.md` — the contract and the thirteen briefs these files were built to.
- `*.svg` — the candidates (seven animated plates, four sort icons, one level emblem,
  one badge).
- `renders/` — what each file looks like the way the app shows it:
  `<name>.img.png` (inside an `<img>`, motion on), `<name>.rm.png` (reduced motion —
  must equal the complete state), `<name>.frames.png` (12 paused frames of the
  animation), `<name>.true.png` / `<name>.zoom.png` (icons at true size / 4×).
- `index.html` — open it in a browser: every candidate live (animations play), beside
  its reduced-motion render, frame sheet, the verdicts from the build/review rounds,
  and the current shipped art it would replace.
- `AUDIT.md` — the review log: per file, builder iterations, reviewer findings,
  fix rounds, final verdict and residuals.
- `_check.py`, `_render.py` — the tools; run them on any SVG in here.

To preview an animation on its own, open the `.svg` directly in a browser. To see
the reduced-motion state, toggle "reduce motion" in your OS accessibility settings
and reload, or trust `renders/<name>.rm.png`.
