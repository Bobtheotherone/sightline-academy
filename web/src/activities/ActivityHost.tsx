/* ActivityHost — switches on step.renderer (SPEC-007 §Component architecture).
 * Provides the shared frame every renderer relies on: instructions header,
 * optional helper collapsible, host-level assetSlot, the answered/revisit
 * treatment, and the designed "content unavailable" state for renderer types
 * this build doesn't include. Renderers stay pure ({step, evidence, onEvidence}).
 */
import {
  lazy,
  Suspense,
  useEffect,
  useState,
  type ComponentType,
  type LazyExoticComponent,
} from "react";
import { ChevronDown, CircleHelp, RotateCcw } from "lucide-react";
import type { RendererType, StepOut } from "../lib/api";
import type { ActivityProps, StepPayloadBase } from "./types";
import { BlazeMarker } from "../components/BlazeMarker";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { Glyph, hasGlyph } from "../components/Glyph";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";
import { SlotArt } from "../components/SlotArt";
import { SECTION_LABELS } from "../components/StepRail";
import { ActivityMotionStyles } from "./motion";
import { Markdown } from "./Markdown";

type ActivityComponent = ComponentType<ActivityProps>;

/* The full SPEC-007 registry — one lazy chunk per renderer,
 * activities/<type>/index.tsx default-export convention. */
const REGISTRY: Partial<Record<RendererType, LazyExoticComponent<ActivityComponent>>> = {
  content: lazy(() => import("./content")),
  prediction_reveal: lazy(() => import("./prediction_reveal")),
  multiple_choice: lazy(() => import("./multiple_choice")),
  checkpoint: lazy(() => import("./checkpoint")),
  sort_categorize: lazy(() => import("./sort_categorize")),
  match: lazy(() => import("./match")),
  hotspot_list: lazy(() => import("./hotspot_list")),
  branching_decision: lazy(() => import("./branching_decision")),
  structured_response: lazy(() => import("./structured_response")),
  reflection: lazy(() => import("./reflection")),
  journal_builder: lazy(() => import("./journal_builder")),
  lab_objective: lazy(() => import("./lab_objective")),
};

/* Renderers a learner can meaningfully run again.
 *
 * Excluded on purpose: the three text renderers (structured_response,
 * reflection, journal_builder) are already editable in place, and blanking the
 * editor to "replay" them would read as losing the work rather than starting
 * over. `content` has nothing to run. `branching_decision` is left out because
 * it already carries its own "Ride it again" inside its debrief — a second
 * control beneath it would be two doors to the same room. */
const REPLAYABLE = new Set<RendererType>([
  "prediction_reveal",
  "multiple_choice",
  "checkpoint",
  "sort_categorize",
  "match",
  "hotspot_list",
  "lab_objective",
]);

/** Activity-type mark (VISUAL_ASSETS B-043…B-054): renderer -> slot name. */
const rendererGlyph = (renderer: string) => `act-${renderer.replace(/_/g, "-")}`;

/** Designed "content unavailable" state — never a blank screen (SPEC-007). */
export function ActivityUnavailable({ renderer }: { renderer: string }) {
  useEffect(() => {
    console.error(`ActivityHost: no renderer registered for type "${renderer}"`);
  }, [renderer]);
  return (
    <Card padding="l">
      <EmptyState
        art={<SlotArt slot="state-locked" ratio="5 / 3" />}
        heading="This activity can't be shown"
        body="This step uses an activity this build doesn't include yet. The rest of the lesson works — continue and come back later."
      />
    </Card>
  );
}

