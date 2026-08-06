/* Lesson-complete summary (SPEC-006 §Lesson complete) and the module-complete
 * moment (R2.6). XP chips count up staggered 60ms (DESIGN-004 moment 3); a
 * module completion adds the badge settle, the artifact recap, and the
 * next-module teaser (or the final-assessment opener after Module 6).
 */
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Flag, NotebookPen } from "lucide-react";
import { api, type LessonSummary, type StepOut } from "../../lib/api";
import type { EvidenceEntry, SessionRewards } from "./useEvidenceSaver";
import type { JournalBuilderPayload } from "../../activities/types";
import { ARTIFACT_FACTS, BADGE_FACTS, MODULE_FACTS } from "../../lib/modules";
import { BadgeMedal } from "../../components/BadgeMedal";
import { Card } from "../../components/Card";
import { ContourPanel } from "../../components/ContourPanel";
import { LinkButton } from "../../components/Button";
import { StatusStitch } from "../../components/JournalCard";
import { XpChip } from "../../components/XpChip";
import { RiseIn } from "../../activities/motion";

function XpItemized({ rewards }: { rewards: SessionRewards }) {
  const total = rewards.xp.reduce((sum, e) => sum + e.xp, 0);
  return (
    <Card padding="m">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-bold">XP earned</h2>
        <span className="font-mono text-sm text-ink-500">+{total} XP this lesson</span>
      </div>
      <ul className="mt-4 flex flex-col gap-2.5">
        {rewards.xp.map((event, i) => (
          <li key={event.id} className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-sm text-pine-950">{event.label}</span>
            <XpChip xp={event.xp} delay={i * 60} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CheckpointResult({
  steps,
  evidence,
}: {
  steps: StepOut[];
  evidence: Record<string, EvidenceEntry>;
}) {
  const checkpoint = steps.find((s) => s.renderer === "checkpoint");
  if (!checkpoint) return null;
  const entry = evidence[checkpoint.id];
  if (!entry?.complete) return null;
  const firstTry = entry.firstAttemptCorrect === true;
  return (
    <Card padding="m" className="flex items-start gap-3.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-pine-700/10">
        <Flag className="size-4.5 text-pine-700" strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="ts-eyebrow">Checkpoint</p>
        <p className="mt-1 font-medium text-pine-950">
          {firstTry ? "Cleared on the first try — sharp eye." : "Cleared after a second look."}
        </p>
        <p className="mt-0.5 text-sm text-ink-500">
          {firstTry
            ? "That instinct is exactly what this course is building."
            : "Retries are part of the trail — what matters is that it stuck."}
        </p>
      </div>
    </Card>
  );
}

function ArtifactBuilt({
  steps,
  evidence,
}: {
  steps: StepOut[];
  evidence: Record<string, EvidenceEntry>;
}) {
  const journalStep = steps.find((s) => s.renderer === "journal_builder");
  if (!journalStep) return null;
  const entry = evidence[journalStep.id];
  if (!entry?.complete) return null;
  const payload = journalStep.payload as JournalBuilderPayload;
  const facts = ARTIFACT_FACTS[payload.artifactType];
  return (
    <Link to={`/journal/${payload.artifactType}`} className="block rounded-md">
      <Card interactive padding="none" className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line-200 px-5 py-2.5">
          <p className="ts-eyebrow">Added to your field journal</p>
          <StatusStitch status="complete" />
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <NotebookPen className="size-5 shrink-0 text-pine-700" strokeWidth={1.5} aria-hidden />
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold">{payload.title}</p>
              <p className="truncate text-sm text-ink-500">{facts?.blurb}</p>
            </div>
          </div>
          <span className="shrink-0 text-sm font-medium text-pine-700">Open it</span>
        </div>
      </Card>
    </Link>
  );
}

function ModuleCompleteMoment({ moduleId, rewards }: { moduleId: string; rewards: SessionRewards }) {
  const facts = MODULE_FACTS.find((m) => m.id === moduleId);
  if (!facts) return null;
  const badge =
    rewards.badges.find((b) => b.id === facts.badgeId) ??
    BADGE_FACTS.find((b) => b.id === facts.badgeId);
  const artifact = ARTIFACT_FACTS[facts.artifactType];
  const nextModule = MODULE_FACTS.find((m) => m.order === facts.order + 1);
  return (
    <ContourPanel variant="dark" className="overflow-hidden rounded-lg">
      <div className="flex flex-col gap-6 p-8">
        <div className="flex flex-wrap items-center gap-6">
          {badge && <BadgeMedal badgeId={facts.badgeId} name={badge.name} earned size="l" />}
          <div className="min-w-0 flex-1">
            <p className="ts-eyebrow text-sun-400!">Module {facts.order} complete</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-paper-0">{facts.title}</h2>
            <p className="mt-2 max-w-lg text-sm text-paper-0/80">
              The {artifact.name} you built here rides with you — it comes back when you write
              your Ride Plan.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-paper-0/15 bg-paper-0/5 px-5 py-4">
          {nextModule ? (
            <>
              <div className="min-w-0">
                <p className="ts-eyebrow text-pine-300!">Next on the trail</p>
                <p className="mt-1 font-display text-lg font-bold text-paper-0">
                  Module {nextModule.order} · {nextModule.title}
                </p>
                <p className="mt-0.5 text-sm text-paper-0/70">{nextModule.tagline}</p>
              </div>
              <LinkButton
                to={`/course/${nextModule.id}`}
                variant="accent"
                iconRight={<ArrowRight className="size-4" strokeWidth={2} aria-hidden />}
              >
                Open Module {nextModule.order}
              </LinkButton>
            </>
          ) : (
            <>
              <div className="min-w-0">
                <p className="ts-eyebrow text-pine-300!">The trail's end</p>
                <p className="mt-1 font-display text-lg font-bold text-paper-0">
                  The final assessment is open
                </p>
                <p className="mt-0.5 text-sm text-paper-0/70">
                  Twenty questions, no timer — show yourself the whole course stuck.
                </p>
              </div>
              <LinkButton
                to="/assessment"
                variant="accent"
                iconRight={<ArrowRight className="size-4" strokeWidth={2} aria-hidden />}
              >
                Take the assessment
              </LinkButton>
            </>
          )}
        </div>
      </div>
    </ContourPanel>
  );
}

export function LessonCompleteView({
  lesson,
  steps,
  evidence,
  rewards,
}: {
  lesson: LessonSummary;
  steps: StepOut[];
  evidence: Record<string, EvidenceEntry>;
  rewards: SessionRewards;
}) {
  const moduleQuery = useQuery({
    queryKey: ["module", lesson.moduleId],
    queryFn: () => api.module(lesson.moduleId),
  });
  const nextLesson = moduleQuery.data?.lessons.find((l) => l.order === lesson.order + 1);

  return (
    <div className="mx-auto flex w-full max-w-lesson flex-col gap-5 px-6 py-10">
      <RiseIn>
        <header className="text-center">
          <p className="ts-eyebrow">Lesson complete</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-pine-950">
            {lesson.title}
          </h1>
        </header>
      </RiseIn>

      {rewards.xp.length > 0 && (
        <RiseIn delay={80}>
          <XpItemized rewards={rewards} />
        </RiseIn>
      )}

      <RiseIn delay={140}>
        <div className="flex flex-col gap-5">
          <CheckpointResult steps={steps} evidence={evidence} />
          <ArtifactBuilt steps={steps} evidence={evidence} />
        </div>
      </RiseIn>

      <RiseIn delay={200}>
        {rewards.moduleComplete ? (
          <ModuleCompleteMoment moduleId={lesson.moduleId} rewards={rewards} />
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {nextLesson ? (
              <LinkButton
                to={`/learn/${nextLesson.id}`}
                size="l"
                iconRight={<ArrowRight className="size-4" strokeWidth={2} aria-hidden />}
              >
                Next lesson — {nextLesson.title}
              </LinkButton>
            ) : (
              <LinkButton
                to={`/course/${lesson.moduleId}`}
                size="l"
                iconRight={<ArrowRight className="size-4" strokeWidth={2} aria-hidden />}
              >
                Back to the module
              </LinkButton>
            )}
            <LinkButton to={`/course/${lesson.moduleId}`} variant="ghost">
              Module overview
            </LinkButton>
          </div>
        )}
      </RiseIn>

      {rewards.moduleComplete && (
        <RiseIn delay={260}>
          <div className="flex justify-center">
            <Link
              to="/course"
              className="rounded-sm text-sm font-medium text-pine-700 hover:underline"
            >
              Back to the course map
            </Link>
          </div>
        </RiseIn>
      )}
    </div>
  );
}
