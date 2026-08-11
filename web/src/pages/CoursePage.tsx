/* Course map (DESIGN-003 v2): the trail-map motif full page — a header band
 * composed to both edges (title + lead left, mono trail stats right), a winding
 * contour path that draws itself through six module waypoints, the current
 * waypoint carrying its clay edge and breathing blaze, and a dark summit panel
 * bearing the certificate seal.
 */
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { useSession } from "../lib/session";
import { BADGE_FACTS } from "../lib/modules";
import { Reveal } from "../activities/motion";
import { ContourPanel } from "../components/ContourPanel";
import { Card } from "../components/Card";
import { BlazeMarker } from "../components/BlazeMarker";
import { Button, LinkButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { ModuleCard } from "../components/ModuleCard";
import { SlotArt } from "../components/SlotArt";
import { StatStrip, type Stat } from "../components/StatStrip";
import { TrailPath } from "../components/TrailPath";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";

/** The summit: the dark terminal panel carrying the cert seal, open once all six
 * blaze. It spans the band at lg — the trail ends here, so the panel composes to
 * both edges instead of stranding half of one. The action is a real button. */
function SummitPanel({ open }: { open: boolean }) {
  return (
    <ContourPanel
      variant="dark"
      glow={open ? "sun" : undefined}
      glowClassName="-top-[30%] -left-[8%] size-[70%]"
      className="flex flex-col items-start gap-5 overflow-hidden rounded-md p-5 shadow-1 sm:flex-row sm:items-center sm:gap-6 sm:p-6"
    >
      <SlotArt
        slot="cert-seal"
        variant="dark"
        ratio="1 / 1"
        bleed
        className={`size-14 shrink-0 sm:size-16 ${open ? "" : "opacity-50 grayscale"}`}
      />
      <div className="min-w-0 flex-1">
        <p className="ts-eyebrow text-pine-300!">The summit</p>
        <h2 className="mt-0.5 font-display text-lg font-bold text-paper-0">
          Final assessment &amp; certificate
        </h2>
        <p className="mt-1 text-sm text-paper-0/70">
          {open
            ? "Twenty questions, no timer, 80% to earn it."
            : "Opens when all six modules are complete."}
        </p>
      </div>
      {open ? (
        <LinkButton
          to="/assessment"
          variant="accent"
          className="shrink-0"
          iconRight={<ArrowRight className="size-4" strokeWidth={2} aria-hidden />}
        >
          Open the final assessment
        </LinkButton>
      ) : (
        <span className="flex shrink-0 items-center gap-2 text-sm font-medium text-paper-0/70">
          <BlazeMarker state="locked" size="m" />
          Locked
        </span>
      )}
    </ContourPanel>
  );
}

/** Header cluster while the map is in flight. Three value/label pairs at the
 * exact heights StatStrip resolves to (24px numeral, 6px gap, 18px label), so
 * the band composes to both edges from the first frame instead of stranding
 * half of itself and filling in on arrival. */
const STAT_BARS = [
  { value: "w-14", label: "w-28" },
  { value: "w-16", label: "w-32" },
  { value: "w-12", label: "w-20" },
];

function StatStripSkeleton() {
  return (
    <SkeletonGroup
      label="Loading trail stats"
      className="flex min-w-0 flex-wrap gap-x-10 gap-y-6 lg:ml-auto lg:shrink-0 lg:justify-end"
    >
      {STAT_BARS.map((bar) => (
        <div key={bar.label} className="flex min-w-24 flex-col-reverse">
          <Skeleton className={`mt-1.5 h-[18px] ${bar.label}`} />
          <Skeleton className={`h-6 ${bar.value}`} />
        </div>
      ))}
    </SkeletonGroup>
  );
}

/** A waypoint at its real height (DESIGN-005 §Loading: layout-shaped, reserve
 * real height). Same box model ModuleCard resolves to — 5/2 art band, then a
 * p-5 body of eyebrow + title beside the ring, tagline, meta row — so the trail
 * crossfades instead of jumping when the cards land. */
function ModuleCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-md border border-line-200 bg-paper-0 shadow-1">
      <Skeleton className="aspect-[5/2] w-full rounded-none" />
      <div className="flex flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-[18px] w-24" />
            <Skeleton className="mt-1 h-6 w-3/4" />
          </div>
          <Skeleton className="size-11 shrink-0 rounded-full" />
        </div>
        <Skeleton className="h-[21px] w-11/12" />
        <div className="flex items-center justify-between gap-3 pt-2">
          <Skeleton className="h-[21px] w-20" />
          <Skeleton className="h-[21px] w-28" />
        </div>
      </div>
    </div>
  );
}

const SKELETON_WAYPOINTS = [0, 1, 2, 3, 4, 5];

/** The whole map loading, not three grey slabs: six waypoints in their real
 * alternating positions with the summit under them, and the trail itself drawn
 * static through the same anchors it will use once the data lands. */