export function ActivityHost({ step, evidence, onEvidence, prefill }: ActivityProps) {
  const Renderer = REGISTRY[step.renderer];
  const base = (step.payload ?? {}) as Partial<StepPayloadBase>;
  const banked = Boolean(evidence?.complete);

  /* Replay lives here rather than in each renderer because every renderer
   * already restores itself from `evidence`. Bumping `run` remounts the
   * renderer with no evidence at all, which IS a clean slate — no renderer
   * needed a reset path of its own. Evidence is swallowed for the duration so
   * a practice run cannot overwrite a completed record, and the record is what
   * the learner keeps. LessonPage keys the whole step by id, so `run` clears
   * itself when they move on. */
  const [run, setRun] = useState(0);
  const replaying = run > 0;
  const canReplay = banked && REPLAYABLE.has(step.renderer);
  const answered = banked && !replaying;

  return (
    <section aria-label={step.title} className="flex flex-col gap-5">
      <ActivityMotionStyles />

      <header>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="ts-eyebrow">{SECTION_LABELS[step.section] ?? "Step"}</p>
          {(answered || replaying) && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line-200 bg-moss-100 px-2.5 py-1 text-xs font-medium text-ink-500">
              <BlazeMarker state="done" size="s" />
              {/* Content steps aren't "answered" — they're read (pass-4 P3). */}
              {replaying
                ? "Practice run — your record is safe"
                : step.renderer === "content"
                  ? "Read — revisit freely"
                  : "Answered — changes are saved"}
            </span>
          )}
        </div>
        <div className="mt-1.5 flex items-start gap-3">
          {/* What KIND of step this is, at a glance. The tile gives a 1.5px
           * stroke mark enough presence to sit beside 24px display type —
           * bare, it reads as a smudge rather than an icon. No mark for a
           * renderer we have no art for: an empty tile is worse than none. */}
          {hasGlyph(rendererGlyph(step.renderer)) && (
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-sm border border-line-200 bg-paper-0 text-ink-500">
              <Glyph name={rendererGlyph(step.renderer)} size={20} />
            </span>
          )}
          <h2 className="font-display text-2xl font-bold text-pine-950">{step.title}</h2>
        </div>
        {base.instructions && <p className="mt-2 text-ink-500">{base.instructions}</p>}
      </header>

      {/* Host-level illustration slot; hotspot_list owns its scene in-renderer. */}
      {base.assetSlot && step.renderer !== "hotspot_list" && (
        <SlotArt slot={base.assetSlot} ratio="5 / 2" />
      )}

      {base.helper && (
        <details className="group rounded-sm border border-line-200 bg-paper-0">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-pine-700 [&::-webkit-details-marker]:hidden">
            <CircleHelp className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
            Need a nudge?
            <ChevronDown
              className="ml-auto size-4 shrink-0 transition-transform duration-(--ts-dur-fast) group-open:rotate-180"
              strokeWidth={1.5}
              aria-hidden
            />
          </summary>
          <div className="border-t border-line-200 px-4 py-3 text-sm text-ink-500">
            <Markdown md={base.helper} />
          </div>
        </details>
      )}

      {Renderer ? (
        <Suspense
          fallback={
            <SkeletonGroup label="Loading this activity" className="flex flex-col gap-4">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-2/3" />
            </SkeletonGroup>
          }
        >
          <Renderer
            key={run}
            step={step}
            evidence={replaying ? null : evidence}
            onEvidence={replaying ? () => {} : onEvidence}
            prefill={prefill}
          />
        </Suspense>
      ) : (
        <ActivityUnavailable renderer={step.renderer} />
      )}

      {canReplay && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line-200 pt-4">
          <Button
            variant="secondary"
            size="s"
            iconLeft={<RotateCcw className="size-4" strokeWidth={1.5} aria-hidden />}
            onClick={() => setRun((r) => r + 1)}
          >
            {replaying ? "Start this run over" : "Run it again"}
          </Button>
          {replaying && (
            <Button variant="ghost" size="s" onClick={() => setRun(0)}>
              Back to my answers
            </Button>
          )}
          <p className="text-sm text-ink-500">
            {replaying
              ? "Nothing here is being saved — your completed record is untouched."
              : "Replays don't touch your completed record."}
          </p>
        </div>
      )}
    </section>
  );
}

export type { ActivityProps, StepOut };
