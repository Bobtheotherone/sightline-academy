/* The lesson player (SPEC-006 §The lesson player, DESIGN-003 §Lesson player):
 * StepRail | Stage (max 760px) | sticky footer. Evidence PUTs on every change
 * through useEvidenceSaver (optimistic, 400ms text debounce, rollback+toast);
 * resume lands on the first incomplete step and restores prior inputs (R2.3);
 * completed steps revisit freely (R2.5); section changes get the designed
 * interstitial; the lesson-complete screen and module-complete moment (R2.6)
 * live in LessonCompleteView. A locked module's lesson renders the DESIGN-005
 * locked composition from the module_locked envelope.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  api,
  ApiError,
  type LessonResponse,
  type RendererType,
  type SectionId,
  type StepOut,
} from "../lib/api";
import type {
  CheckpointPayload,
  EvidenceDraft,
  JournalBuilderPayload,
  JournalFieldValue,
} from "../activities/types";
import { ActivityHost } from "../activities/ActivityHost";
import { useSession } from "../lib/session";
import { Button, LinkButton } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { SectionInterstitial } from "../components/SectionInterstitial";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";
import { SlotArt } from "../components/SlotArt";
import { StepRail } from "../components/StepRail";
import { useEvidenceSaver, type EvidenceEntry } from "./lesson/useEvidenceSaver";
import { LessonCompleteView } from "./lesson/LessonCompleteView";

/** Why Continue is waiting, named per renderer (SPEC-006 — never a mute button). */
const CONTINUE_REASON: Record<RendererType, string> = {
  content: "Read to the end to continue",
  prediction_reveal: "Lock in a prediction to continue",
  multiple_choice: "Find the best answer to continue",
  sort_categorize: "Sort every card home to continue",
  match: "Match every pair to continue",
  hotspot_list: "Visit every point on the scene to continue",
  branching_decision: "Ride the scenario to an ending to continue",
  structured_response: "Write your response to continue",
  journal_builder: "Fill in every journal field to continue",
  reflection: "Tap a chip or jot a line to continue",
  lab_objective: "Meet the lab objectives to continue",
  checkpoint: "Find the best answer to continue",
};

function continueReason(step: StepOut): string {
  if (step.renderer === "checkpoint") {
    const mode = (step.payload as CheckpointPayload).mode;
    if (mode === "structured_response") return "Write your response to continue";
  }
  return CONTINUE_REASON[step.renderer];
}

/** Typed input debounces 400ms; everything else PUTs immediately (SPEC-006). */
function isTypedDraft(step: StepOut, draft: EvidenceDraft): boolean {
  if (draft.kind === "written_response" || draft.kind === "journal_artifact") return true;
  return (
    draft.kind === "checkpoint_response" &&
    (step.payload as CheckpointPayload).mode === "structured_response"
  );
}

/**
 * Where to land on open: the first incomplete required step (resume), unless a
 * ?step deep link names a reachable target — a completed step in a finished
 * lesson (review), an edit link (&edit=1), or the frontier itself. A completed
 * ?step in an unfinished lesson resolves to the next incomplete step, which is
 * how the Dashboard Continue card lands "one past" the last visited step.
 */
function resolveInitialStep(
  steps: StepOut[],
  evidence: Record<string, { complete: boolean }>,
  stepParam: string | null,
  editIntent: boolean,
): string {
  const firstIncomplete = steps.find((s) => s.required && !evidence[s.id]?.complete) ?? null;
  if (stepParam) {
    const target = steps.find((s) => s.id === stepParam);
    if (target) {
      const done = Boolean(evidence[target.id]?.complete);
      if (editIntent && done) return target.id;
      if (target.id === firstIncomplete?.id) return target.id;
      if (done && !firstIncomplete) return target.id;
      // Completed mid-lesson → resume at the frontier; unreached → clamp.
    }
  }
  return (firstIncomplete ?? steps[0]).id;
}

const STAGE_FADE = `
@keyframes ts-stage-in { from { opacity: 0; } to { opacity: 1; } }
.ts-stage-in { animation: ts-stage-in var(--ts-dur-fast) var(--ts-ease-out); }
`;

