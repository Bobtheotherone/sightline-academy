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
  type ComponentType,
  type LazyExoticComponent,
} from "react";
import { ChevronDown, CircleHelp } from "lucide-react";
import type { RendererType, StepOut } from "../lib/api";
import type { ActivityProps, StepPayloadBase } from "./types";
import { BlazeMarker } from "../components/BlazeMarker";
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
  const answered = Boolean(evidence?.complete);

  return (
    <section aria-label={step.title} className="flex flex-col gap-5">
      <ActivityMotionStyles />

      <header>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="ts-eyebrow">{SECTION_LABELS[step.section] ?? "Step"}</p>
          {answered && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line-200 bg-moss-100 px-2.5 py-1 text-xs font-medium text-ink-500">
              <BlazeMarker state="done" size="s" />
              {/* Content steps aren't "answered" — they're read (pass-4 P3). */}
              {step.renderer === "content"
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
          <Renderer step={step} evidence={evidence} onEvidence={onEvidence} prefill={prefill} />
        </Suspense>
      ) : (
        <ActivityUnavailable renderer={step.renderer} />
      )}
    </section>
  );
}

export type { ActivityProps, StepOut };
