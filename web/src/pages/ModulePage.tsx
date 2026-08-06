import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { MODULE_FACTS } from "../lib/modules";
import { ContourPanel } from "../components/ContourPanel";
import { BlazeMarker } from "../components/BlazeMarker";
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

function LockedModule({ title, previousTitle }: { title: string; previousTitle: string }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <EmptyState
        art={<SlotArt slot="state-locked" ratio="5 / 3" />}
        heading="You haven't unlocked this yet"
        body={`${title} opens when you finish ${previousTitle} — the course builds in order for a reason.`}
        action={<LinkButton to="/course">Back to the course map</LinkButton>}
      />
    </div>
  );
}

function LessonList({ moduleId }: { moduleId: string }) {
  const query = useQuery({
    queryKey: ["module", moduleId],
    queryFn: () => api.module(moduleId),
  });

  if (query.isLoading) {
    return (
      <SkeletonGroup label="Loading lessons" className="flex flex-col gap-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </SkeletonGroup>
    );
  }

  if (query.error || !query.data) {
    return (
      <Card padding="m">
        <EmptyState
          heading="Couldn't load this module's lessons"
          body={
            query.error instanceof ApiError && query.error.status === 0
              ? "The connection dropped before the lessons arrived. Check your network and try again."
              : "Something went wrong fetching the lesson list. Try again in a moment."
          }
          action={
            <Button variant="secondary" onClick={() => query.refetch()}>
              Try again
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {query.data.lessons.map((lesson) => (
        <li key={lesson.id}>
          <Link to={`/learn/${lesson.id}`} className="block rounded-md">
            <Card interactive padding="s" className="flex items-center gap-4 px-5">
              <BlazeMarker
                state={lesson.complete ? "done" : lesson.percent > 0 ? "active" : "todo"}
                size="m"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{lesson.title}</p>
                <p className="truncate text-sm text-ink-500">{lesson.summary}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 font-mono text-xs text-ink-500">
                <Clock className="size-3.5" strokeWidth={1.5} aria-hidden />
                {lesson.estimatedMinutes} min
              </span>
            </Card>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export default function ModulePage() {
  const { moduleId = "" } = useParams();
  const facts = MODULE_FACTS.find((m) => m.id === moduleId);

  if (!facts) return <UnknownModule />;

  // First-run assumption until per-user progress loads with the course API:
  // Module 1 is open, later modules show the designed locked state.
  if (facts.order > 1) {
    const previous = MODULE_FACTS[facts.order - 2];
    return <LockedModule title={facts.title} previousTitle={previous.title} />;
  }

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
              <p className="ts-eyebrow">Module {facts.order}</p>
              <h1 className="mt-1 font-display text-3xl font-extrabold">{facts.title}</h1>
              <p className="mt-2 text-lg text-ink-500">{facts.tagline}</p>
              <p className="mt-4 max-w-2xl">{facts.mission}</p>
              <div className="mt-5 flex items-center gap-5">
                <span className="flex items-center gap-1.5 font-mono text-sm text-ink-500">
                  <Clock className="size-4" strokeWidth={1.5} aria-hidden />
                  About {facts.minutes} minutes
                </span>
                <ProgressRing value={0} size={44} strokeWidth={4} label="Module not started">
                  <span className="font-mono text-xs">0%</span>
                </ProgressRing>
              </div>
              <div className="mt-6">
                <p className="ts-eyebrow">You'll be able to</p>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {facts.objectives.map((objective) => (
                    <li key={objective} className="flex items-start gap-3">
                      <BlazeMarker state="todo" size="s" className="mt-1.5" />
                      <span className="text-sm">{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <SlotArt slot={facts.heroSlot} ratio="4 / 3" className="hidden lg:block" />
          </div>
        </div>
      </ContourPanel>
      <div className="mx-auto w-full max-w-page px-6 py-10 lg:px-12">
        <h2 className="font-display text-xl font-bold">Lessons</h2>
        <div className="mt-4">
          <LessonList moduleId={moduleId} />
        </div>
      </div>
    </div>
  );
}