function Player({ lessonId, data }: { lessonId: string; data: LessonResponse }) {
  const navigate = useNavigate();
  const { user } = useSession();
  const [search] = useSearchParams();

  const steps = useMemo(
    () => [...data.steps].sort((a, b) => a.order - b.order),
    [data.steps],
  );

  const saver = useEvidenceSaver({
    initialEvidence: data.evidence,
    lessonId,
    moduleId: data.lesson.moduleId,
    xpTotalAtMount: user?.xpTotal ?? 0,
  });
  const { evidence, rewards, saveError, submit, flushStep } = saver;

  const [currentId, setCurrentId] = useState(() =>
    resolveInitialStep(steps, data.evidence, search.get("step"), search.get("edit") === "1"),
  );
  const [interstitial, setInterstitial] = useState<{ section: SectionId; nextId: string } | null>(
    null,
  );
  const [view, setView] = useState<"steps" | "complete">("steps");
  /** True when the lesson was already complete on open — review mode (R2.5). */
  const reviewMode = data.lesson.complete;

  const index = Math.max(0, steps.findIndex((s) => s.id === currentId));
  const step = steps[index];
  const entry: EvidenceEntry | null = evidence[step.id] ?? null;
  const completedIds = useMemo(
    () => new Set(steps.filter((s) => evidence[s.id]?.complete).map((s) => s.id)),
    [steps, evidence],
  );
  const isLast = index === steps.length - 1;
  const allRequiredComplete = steps.every((s) => !s.required || evidence[s.id]?.complete);
  const canContinue = Boolean(entry?.complete) || !step.required || step.renderer === "content";

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [currentId, view]);

  const onEvidence = useCallback(
    (draft: EvidenceDraft) => submit(step.id, draft, isTypedDraft(step, draft)),
    [submit, step],
  );

  // journal_builder prefills: resolve prior artifacts for prefillFrom fields.
  const journalPayload =
    step.renderer === "journal_builder" ? (step.payload as JournalBuilderPayload) : null;
  const needsPrefill = Boolean(journalPayload?.fields.some((f) => f.prefillFrom));
  const journalQuery = useQuery({
    queryKey: ["journal"],
    queryFn: () => api.journal(),
    enabled: needsPrefill,
  });
  const prefill = useMemo(() => {
    if (!journalPayload || !needsPrefill || !journalQuery.data) return undefined;
    const out: Record<string, JournalFieldValue> = {};
    for (const field of journalPayload.fields) {
      if (!field.prefillFrom) continue;
      const source = journalQuery.data.artifacts.find(
        (a) => a.artifactType === field.prefillFrom?.artifactType,
      );
      const value = source?.fields[field.prefillFrom.fieldId];
      if (typeof value === "string" || Array.isArray(value)) {
        out[field.id] = value as JournalFieldValue;
      }
    }
    return out;
  }, [journalPayload, needsPrefill, journalQuery.data]);

  const advance = () => {
    flushStep(step.id);
    // Continue is the content renderer's fallback acknowledgement (SPEC-007 §1).
    if (step.renderer === "content" && !entry?.complete) {
      submit(step.id, { kind: "acknowledgement", value: { seen: true }, complete: true }, false);
    }
    if (isLast) {
      if (reviewMode && !rewards.lessonComplete) {
        navigate(`/course/${data.lesson.moduleId}`);
      } else {
        setView("complete");
      }
      return;
    }
    const next = steps[index + 1];
    if (next.section !== step.section && !evidence[next.id]?.complete) {
      setInterstitial({ section: next.section, nextId: next.id });
    } else {
      setCurrentId(next.id);
    }
  };

  if (view === "complete") {
    return (
      <LessonCompleteView
        lesson={data.lesson}
        steps={steps}
        evidence={evidence}
        rewards={rewards}
      />
    );
  }

  const continueLabel = isLast
    ? reviewMode && !rewards.lessonComplete
      ? "Back to module"
      : "Finish lesson"
    : "Continue";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <style>{STAGE_FADE}</style>
      {interstitial && (
        <SectionInterstitial
          section={interstitial.section}
          onDone={() => {
            setCurrentId(interstitial.nextId);
            setInterstitial(null);
          }}
        />
      )}

      <div className="mx-auto grid w-full max-w-page flex-1 gap-8 px-6 py-8 lg:grid-cols-[240px_1fr] lg:px-12">
        {/* Step rail (desktop) / top bar (mobile) */}
        <aside aria-label="Lesson progress" className="lg:border-r lg:border-line-200 lg:pr-6">
          <div className="lg:sticky lg:top-24">
            <Link
              to={`/course/${data.lesson.moduleId}`}
              className="hidden items-center gap-1.5 rounded-sm text-sm font-medium text-pine-700 hover:underline lg:inline-flex"
            >
              <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />
              Module
            </Link>
            <h1 className="hidden font-display text-lg font-bold lg:mt-3 lg:block">
              {data.lesson.title}
            </h1>
            <StepRail
              steps={steps}
              currentId={currentId}
              completedIds={completedIds}
              onSelect={(id) => setCurrentId(id)}
              className="lg:mt-5"
            />
          </div>
        </aside>

        {/* Stage — cross-fades 120ms on step advance (DESIGN-004) */}
        <div className="mx-auto w-full max-w-lesson pb-4">
          {needsPrefill && journalQuery.isLoading ? (
            <SkeletonGroup label="Gathering your prior artifacts" className="flex flex-col gap-4">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-24 w-full" />
            </SkeletonGroup>
          ) : (
            <div key={currentId} className="ts-stage-in">
              <ActivityHost
                step={step}
                evidence={entry}
                onEvidence={onEvidence}
                prefill={prefill}
              />
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer — Continue is never a mute dead button (SPEC-006). */}
      <footer className="sticky bottom-16 z-20 border-t border-line-200 bg-paper-0 lg:bottom-0">
        <div className="mx-auto flex w-full max-w-page items-center justify-between gap-4 px-6 py-3 lg:px-12">
          <Button
            variant="ghost"
            disabled={index === 0}
            onClick={() => setCurrentId(steps[index - 1].id)}
            iconLeft={<ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />}
          >
            Back
          </Button>
          <p
            className={`min-w-0 text-center text-xs sm:text-sm ${saveError ? "font-medium text-danger-600" : "text-ink-500"}`}
            aria-live="polite"
          >
            {saveError
              ? "That answer didn't save — check your connection and try again."
              : !canContinue
                ? continueReason(step)
                : `Step ${index + 1} of ${steps.length}`}
          </p>
          <Button
            disabled={!canContinue || (isLast && !allRequiredComplete && !reviewMode)}
            onClick={advance}
            iconRight={<ArrowRight className="size-4" strokeWidth={1.5} aria-hidden />}
          >
            {continueLabel}
          </Button>
        </div>
      </footer>
    </div>
  );
}

