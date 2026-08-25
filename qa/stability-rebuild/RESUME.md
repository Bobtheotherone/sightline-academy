# Resume note — stability lab rebuild (physics + painted sprites)

State at the pause (owner restarting the laptop):

## Done
- Sprites cut into web/src/assets/stability/: atv-side.png (+json), atv-rear.png (+json), helmet-side.png.
- Module R (stage) landed: StabilityStage.tsx, stageSprites.tsx, stageTerrain.tsx — renders verified visually (good).
- Module U (lab) landed: StabilityLab.tsx, stabilityUi.tsx, useSimPlayback.ts on the new RunResult contract.
- Coordinator: stabilityFrame.ts (restFrame/previewFrame/marginOf/dominantSlope/readOutcome), StabilitySandbox.tsx
  rewritten on the new stage, old scene*/StabilityScene/stabilitySim* files deleted, unused wheel crops deleted.
- Curriculum m4-l2-s2 already authored for the four scenario objectives (traverse/haul/descent/shortcut).

## In flight when paused
- Module P (physics, matter-js): stabilityWorld.ts (713 lines, 5 tsc errors: Constraint/Anchored at ~446/458,
  anglePrev/positionPrev at ~586, World.debug at ~696), stabilityRun.ts (real implementation present),
  stabilityRun.check.ts (187 lines, unfinished). Agent was killed by the restart — RELAUNCH a fresh agent with
  CONTRACT.md + the renderer conventions below + "finish, don't rewrite".
- Pending mechanical fix (python edit failed on cwd, nothing changed): in stabilityFrame.ts import RunResult
  (drop Outcome) and move REASON_WORD/ROLL_WORD tables from stabilityUi.tsx into it; in stabilityUi.tsx drop the
  unused stabilityRun/stabilityScenarios type imports and re-add `import type { Stance } from "./stabilityModel"`.

## Renderer conventions Module P must match (from Module R's report)
- Side: front faces +x; chassis origin 0.4794 m above ground, wheels at local (+0.6583,−0.1972)/(−0.5917,−0.1972),
  r 0.2821/0.2844; rider origin = pelvis, rest = seat(−0.1376,+0.3028)+0.085; cargo box centre on rack (−0.7569,+0.3555);
  terrain elevation MUST come from sideProfileY() in stageTerrain.tsx (RUN_LENGTH 18, STEP 0.25).
- Rear: downhill +x; chassis origin 0.5349 m above ground; contacts local (−0.4544,−0.5332)/(+0.4611,−0.5332);
  rider rest = seat(0,+0.4444) − 0.10; groundAngle positive = plane falls toward +x; chassis angle ≈ −groundAngle.
- frame.cog and frame.support in WORLD coords; plumbMargin must project onto the tilted plane in the rear view.
- Keep both bodies in frames after the joint breaks (camera frames the midpoint).

## After P lands
tsc + eslint + `npm run build` (PATH=/usr/lib/chatgpt/resources/cua_node/bin:$PATH), run the check script,
restart sightline-web, drive verify_game.mjs (update its pose detection to data-stage hooks / banner text),
review screenshots, remove test accounts, report.
