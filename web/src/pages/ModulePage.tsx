/* Module overview (DESIGN-003 v2 §Module overview): a full-bleed art header —
 * the module hero filling the band under the scrim, carrying eyebrow, display
 * title, tagline, mission, mono meta, the objectives blaze list and a
 * ProgressRing plate — then LessonRows as elevated cards with per-lesson status
 * (sequenced inside an incomplete module, free revisit once complete — R2.5),
 * the BadgeMedal + journal artifact card when complete, and the DESIGN-005
 * locked composition with the real frontier module + lessons-away count.
 */
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { api, ApiError, type LessonSummary, type ModuleOut } from "../lib/api";
import { ARTIFACT_FACTS, BADGE_FACTS, MODULE_FACTS } from "../lib/modules";
import { Reveal } from "../activities/motion";
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

/** SPEC-009 XP table: module_complete = 75. Server-authoritative; mirrored here
 * only to say what finishing this module is worth. */
const MODULE_COMPLETE_XP = 75;

/* The six heroes are light illustrations, so type over them needs a veil of its
 * own. Measured against the lightest pixels in the art: paper-0 at 90% clears
 * 4.5:1 over a 72% veil; the gear flat-lay is cream edge to edge with no dark
 * passages at all, so it takes the deepest flat one.
 *
 * Below lg the copy spans the band, so the veil is flat. From lg the copy is
 * capped to the left column and the veil becomes a left-weighted ramp: opaque
 * behind the type, ≤12% past 88% — the illustration reads on the right instead
 * of sitting under a dead slab. One layer runs at a time (and the art's own
 * vertical scrim is dropped) so the band is never double-scrimmed. */
const HEADER_VEIL: Record<string, string> = { "hero-m3-gear": "bg-pine-950/82" };
const HEADER_RAMP =
  "bg-linear-to-r from-pine-950/94 via-pine-950/88 via-58% to-pine-950/12 to-88%";

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

