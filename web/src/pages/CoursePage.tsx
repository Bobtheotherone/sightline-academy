/* Course map (DESIGN-003): the trail-map motif full page — a winding contour
 * path through six module waypoints, connective segments blazing pine-300 as
 * modules complete (crawl pass-1 P2). Cards are ModuleCards with real per-user
 * progress from GET /course; the trail ends at the summit (assessment).
 */
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Award } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { BADGE_FACTS } from "../lib/modules";
import { ContourPanel } from "../components/ContourPanel";
import { Card } from "../components/Card";
import { BlazeMarker } from "../components/BlazeMarker";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { ModuleCard } from "../components/ModuleCard";
import { TrailPath } from "../components/TrailPath";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";

export default function CoursePage() {
  const query = useQuery({ queryKey: ["course"], queryFn: () => api.course() });
  const modules = query.data?.modules ?? [];
  const allComplete = modules.length > 0 && modules.every((m) => m.complete);

  // Segment i runs from waypoint i to i+1 (the last one climbs to the summit):
  // it blazes once module i is complete — the trail fills as you ride it.
  const traversed = modules.map((m) => m.complete);

  return (
    <ContourPanel variant="light" className="flex-1">
      <div className="mx-auto w-full max-w-page px-6 py-10 lg:px-12">
        <p className="ts-eyebrow">Course map</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold">The trail</h1>
        <p className="mt-2 max-w-xl text-ink-500">
          {allComplete
            ? "Every waypoint blazed. The summit — your certificate — is right there."
            : "Six waypoints between here and your certificate. Finish a module to blaze the path to the next one."}
        </p>

        {query.isLoading && (
          <SkeletonGroup label="Loading the course map" className="mt-12 flex flex-col gap-8">
            <Skeleton className="h-64 w-full lg:w-[calc(50%-72px)]" />
            <Skeleton className="h-64 w-full lg:ml-auto lg:w-[calc(50%-72px)]" />
            <Skeleton className="h-64 w-full lg:w-[calc(50%-72px)]" />
          </SkeletonGroup>
        )}

        {query.error != null && (
          <Card padding="l" className="mt-12">
            <EmptyState
              heading="Couldn't load the course map"
              body={
                query.error instanceof ApiError && query.error.status === 0
                  ? "The connection dropped before the trail arrived. Check your network and try again."
                  : "Something went wrong fetching the modules. Try again in a moment."
              }
              action={
                <Button variant="secondary" onClick={() => query.refetch()}>
                  Try again
                </Button>
              }
            />
          </Card>
        )}

        {query.data && (
          <div className="relative mt-12">
            <TrailPath traversed={traversed} />
            <ol className="relative flex flex-col gap-8 pb-4 lg:gap-0">
              {modules.map((mod, i) => {
                const previous = i > 0 ? modules[i - 1] : null;
                const badgeName = BADGE_FACTS.find((b) => b.id === mod.badgeId)?.name;
                return (
                  <li
                    key={mod.id}
                    className={`relative pl-14 lg:w-[calc(50%-72px)] lg:pl-0 ${
                      i % 2 === 0 ? "lg:self-start" : "lg:self-end"
                    } ${i > 0 ? "lg:-mt-20" : ""}`}
                  >
                    <span
                      data-trail-anchor
                      className={`absolute top-10 lg:top-1/2 lg:-translate-y-1/2 ${
                        i % 2 === 0 ? "left-1 lg:left-auto lg:-right-[100px]" : "left-7 lg:-left-[100px]"
                      }`}
                    >
                      <BlazeMarker
                        state={mod.complete ? "done" : mod.locked ? "locked" : "active"}
                        size="l"
                        label={`Module ${mod.order}: ${
                          mod.complete ? "complete" : mod.locked ? "locked" : "open"
                        }`}
                      />
                    </span>
                    <ModuleCard
                      order={mod.order}
                      title={mod.title}
                      tagline={mod.tagline}
                      minutes={mod.estimatedMinutes}
                      heroSlot={mod.heroSlot}
                      percent={mod.percent}
                      complete={mod.complete}
                      locked={mod.locked}
                      unlockHint={previous ? `Complete ${previous.title} to unlock` : undefined}
                      badgeName={badgeName}
                      to={`/course/${mod.id}`}
                    />
                  </li>
                );
              })}

              {/* The summit — where the trail has been heading all along */}
              <li className="relative mt-8 pl-14 lg:mt-4 lg:w-[calc(50%-72px)] lg:self-start lg:pl-0">
                <span
                  data-trail-anchor
                  className="absolute left-1 top-1/2 -translate-y-1/2 lg:left-auto lg:-right-[100px]"
                >
                  <BlazeMarker
                    state={allComplete ? "done" : "locked"}
                    size="l"
                    label={allComplete ? "Summit: open" : "Summit: locked"}
                  />
                </span>
                {allComplete ? (
                  <Link to="/assessment" className="block rounded-md">
                    <Card interactive padding="m" className="flex items-center gap-4">
                      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sun-400/20">
                        <Award className="size-5 text-sun-400" strokeWidth={1.5} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="ts-eyebrow">The summit</p>
                        <h2 className="mt-0.5 font-display text-lg font-bold">
                          Final assessment &amp; certificate
                        </h2>
                        <p className="text-sm text-balance text-ink-500">
                          Twenty questions, no timer, 80% to earn it.
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-pine-700">Open</span>
                    </Card>
                  </Link>
                ) : (
                  <Card padding="m" className="flex items-center gap-4 opacity-80">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full border border-line-200 bg-moss-100">
                      <Award className="size-5 text-ink-500" strokeWidth={1.5} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="ts-eyebrow">The summit</p>
                      <h2 className="mt-0.5 font-display text-lg font-bold">
                        Final assessment &amp; certificate
                      </h2>
                      <p className="text-sm text-ink-500">
                        Opens when all six modules are complete.
                      </p>
                    </div>
                  </Card>
                )}
              </li>
            </ol>
          </div>
        )}
      </div>
    </ContourPanel>
  );
}
