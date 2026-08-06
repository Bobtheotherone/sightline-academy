/* Module overview (DESIGN-003 §Module overview): ContourPanel header with
 * objectives blaze list + real ProgressRing, LessonRows with per-lesson status
 * (sequenced inside an incomplete module, free revisit once complete — R2.5),
 * BadgeMedal + journal artifact card when complete, and the DESIGN-005 locked
 * composition with the real frontier module + lessons-away count.
 */
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock } from "lucide-react";
import { api, ApiError, type LessonSummary, type ModuleOut } from "../lib/api";
import { ARTIFACT_FACTS, BADGE_FACTS, MODULE_FACTS } from "../lib/modules";
import { ContourPanel } from "../components/ContourPanel";
import { BadgeMedal } from "../components/BadgeMedal";
import { BlazeMarker } from "../components/BlazeMarker";
import { JournalCard, shortDate } from "../components/JournalCard";
import { LessonRow, type LessonRowStatus } from "../components/LessonRow";
import { ProgressRing } from "../components/Progress";
import { Card } from "../components/Card";
import { Button, LinkButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { SlotArt } from "../components/SlotArt";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";

function UnknownModule() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <EmptyState
        art={<SlotArt slot="state-404" ratio="5 / 3" />}
        heading="This trail doesn't exist."
        body="No module lives at this address — the six real ones are all on the course map."
        action={<LinkButton to="/course">Back to the course map</LinkButton>}
      />
    </div>
  );
}

/** DESIGN-005 locked visit: real frontier module title + lessons-away count. */
function LockedModule({ module }: { module: ModuleOut }) {
  const progressQuery = useQuery({ queryKey: ["progress"], queryFn: () => api.progress() });
  const frontier = progressQuery.data?.modules.find((m) => !m.complete);
  const away = frontier ? frontier.lessonsTotal - frontier.lessonsCompleted : null;
  const body =
    frontier && away !== null
      ? `Finish ${frontier.title} first — you're ${away} ${away === 1 ? "lesson" : "lessons"} away.`
      : `The course builds in order for a reason — finish the module before this one first.`;

  return (
    <div className="flex-1">
      <ContourPanel variant="light" className="border-b border-line-200">
        <div className="mx-auto w-full max-w-page px-6 py-10 lg:px-12">
          <Link
            to="/course"
            className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-pine-700 hover:underline"
          >
            <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />
            Course map
          </Link>
          <div className="mt-6 grid items-start gap-8 opacity-70 grayscale lg:grid-cols-[1fr_320px]">
            <div>
              <p className="ts-eyebrow flex items-center gap-2">
                <BlazeMarker state="locked" size="s" />
                Module {module.order} · locked
              </p>
              <h1 className="mt-1 font-display text-3xl font-extrabold">{module.title}</h1>
              <p className="mt-2 text-lg text-ink-500">{module.tagline}</p>
            </div>
            <SlotArt slot={module.heroSlot} ratio="4 / 3" className="hidden lg:block" />
          </div>
        </div>
      </ContourPanel>
      <div className="mx-auto w-full max-w-2xl px-6 py-10">
        <EmptyState
          art={<SlotArt slot="state-locked" ratio="5 / 3" />}
          heading="You haven't unlocked this yet"
          body={body}
          action={
            <LinkButton to={frontier ? `/course/${frontier.moduleId}` : "/course"}>
              {frontier ? `Go to ${frontier.title}` : "Back to the course map"}
            </LinkButton>
          }
        />
      </div>
    </div>
  );
}

function lessonStatuses(lessons: LessonSummary[], moduleComplete: boolean): LessonRowStatus[] {
  let frontierSeen = false;
  return lessons.map((lesson) => {
    if (lesson.complete) return "done";
    if (moduleComplete) return "todo";
    if (!frontierSeen) {
      frontierSeen = true;
      return lesson.percent > 0 ? "active" : "todo";
    }
    return "locked";
  });
}

