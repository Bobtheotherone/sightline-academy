/* Playback for one simulated run (Module U). The simulation hands over every
 * frame at once and the frames already contain everything that happens — the
 * wheel lift, the roll, the rider letting go — so this hook has exactly one
 * job: decide which frame is on screen right now.
 *
 * Timing is wall-clock. `frame.t` is seconds of simulated time; the loop reads
 * performance.now() deltas and shows the latest frame whose `t` has arrived. If
 * the browser falls behind, frames are skipped rather than queued, so a run
 * that took 4.2 s in the simulation takes 4.2 s on screen no matter how busy
 * the machine is — it never plays slower than real time, and it never plays
 * faster. Nothing here pauses, holds or eases: there is no separate "fall" to
 * choreograph any more.
 *
 * Reduced motion never starts the loop at all: play() lands on the last frame
 * with everything already at rest, and the scrubber becomes the way through the
 * run (DESIGN-004 §6 — JS-driven motion jumps to its end state).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { RunResult } from "./stabilityRun";

type Phase = "idle" | "running" | "done";

export interface SimPlayback {
  /** Index into `result.frames` — 0 when there is nothing to play. */
  frameIndex: number;
  /** True while the rAF loop owns the frame. */
  playing: boolean;
  /** True once the last frame has been reached — the outcome can be shown. */
  done: boolean;
  play: () => void;
  reset: () => void;
  scrub: (i: number) => void;
}

export function useSimPlayback(
  result: RunResult | null,
  { reduced }: { reduced: boolean },
): SimPlayback {
  const [frameIndex, setFrameIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const raf = useRef(0);

  const cancel = useCallback(() => {
    if (raf.current) window.cancelAnimationFrame(raf.current);
    raf.current = 0;
  }, []);

  /* A new result — a fresh run, or a setup change that cleared it — always
   * returns to the top of the run. Also the unmount cleanup. */
  useEffect(() => {
    cancel();
    setFrameIndex(0);
    setPhase("idle");
    return cancel;
  }, [result, cancel]);

  const play = useCallback(() => {
    cancel();
    const frames = result?.frames;
    if (!frames || frames.length === 0) return;
    const last = frames.length - 1;

    if (reduced || last === 0) {
      setFrameIndex(last);
      setPhase("done");
      return;
    }

    setFrameIndex(0);
    setPhase("running");
    /* Frame 0 is t = 0 and is already on screen, so the clock starts with it. */
    const t0 = performance.now();
    let at = 0;

    const tick = (now: number) => {
      const elapsed = (now - t0) / 1000;
      /* Catch up rather than slow down: whatever the frame budget ate, the run
       * stays on the simulation's own clock. */
      while (at < last && frames[at + 1].t <= elapsed) at += 1;
      /* Past the last frame's own time the replay is over, whatever the middle
       * of the list said — a run that stops advancing must not strand the
       * learner on a button that reads "Riding" for ever. */
      if (elapsed >= frames[last].t) at = last;
      setFrameIndex(at);
      if (at >= last) {
        setPhase("done");
        raf.current = 0;
        return;
      }
      raf.current = window.requestAnimationFrame(tick);
    };
    raf.current = window.requestAnimationFrame(tick);
  }, [result, reduced, cancel]);

  const reset = useCallback(() => {
    cancel();
    setFrameIndex(0);
    setPhase("idle");
  }, [cancel]);

  /* Walking the run by hand ends it: the banner stays up and the stage shows
   * whatever the machine was doing at that frame, wreck included. */
  const scrub = useCallback(
    (i: number) => {
      cancel();
      const frames = result?.frames;
      if (!frames || frames.length === 0) return;
      setFrameIndex(Math.max(0, Math.min(frames.length - 1, Math.round(i))));
      setPhase("done");
    },
    [result, cancel],
  );

  return {
    frameIndex,
    playing: phase === "running",
    done: phase === "done",
    play,
    reset,
    scrub,
  };
}
