/* StabilityLab (SPEC-007 §11, Module 4) — "Hold the Line". Four pieces of
 * ground, one machine. You pick a scenario, set yourself up (lean, stance,
 * load), play the run, and watch where the center of gravity goes: the machine
 * makes it, rolls, or puts you off. One scenario is a no-go — nothing in the
 * setup clears it, and turning back is the answer.
 *
 * The run is a rigid-body simulation (stabilityRun) over the roster in
 * stabilityScenarios; the painted stage is StabilityStage; the parts this and
 * the free-tilt sandbox share live in stabilityUi. This file owns the game
 * loop: what is selected, what was simulated, what the banner says, and which
 * objective that clears.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Play, RotateCcw, Undo2 } from "lucide-react";
import { Button } from "../../components/Button";
import { FeedbackStrip } from "../../components/FeedbackStrip";
import { Tabs } from "../../components/Tabs";
import { useReducedMotion } from "../motion";
import { runScenario, type RiderSetup, type RunFrame, type RunResult } from "./stabilityRun";
import { SCENARIOS, type Scenario, type ScenarioId } from "./stabilityScenarios";
import { StabilityStage } from "./StabilityStage";
import { StabilitySandbox } from "./StabilitySandbox";
import { useSimPlayback } from "./useSimPlayback";
import {
  AboutSimulation,
  RANGE_CSS,
  RunProgress,
  ScenarioCard,
  SliderRow,
  StanceToggle,
  ViewPanel,
  leanHint,
  leanWords,
} from "./stabilityUi";
import { dominantSlope, marginOf, previewFrame, readOutcome } from "./stabilityFrame";
import type { LabComponentProps } from "./index";

const PER_RAD = 180 / Math.PI;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const pctOf = (v: number) => Math.round(clamp(v, 0, 1) * 100);

/** The setup in slider units: lean −100..100, cargo 0..100. */
interface Rig {
  lean: number;
  cargo: number;
  stance: RiderSetup["stance"];
}

/** A scenario's own defaults: its load, centered, on the seat. */
const rigFor = (sc: Scenario | undefined): Rig =>
  ({ lean: 0, cargo: Math.round((sc?.cargo ?? 0) * 100), stance: "seated" });

