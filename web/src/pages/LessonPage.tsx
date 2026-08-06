import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { Button } from "../components/Button";
import { LinkButton } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { SlotArt } from "../components/SlotArt";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";

/**
 * Lesson player frame (DESIGN-003): StepRail | Stage | sticky footer. The
 * activity renderers land in Wave 1–2 (SPEC-007); this shell owns the layout,
 * loading skeleton (rail + stage per DESIGN-005), and the designed failure
 * state, and never shows a mute dead Continue button.
 */
export default function LessonPage() {
  const { lessonId = "" } = useParams();

  const query = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => api.lesson(lessonId),
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto grid w-full max-w-page flex-1 gap-8 px-6 py-8 lg:grid-cols-[240px_1fr] lg:px-12">
        {/* Step rail (desktop) / top bar (mobile) */}
        <aside aria-label="Lesson progress" className="lg:border-r lg:border-line-200 lg:pr-6">
          {query.isLoading ? (
            <SkeletonGroup label="Loading lesson outline" className="flex gap-3 lg:flex-col">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="hidden h-4 w-32 lg:block" />
              <Skeleton className="hidden h-4 w-28 lg:block" />
              <Skeleton className="hidden h-4 w-32 lg:block" />
              <Skeleton className="h-5 w-24 lg:mt-4" />
              <Skeleton className="hidden h-4 w-28 lg:block" />
            </SkeletonGroup>
          ) : query.data ? (
            <div>
              <Link
                to={`/course/${query.data.lesson.moduleId}`}
                className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-pine-700 hover:underline"
              >
                <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />
                Module
              </Link>
              <h1 className="mt-3 font-display text-lg font-bold">{query.data.lesson.title}</h1>
              <p className="mt-1 text-sm text-ink-500">
                {query.data.steps.length} steps · {query.data.lesson.estimatedMinutes} min
              </p>
            </div>
          ) : (
            <Link
              to="/course"
              className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-pine-700 hover:underline"
            >
              <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />
              Course map
            </Link>
          )}
        </aside>

        {/* Stage */}
        <div className="mx-auto w-full max-w-lesson">
          {query.isLoading && (
            <SkeletonGroup label="Loading this step" className="flex flex-col gap-4">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-24 w-full" />
            </SkeletonGroup>
          )}
          {query.error != null && (
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
          )}
          {query.data && (
            <Card padding="l">
              <p className="ts-eyebrow">Step 1 of {query.data.steps.length}</p>
              <h2 className="mt-2 font-display text-2xl font-bold">
                {query.data.steps[0]?.title ?? query.data.lesson.title}
              </h2>
              <p className="mt-3 text-ink-500">
                The interactive player for this step arrives with the activity renderers — the
                lesson content is loaded and waiting.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Sticky footer bar — Continue is never a mute dead button (SPEC-006). */}
      <footer className="sticky bottom-16 border-t border-line-200 bg-paper-0 lg:bottom-0">
        <div className="mx-auto flex w-full max-w-page items-center justify-between gap-4 px-6 py-3 lg:px-12">
          <Button variant="ghost" disabled iconLeft={<ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />}>
            Back
          </Button>
          <p className="hidden text-sm text-ink-500 sm:block" aria-live="polite">
            {query.isLoading
              ? "Waiting for the lesson to load"
              : query.data
                ? "Complete this step to continue"
                : "Reload the lesson to continue"}
          </p>
          <Button
            disabled
            iconRight={<ArrowRight className="size-4" strokeWidth={1.5} aria-hidden />}
          >
            Continue
          </Button>
        </div>
      </footer>
    </div>
  );
}
