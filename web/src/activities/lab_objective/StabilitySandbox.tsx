/* Free tilt — the sandbox tab. One ground control tilts both views at once so
 * you can sweep the whole envelope by hand: no run, no objectives, no outcome,
 * just the plumb line moving toward an edge while you watch. Drawn on the
 * same painted stage as the scenario runs, parked, from `restFrame`.
 */
import { useState } from "react";
import type { RiderSetup } from "./stabilityRun";
import { SCENARIOS, type Scenario } from "./stabilityScenarios";
import { restFrame, marginOf } from "./stabilityFrame";
import { StabilityStage } from "./StabilityStage";
import { SliderRow, StanceToggle, ViewPanel, leanWords } from "./stabilityUi";

/** A constant-grade stand-in for the stage's terrain: the profile is the slider. */
function flatScenario(view: "rear" | "side", deg: number): Scenario {
  const base = SCENARIOS.find((s) => s.view === view) ?? SCENARIOS[0];
  return { ...base, view, profile: [{ s: 0, deg }, { s: 1, deg }], event: undefined, cargo: undefined, cargoLocked: false };
}

export function StabilitySandbox() {
  const [slope, setSlope] = useState(0);
  const [lean, setLean] = useState(0);
  const [cargo, setCargo] = useState(0);
  const [stance, setStance] = useState<RiderSetup["stance"]>("seated");

  const setup: RiderSetup = { lean: lean / 100, cargo: cargo / 100, stance };
  const rearScenario = flatScenario("rear", slope);
  const sideScenario = flatScenario("side", slope);
  const rearFrame = restFrame("rear", slope, setup, setup.cargo);
  /* The side stage's camera holds the machine a third in from the left, so
   * park it 2.2 m up the run rather than at the origin. */
  const sideFrame = restFrame("side", slope, setup, setup.cargo, 2.2, 2.2 * Math.tan((slope * Math.PI) / 180));
  const rearMargin = marginOf(rearFrame);
  const sideMargin = marginOf(sideFrame);
  const sideNoLoad = marginOf(restFrame("side", slope, setup, 0, 2.2, 2.2 * Math.tan((slope * Math.PI) / 180)));
  const cargoCost = Math.max(0, Math.round((sideNoLoad - sideMargin) * 100));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-500">
        One ground control tilts both views — the rear view reads it as side-slope, the side view
        as an uphill grade. Sweep it and watch which edge the plumb line reaches first.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <ViewPanel title="Rear view" subtitle="side-slope" angleLabel={`${slope.toFixed(1)}°`} margin={rearMargin}>
          <StabilityStage
            scenario={rearScenario}
            frame={rearFrame}
            setup={setup}
            ariaLabel={`Rear view: your ATV on a ${slope.toFixed(0)} degree side-slope, stability margin ${Math.round(rearMargin * 100)} percent.`}
          />
        </ViewPanel>
        <ViewPanel
          title="Side view"
          subtitle="uphill grade"
          angleLabel={`${slope.toFixed(1)}°`}
          margin={sideMargin}
          footnote={cargo > 0 ? `The load is costing you ${cargoCost} points of margin at this grade.` : undefined}
        >
          <StabilityStage
            scenario={sideScenario}
            frame={sideFrame}
            setup={setup}
            ariaLabel={`Side view: your ATV on a ${slope.toFixed(0)} degree climb, stability margin ${Math.round(sideMargin * 100)} percent.`}
          />
        </ViewPanel>
      </div>

      <div
        className="grid gap-x-6 gap-y-4 rounded-md border border-line-200 bg-moss-100/60 p-4 sm:grid-cols-2 lg:grid-cols-4"
        role="group"
        aria-label="Free tilt controls"
      >
        <SliderRow id="free-slope" label="Ground slope" min={0} max={35} step={0.5} value={slope} onChange={setSlope} format={(v) => `${v.toFixed(1)}°`} />
        <SliderRow id="free-lean" label="Your lean" min={-100} max={100} step={5} value={lean} onChange={setLean} format={(v) => leanWords("rear", 1, v)} />
        <StanceToggle value={stance} onChange={setStance} />
        <SliderRow id="free-cargo" label="Rear rack" min={0} max={100} step={5} value={cargo} onChange={setCargo} format={(v) => (v === 0 ? "empty" : `${v}% load`)} />
      </div>
    </div>
  );
}