export function StabilityLab({ met, meet, revisit }: LabComponentProps) {
  const reduced = useReducedMotion();
  const first = SCENARIOS[0] as Scenario | undefined;
  const [scenarioId, setScenarioId] = useState<ScenarioId>(first?.id ?? "traverse");
  const [rig, setRig] = useState<Rig>(() => rigFor(first));
  const [result, setResult] = useState<RunResult | null>(null);
  /* The beat between pressing Play and the first frame: the simulation is
   * synchronous and holds the thread while it runs. */
  const [riding, setRiding] = useState(false);
  const [failed, setFailed] = useState(false);
  const [turnedBack, setTurnedBack] = useState<null | "noGo" | "rideable">(null);
  const wantPlay = useRef(false);
  const runId = useRef(0);
  const timer = useRef(0);
  const bannerRef = useRef<HTMLDivElement>(null);
  const playback = useSimPlayback(result, { reduced });

  const scenario: Scenario | undefined =
    SCENARIOS.find((s) => s.id === scenarioId) ?? (SCENARIOS[0] as Scenario | undefined);

  /* The run is simulated once per Play, so the loop can only start after the
   * new result has committed — the hook rewinds on it first, then this plays
   * it. Clearing `riding` in the same pass hands the button straight from
   * "Riding" to the frames without a flicker in between. */
  useEffect(() => {
    if (!result || !wantPlay.current) return;
    wantPlay.current = false;
    setRiding(false);
    playback.play();
  }, [result]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  /* A clean run is the objective. `meet` ignores repeats. */
  useEffect(() => {
    if (!scenario || !result || !playback.done) return;
    if (result.outcome.kind === "clean") meet(scenario.id);
  }, [playback.done, result, scenario]);

  /* The verdict lands below the stage; bring it into view so the payoff never
   * needs a scroll. Instant under reduced motion. */
  useEffect(() => {
    if (!result || !playback.done) return;
    bannerRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "end" });
  }, [playback.done, result, reduced]);

  if (!scenario) {
    return <p className="text-sm text-ink-500">This lab has no scenarios loaded.</p>;
  }

  const setup: RiderSetup = { lean: rig.lean / 100, cargo: rig.cargo / 100, stance: rig.stance };
  const slopeSign = dominantSlope(scenario);
  const frames = result && result.frames.length > 0 ? result.frames : null;
  /* The simulation owns the frame list, so an index that cannot be reached (a
   * run just replaced) falls back to the machine parked at the start line. */
  const picked = frames
    ? (frames[clamp(playback.frameIndex, 0, frames.length - 1)] as RunFrame | undefined)
    : undefined;
  const frame: RunFrame = picked ?? previewFrame(scenario, setup);
  /* Once a run has failed, the readouts describe the moment it failed — not the
   * wreck sliding down the hill afterwards. The stage still shows every frame. */
  const failIdx = result?.failIndex ?? null;
  const readout: RunFrame =
    failIdx !== null && frames && playback.frameIndex >= failIdx ? (frames[failIdx] ?? frame) : frame;
  const margin = marginOf(readout);
  const marginPct = pctOf(margin);
  const gradeDeg = Math.abs(readout.groundAngle) * PER_RAD;

  /* Everything a run put on screen goes away together: a stale result, a
   * pending simulation, a banner, a turn-back note. */
  const clearRun = () => {
    runId.current += 1;
    window.clearTimeout(timer.current);
    wantPlay.current = false;
    setRiding(false);
    setFailed(false);
    setResult(null);
    setTurnedBack(null);
  };

  const change = (patch: Partial<Rig>) => {
    clearRun();
    setRig((r) => ({ ...r, ...patch }));
  };

  const select = (next: Scenario) => {
    clearRun();
    setScenarioId(next.id);
    setRig(rigFor(next));
  };

  const onPlay = () => {
    clearRun();
    setRiding(true);
    const id = runId.current;
    /* runScenario is synchronous and takes a beat, so hand the browser one turn
     * to repaint the button as "Riding" before the simulation blocks it. */
    timer.current = window.setTimeout(() => {
      if (id !== runId.current) return;
      try {
        const ran = runScenario(scenario, setup);
        wantPlay.current = true;
        setResult(ran);
      } catch {
        setRiding(false);
        setFailed(true);
      }
    }, 0);
  };

  const onReset = () => {
    clearRun();
    setRig(rigFor(scenario));
  };

  const onTurnBack = () => {
    clearRun();
    if (scenario.noGo) {
      meet(scenario.id);
      setTurnedBack("noGo");
    } else {
      setTurnedBack("rideable");
    }
  };

  const failAt = result?.failIndex ?? null;
  const rolled =
    result?.outcome.kind === "rollover" && failAt !== null && playback.frameIndex >= failAt;
  const stateWord = rolled
    ? ", the machine is going over"
    : frame.riderAttached
      ? ""
      : ", you are off the machine";
  const banner = result && playback.done ? readOutcome(scenario, result) : null;
  /* Once the machine is tumbling the frozen plumb no longer describes it and
   * reads as a marker floating in space — the fact line and the scrubber carry
   * where the line crossed. Rider-off keeps it: the machine is still on its
   * wheels. */
  const showPlumb = !rolled;
  const scrubbable = frames !== null && frames.length > 1 && (reduced || playback.done);
  const busy = riding || playback.playing;

  const game = (
    <div className="flex flex-col gap-4 pb-16">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="ts-eyebrow">Pick your ground</p>
        {revisit && (
          <p className="text-sm text-ink-500">All four are cleared — ride them again for the feel.</p>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SCENARIOS.map((s) => (
          <ScenarioCard
            key={s.id}
            title={s.title}
            eyebrow={s.eyebrow}
            view={s.view}
            selected={s.id === scenario.id}
            cleared={met.has(s.id)}
            onSelect={() => select(s)}
          />
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <ViewPanel
          title={scenario.view === "rear" ? "Rear view" : "Side view"}
          subtitle={scenario.view === "rear" ? "side-slope" : slopeSign < 0 ? "descent" : "climb"}
          angleLabel={
            scenario.view === "rear"
              ? `${gradeDeg.toFixed(1)}°`
              : `${gradeDeg.toFixed(1)}° ${slopeSign < 0 ? "down" : "up"}`
          }
          margin={margin}
          footnote={
            frame.eventActive && scenario.event ? `Through the ${scenario.event.kind} now.` : undefined
          }
          footerExtra={
            <>
              <RunProgress
                s={readout.s}
                event={scenario.event ? { s: scenario.event.s, label: scenario.event.label } : null}
              />
              {scrubbable && frames && (
                <div>
                  <label htmlFor="stab-scrub" className="text-xs font-medium text-ink-500">
                    Walk the run frame by frame
                  </label>
                  <input
                    id="stab-scrub"
                    type="range"
                    min={0}
                    max={frames.length - 1}
                    step={1}
                    value={playback.frameIndex}
                    onChange={(e) => playback.scrub(Number(e.target.value))}
                    aria-valuetext={`${pctOf(readout.s)}% along, ${gradeDeg.toFixed(0)} degrees, margin ${marginPct} percent`}
                    className="ts-range mt-2 w-full"
                    style={
                      {
                        "--fill": `${(playback.frameIndex / (frames.length - 1)) * 100}%`,
                      } as CSSProperties
                    }
                  />
                </div>
              )}
            </>
          }
        >
          <StabilityStage
            scenario={scenario}
            frame={frame}
            setup={setup}
            showPlumb={showPlumb}
            ariaLabel={`${scenario.view === "rear" ? "Rear view" : "Side view"}: your ATV at ${gradeDeg.toFixed(0)} degrees, stability margin ${marginPct} percent${stateWord}.`}
          />
        </ViewPanel>

        <aside
          className="flex flex-col gap-4 rounded-md border border-line-200 bg-moss-100/60 p-4"
          aria-label="Rider setup"
        >
          <p className="text-sm text-ink-500">{scenario.brief}</p>
          <SliderRow
            id="stab-lean"
            label="Your lean"
            min={-100}
            max={100}
            step={5}
            value={rig.lean}
            onChange={(v) => change({ lean: v })}
            format={(v) => leanWords(scenario.view, slopeSign, v)}
            hint={leanHint(scenario.view, slopeSign)}
          />
          <StanceToggle value={rig.stance} onChange={(v) => change({ stance: v })} />
          <SliderRow
            id="stab-cargo"
            label="Rear rack"
            min={0}
            max={100}
            step={5}
            value={rig.cargo}
            onChange={(v) => change({ cargo: v })}
            format={(v) => (v === 0 ? "empty" : `${v}% load`)}
            disabled={Boolean(scenario.cargoLocked)}
            hint={
              scenario.cargoLocked
                ? "The load is what you came for — this run carries it."
                : undefined
            }
          />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={onPlay}
              disabled={busy}
              className="min-h-11 flex-1"
              iconLeft={
                playback.done
                  ? <RotateCcw className="size-4" strokeWidth={2} aria-hidden />
                  : <Play className="size-4" strokeWidth={2} aria-hidden />
              }
            >
              {busy ? "Riding" : playback.done ? "Try again" : "Play the run"}
            </Button>
            <Button
              variant="secondary"
              onClick={onTurnBack}
              className="min-h-11 flex-1"
              iconLeft={<Undo2 className="size-4" strokeWidth={2} aria-hidden />}
            >
              Turn back
            </Button>
            {(result || failed || turnedBack) && (
              <Button variant="ghost" onClick={onReset} className="min-h-11 w-full">
                Reset the setup
              </Button>
            )}
          </div>
        </aside>
      </div>

      {banner && (
        <div ref={bannerRef} className="scroll-mb-28">
          <FeedbackStrip tone={banner.tone} label={banner.label} md={banner.md}>
            <p className="mt-1.5 font-mono text-xs text-ink-500">{banner.fact}</p>
            {scenario.noGo && scenario.hints.noGoAfterFail && (
              <p className="mt-1.5">{scenario.hints.noGoAfterFail}</p>
            )}
          </FeedbackStrip>
        </div>
      )}
      {failed && (
        <FeedbackStrip tone="info" label="The run did not start">
          <p className="mt-0.5">
            The simulation stopped before it could ride this one, so there is nothing to watch.
            Nothing in your setup caused it — play it again, or pick another piece of ground.
          </p>
        </FeedbackStrip>
      )}
      {turnedBack === "noGo" && (
        <FeedbackStrip tone="positive" label="You turned back">
          <p className="mt-0.5">
            {scenario.hints.noGoAfterFail ??
              "No setup clears this one. Reading the ground and picking another line is the skill."}
          </p>
        </FeedbackStrip>
      )}
      {turnedBack === "rideable" && (
        <FeedbackStrip tone="info" label="Turned back">
          <p className="mt-0.5">Good instinct — this one is rideable, though. Try a setup.</p>
        </FeedbackStrip>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <style>{RANGE_CSS}</style>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-500">
          Set yourself up, play the run, and watch the plumb line — you keep the machine while it
          stays between the tires.
        </p>
        <AboutSimulation />
      </div>
      <Tabs
        label="Stability lab"
        items={[
          { value: "runs", label: "Scenario runs", content: game },
          { value: "free", label: "Free tilt", content: <StabilitySandbox /> },
        ]}
      />
    </div>
  );
}