/** DESIGN-005 locked composition, straight from the module_locked envelope. */
function LockedLesson({ message }: { message: string }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <EmptyState
        art={<SlotArt slot="state-locked" ratio="5 / 3" />}
        heading="You haven't unlocked this yet"
        body={message}
        action={<LinkButton to="/course">Back to the course map</LinkButton>}
      />
    </div>
  );
}

export default function LessonPage() {
  const { lessonId = "" } = useParams();

  const query = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => api.lesson(lessonId),
    retry: (failureCount, err) =>
      !(err instanceof ApiError && (err.status === 403 || err.status === 404)) &&
      failureCount < 2,
  });

  if (query.error instanceof ApiError && query.error.code === "module_locked") {
    return <LockedLesson message={query.error.message} />;
  }

  if (query.error != null) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-16">
        <Card padding="l">
          <EmptyState
            art={<SlotArt slot="state-locked" ratio="5 / 3" />}
            heading="Couldn't open this lesson"
            body={
              query.error instanceof ApiError && query.error.status === 404
                ? "No lesson lives at this address. Head back to the course map to pick up the trail."
                : query.error instanceof ApiError && query.error.status === 0
                  ? "The connection dropped before the lesson arrived. Check your network and try again."
                  : "Something went wrong loading the lesson. Try again in a moment."
            }
            action={
              <>
                <Button variant="secondary" onClick={() => query.refetch()}>
                  Try again
                </Button>
                <LinkButton to="/course" variant="ghost">
                  Course map
                </LinkButton>
              </>
            }
          />
        </Card>
      </div>
    );
  }

  if (query.isLoading || !query.data) {
    return (
      <div className="mx-auto grid w-full max-w-page flex-1 gap-8 px-6 py-8 lg:grid-cols-[240px_1fr] lg:px-12">
        <SkeletonGroup label="Loading lesson outline" className="flex gap-3 lg:flex-col">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="hidden h-4 w-32 lg:block" />
          <Skeleton className="hidden h-4 w-28 lg:block" />
          <Skeleton className="hidden h-4 w-32 lg:block" />
          <Skeleton className="h-5 w-24 lg:mt-4" />
          <Skeleton className="hidden h-4 w-28 lg:block" />
        </SkeletonGroup>
        <SkeletonGroup
          label="Loading this step"
          className="mx-auto flex w-full max-w-lesson flex-col gap-4"
        >
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-24 w-full" />
        </SkeletonGroup>
      </div>
    );
  }

  return <Player key={lessonId} lessonId={lessonId} data={query.data} />;
}