/** The full-bleed art header: hero behind the veil, everything else over it. */
function ModuleHeader({
  module,
  lessonCount,
  lessonsDone,
  next,
  locked = false,
}: {
  module: ModuleOut;
  lessonCount: number;
  lessonsDone: number;
  /** First unfinished lesson — the header's primary action. */
  next?: LessonSummary;
  locked?: boolean;
}) {
  return (
    <header className="relative isolate overflow-hidden bg-pine-950 text-paper-0">
      <span className="absolute inset-0 -z-10 block">
        <SlotArt
          slot={module.heroSlot}
          variant="dark"
          bleed
          priority
          sizes="100vw"
          className={`h-full w-full ${locked ? "grayscale" : ""}`}
        />
      </span>
      <span
        aria-hidden
        className={`absolute inset-0 -z-10 lg:hidden ${
          HEADER_VEIL[module.heroSlot] ?? "bg-pine-950/72"
        }`}
      />
      <span aria-hidden className={`absolute inset-0 -z-10 hidden lg:block ${HEADER_RAMP}`} />
      <div className="mx-auto w-full max-w-page px-6 py-10 lg:px-12 lg:py-14">
        <Link
          to="/course"
          className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-paper-0/80 transition-colors duration-(--ts-dur-fast) hover:text-paper-0 hover:underline"
        >
          <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />
          Course map
        </Link>
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          {/* The copy column is capped from lg so it clears the veil's ramp —
           * type stays on the opaque left, the art keeps the right. */}
          <Reveal className="lg:max-w-xl">
            <p className="ts-eyebrow flex items-center gap-2 text-paper-0/90!">
              {locked && <BlazeMarker state="locked" size="s" />}
              Module {module.order}
              {locked && " · locked"}
            </p>
            <h1 className="mt-2 font-display text-3xl font-extrabold text-paper-0 md:text-4xl">
              {module.title}
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-paper-0/90">{module.tagline}</p>
            <p className="mt-4 max-w-2xl text-paper-0/85">{module.mission}</p>
            <p className="mt-5 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-sm text-paper-0/85">
              <span>About {module.estimatedMinutes} min</span>
              {lessonCount > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span>
                    {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}
                  </span>
                </>
              )}
              <span aria-hidden>·</span>
              <span>+{MODULE_COMPLETE_XP} XP on completion</span>
            </p>
            {next && (
              <div className="mt-6">
                <LinkButton
                  to={`/learn/${next.id}`}
                  variant="accent"
                  size="l"
                  iconRight={<ArrowRight className="size-4" strokeWidth={2} aria-hidden />}
                >
                  {lessonsDone > 0 || next.percent > 0 ? "Continue" : `Start lesson ${next.order}`}
                </LinkButton>
              </div>
            )}
            <div className="mt-7">
              <p className="ts-eyebrow text-paper-0/90!">You'll be able to</p>
              <ul className="mt-3 flex max-w-2xl flex-col gap-2.5">
                {module.objectives.map((objective) => (
                  <li key={objective} className="flex items-start gap-3">
                    <BlazeMarker
                      state={module.complete ? "done" : "todo"}
                      size="s"
                      className="mt-1.5"
                    />
                    <span className="text-sm text-paper-0/90">{objective}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          {!locked && (
            <Reveal index={1} className="lg:justify-self-end">
              <div className="flex w-fit items-center gap-4 rounded-lg border border-line-200 bg-paper-0/95 px-5 py-4 shadow-2 lg:flex-col lg:gap-3">
                <ProgressRing
                  value={module.percent}
                  size={76}
                  strokeWidth={6}
                  animateIn
                  label={
                    module.complete
                      ? "Module complete"
                      : `Module ${module.percent} percent complete`
                  }
                >
                  <span className="font-mono text-base font-medium text-pine-950">
                    {module.percent}
                    <span className="text-[10px]">%</span>
                  </span>
                </ProgressRing>
                <div className="lg:text-center">
                  <p className="ts-eyebrow">{module.complete ? "Complete" : "Your progress"}</p>
                  <p className="mt-0.5 font-mono text-xs text-ink-500">
                    {lessonsDone}/{lessonCount} lessons
                  </p>
                </div>
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </header>
  );
}

/** DESIGN-005 locked visit: real frontier module title + lessons-away count. */
function LockedModule({ module, lessonCount }: { module: ModuleOut; lessonCount: number }) {
  const progressQuery = useQuery({ queryKey: ["progress"], queryFn: () => api.progress() });
  const frontier = progressQuery.data?.modules.find((m) => !m.complete);
  const away = frontier ? frontier.lessonsTotal - frontier.lessonsCompleted : null;
  const body =
    frontier && away !== null
      ? `Finish ${frontier.title} first — you're ${away} ${away === 1 ? "lesson" : "lessons"} away.`
      : `The course builds in order for a reason — finish the module before this one first.`;

  return (
    <div className="flex-1">
      <ModuleHeader module={module} lessonCount={lessonCount} lessonsDone={0} locked />
      {/* The gate stages on an elevated sheet rather than the bare ground wash:
       * the plate paints its own paper ground, which over the texture reads as
       * a lighter rectangle floating behind the art (DESIGN-006 "art is staged,
       * not boxed"). */}
      <div className="mx-auto w-full max-w-2xl px-6 py-10">
        <Card padding="l" className="rounded-lg">
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
        </Card>
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

/** Complete-module extras: the earned BadgeMedal + the artifact built here. The
 * medal runs no ceremony — this is a revisit, the ceremony happened at earn. */
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
    <Card padding="m" className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
      <BadgeMedal
        badgeId={module.badgeId}
        name={badgeName}
        earned
        detail={badge?.awardedAt ? `Earned ${shortDate(badge.awardedAt)}` : "Earned"}
        size="l"
        className="shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="ts-eyebrow">Module complete</p>
        <p className="mt-1 max-w-md text-sm text-ink-500">
          The badge is on your shelf and the work you did here is in the Field Journal — revisit
          any lesson whenever you want.
        </p>
      </div>
      {artifact && facts && (
        <JournalCard
          to={`/journal/${artifact.artifactType}`}
          eyebrow={ARTIFACT_FACTS[artifact.artifactType].name}
          title={artifact.title || ARTIFACT_FACTS[artifact.artifactType].name}
          status={artifact.status}
          updatedAt={artifact.updatedAt}
          className="w-full sm:max-w-xs"
        />
      )}
    </Card>
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
  if (module.locked) return <LockedModule module={module} lessonCount={lessons.length} />;

  const ordered = [...lessons].sort((a, b) => a.order - b.order);
  const statuses = lessonStatuses(ordered, module.complete);
  const lessonsDone = ordered.filter((l) => l.complete).length;
  const next = module.complete ? undefined : ordered.find((l) => !l.complete);
  const minutesLeft = Math.round(
    ordered.reduce((sum, l) => sum + (l.estimatedMinutes * (100 - l.percent)) / 100, 0),
  );

  return (
    <div className="flex-1">
      <ModuleHeader
        module={module}
        lessonCount={ordered.length}
        lessonsDone={lessonsDone}
        next={next}
      />
      <div className="mx-auto w-full max-w-page px-6 py-10 lg:px-12">
        {module.complete && (
          <Reveal className="mb-10">
            <CompleteExtras module={module} />
          </Reveal>
        )}
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 className="font-display text-xl font-bold">Lessons</h2>
          {module.complete ? (
            <p className="text-sm text-ink-500">Complete — revisit any lesson freely</p>
          ) : (
            <p className="font-mono text-sm text-ink-500">
              {lessonsDone} of {ordered.length} done · {minutesLeft} min left
            </p>
          )}
        </div>
        <ol className="mt-4 flex flex-col gap-3">
          {ordered.map((lesson, i) => (
            <li key={lesson.id}>
              <Reveal index={i}>
                <LessonRow
                  order={lesson.order}
                  title={lesson.title}
                  minutes={lesson.estimatedMinutes}
                  status={statuses[i]}
                  lessonId={lesson.id}
                  animateBlaze={statuses[i] === "done"}
                  to={statuses[i] === "locked" ? undefined : `/learn/${lesson.id}`}
                />
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