function TrailSkeleton() {
  return (
    <SkeletonGroup label="Loading the course map" className="relative mt-12">
      {/* Nothing traversed yet — the dashed hairline stands in for the whole
       * trail until real progress says which segments blaze. */}
      <TrailPath traversed={[]} animateDraw={false} />
      <div className="relative flex flex-col gap-8 pb-4 lg:gap-0">
        {SKELETON_WAYPOINTS.map((i) => (
          <div
            key={i}
            className={`relative pl-14 lg:w-[calc(50%-72px)] lg:pl-0 ${
              i % 2 === 0 ? "lg:self-start" : "lg:self-end"
            } ${i > 0 ? "lg:-mt-20" : ""}`}
          >
            <div
              data-trail-anchor
              className={`absolute top-10 lg:top-1/2 lg:-translate-y-1/2 ${
                i % 2 === 0 ? "left-1 lg:left-auto lg:-right-[100px]" : "left-7 lg:-left-[100px]"
              }`}
            >
              <Skeleton className="size-5 rotate-45 rounded-[3px]" />
            </div>
            <ModuleCardSkeleton />
          </div>
        ))}
        <div className="relative mt-8 pl-14 lg:mt-6 lg:self-stretch lg:pt-7 lg:pl-0">
          <div
            data-trail-anchor
            className="absolute left-1 top-1/2 -translate-y-1/2 lg:left-1/2 lg:top-0 lg:-translate-x-1/2"
          >
            <Skeleton className="size-5 rotate-45 rounded-[3px]" />
          </div>
          <Skeleton className="h-[120px] w-full rounded-md" />
        </div>
      </div>
    </SkeletonGroup>
  );
}

export default function CoursePage() {
  const { user } = useSession();
  const query = useQuery({ queryKey: ["course"], queryFn: () => api.course() });
  const modules = query.data?.modules ?? [];
  const allComplete = modules.length > 0 && modules.every((m) => m.complete);

  // Segment i runs from waypoint i to i+1 (the last one climbs to the summit):
  // it blazes once module i is complete — the trail fills as you ride it.
  const traversed = modules.map((m) => m.complete);
  // The waypoint you are standing on: first open module still unfinished.
  const currentId = modules.find((m) => !m.complete && !m.locked)?.id;

  // The header cluster reads off the course payload the page already fetched;
  // XP is the session total (the ['me'] query), not a second request.
  const stats: Stat[] = [
    {
      value: modules.filter((m) => m.complete).length,
      suffix: `/${modules.length}`,
      label: "Modules complete",
    },
    {
      value: Math.round(
        modules.reduce((sum, m) => sum + (m.estimatedMinutes * (100 - m.percent)) / 100, 0),
      ),
      label: "Minutes remaining",
    },
    { value: user?.xpTotal ?? 0, label: "XP so far" },
  ];

  return (
    <ContourPanel variant="light" className="flex-1">
      <div className="mx-auto w-full max-w-page px-6 py-10 lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-6 lg:flex-nowrap">
          <Reveal className="min-w-0 max-w-lg">
            <p className="ts-eyebrow">Course map</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold">The trail</h1>
            <p className="mt-2 text-ink-500">
              {allComplete
                ? "Every waypoint blazed. The summit — your certificate — is right there."
                : "Six waypoints between here and your certificate. Finish a module to blaze the path to the next one."}
            </p>
          </Reveal>
          {query.isLoading && <StatStripSkeleton />}
          {query.data && (
            <Reveal index={1} className="min-w-0 lg:ml-auto lg:shrink-0">
              <StatStrip items={stats} className="lg:justify-end" />
            </Reveal>
          )}
        </div>

        {query.isLoading && <TrailSkeleton />}

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
                    {/* The anchor sits outside Reveal: TrailPath measures through
                     * these, and a moving anchor would draw a moving path. */}
                    <span
                      data-trail-anchor
                      className={`absolute top-10 lg:top-1/2 lg:-translate-y-1/2 ${
                        i % 2 === 0 ? "left-1 lg:left-auto lg:-right-[100px]" : "left-7 lg:-left-[100px]"
                      }`}
                    >
                      <BlazeMarker
                        state={mod.complete ? "done" : mod.locked ? "locked" : "active"}
                        size="l"
                        current={mod.id === currentId}
                        label={`Module ${mod.order}: ${
                          mod.complete ? "complete" : mod.locked ? "locked" : "open"
                        }`}
                      />
                    </span>
                    <Reveal index={i}>
                      <ModuleCard
                        order={mod.order}
                        title={mod.title}
                        tagline={mod.tagline}
                        minutes={mod.estimatedMinutes}
                        heroSlot={mod.heroSlot}
                        percent={mod.percent}
                        complete={mod.complete}
                        locked={mod.locked}
                        current={mod.id === currentId}
                        unlockHint={previous ? `Complete ${previous.title} to unlock` : undefined}
                        badgeName={badgeName}
                        to={`/course/${mod.id}`}
                      />
                    </Reveal>
                  </li>
                );
              })}

              {/* The summit — where the trail has been heading all along. It
               * spans the band, so its waypoint caps the trail from above
               * instead of hanging off an edge that no longer exists. */}
              <li className="relative mt-8 pl-14 lg:mt-6 lg:self-stretch lg:pt-7 lg:pl-0">
                <span
                  data-trail-anchor
                  className="absolute left-1 top-1/2 -translate-y-1/2 lg:left-1/2 lg:top-0 lg:-translate-x-1/2"
                >
                  <BlazeMarker
                    state={allComplete ? "done" : "locked"}
                    size="l"
                    label={allComplete ? "Summit: open" : "Summit: locked"}
                  />
                </span>
                <Reveal index={modules.length}>
                  <SummitPanel open={allComplete} />
                </Reveal>
              </li>
            </ol>
          </div>
        )}
      </div>
    </ContourPanel>
  );
}