/** Complete-module extras: the earned BadgeMedal + the artifact built here. */
function CompleteExtras({ module }: { module: ModuleOut }) {
  const facts = MODULE_FACTS.find((m) => m.id === module.id);
  const progressQuery = useQuery({ queryKey: ["progress"], queryFn: () => api.progress() });
  const journalQuery = useQuery({ queryKey: ["journal"], queryFn: () => api.journal() });
  const badge = progressQuery.data?.badges.find((b) => b.id === module.badgeId);
  const badgeName =
    badge?.name ?? BADGE_FACTS.find((b) => b.id === module.badgeId)?.name ?? "Module badge";
  const artifact = facts
    ? journalQuery.data?.artifacts.find((a) => a.artifactType === facts.artifactType)
    : undefined;

  return (
    <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
      <BadgeMedal
        badgeId={module.badgeId}
        name={badgeName}
        earned
        detail={badge?.awardedAt ? `Earned ${shortDate(badge.awardedAt)}` : "Earned"}
        size="l"
        className="shrink-0"
      />
      {artifact && facts && (
        <JournalCard
          to={`/journal/${artifact.artifactType}`}
          eyebrow={ARTIFACT_FACTS[artifact.artifactType].name}
          title={artifact.title || ARTIFACT_FACTS[artifact.artifactType].name}
          status={artifact.status}
          updatedAt={artifact.updatedAt}
          className="w-full max-w-sm"
        />
      )}
    </div>
  );
}

export default function ModulePage() {
  const { moduleId = "" } = useParams();

  const query = useQuery({
    queryKey: ["module", moduleId],
    queryFn: () => api.module(moduleId),
    retry: (n, err) => !(err instanceof ApiError && err.status === 404) && n < 2,
  });

  if (query.error instanceof ApiError && query.error.status === 404) return <UnknownModule />;

  if (query.error != null) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-16">
        <Card padding="l">
          <EmptyState
            heading="Couldn't load this module"
            body={
              query.error instanceof ApiError && query.error.status === 0
                ? "The connection dropped before the module arrived. Check your network and try again."
                : "Something went wrong fetching this module. Try again in a moment."
            }
            action={
              <Button variant="secondary" onClick={() => query.refetch()}>
                Try again
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  if (query.isLoading || !query.data) {
    return (
      <div className="mx-auto w-full max-w-page flex-1 px-6 py-10 lg:px-12">
        <SkeletonGroup label="Loading this module" className="flex flex-col gap-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </SkeletonGroup>
      </div>
    );
  }

  const { module, lessons } = query.data;
  if (module.locked) return <LockedModule module={module} />;

  const ordered = [...lessons].sort((a, b) => a.order - b.order);
  const statuses = lessonStatuses(ordered, module.complete);

  return (
    <div className="flex-1">
      <ContourPanel variant="light" className="border-b border-line-200">
        <div className="mx-auto w-full max-w-page px-6 py-10 lg:px-12">
          <Link
            to="/course"
            className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-pine-700 hover:underline"
          >
            <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />
            Course map
          </Link>
          <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_320px]">
            <div>
              <p className="ts-eyebrow">Module {module.order}</p>
              <h1 className="mt-1 font-display text-3xl font-extrabold">{module.title}</h1>
              <p className="mt-2 text-lg text-ink-500">{module.tagline}</p>
              <p className="mt-4 max-w-2xl">{module.mission}</p>
              <div className="mt-5 flex items-center gap-5">
                <span className="flex items-center gap-1.5 font-mono text-sm text-ink-500">
                  <Clock className="size-4" strokeWidth={1.5} aria-hidden />
                  About {module.estimatedMinutes} minutes
                </span>
                <ProgressRing
                  value={module.percent}
                  size={44}
                  strokeWidth={4}
                  label={
                    module.complete
                      ? "Module complete"
                      : `Module ${module.percent} percent complete`
                  }
                >
                  <span className="font-mono text-xs">{module.percent}%</span>
                </ProgressRing>
              </div>
              <div className="mt-6">
                <p className="ts-eyebrow">You'll be able to</p>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {module.objectives.map((objective) => (
                    <li key={objective} className="flex items-start gap-3">
                      <BlazeMarker
                        state={module.complete ? "done" : "todo"}
                        size="s"
                        className="mt-1.5"
                      />
                      <span className="text-sm">{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {module.complete && (
                <div className="mt-8">
                  <CompleteExtras module={module} />
                </div>
              )}
            </div>
            <SlotArt slot={module.heroSlot} ratio="4 / 3" className="hidden lg:block" />
          </div>
        </div>
      </ContourPanel>
      <div className="mx-auto w-full max-w-page px-6 py-10 lg:px-12">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl font-bold">Lessons</h2>
          {module.complete && (
            <p className="text-sm text-ink-500">Complete — revisit any lesson freely</p>
          )}
        </div>
        <ol className="mt-4 flex flex-col gap-3">
          {ordered.map((lesson, i) => (
            <li key={lesson.id}>
              <LessonRow
                order={lesson.order}
                title={lesson.title}
                minutes={lesson.estimatedMinutes}
                status={statuses[i]}
                to={statuses[i] === "locked" ? undefined : `/learn/${lesson.id}`}
              />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
