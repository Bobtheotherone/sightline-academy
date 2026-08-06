/* Progress & badges (DESIGN-003 §Progress): level ring hero with real
 * levelProgress + XP total (mono), the BadgeMedal shelf (unearned embossed),
 * per-module completion bars, and the recent XP feed. Empty-XP copy is
 * DESIGN-005 verbatim.
 */
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "../lib/api";
import { useSession } from "../lib/session";
import { BADGE_FACTS, LEVEL_THRESHOLDS, levelTitle } from "../lib/modules";
import { BadgeMedal } from "../components/BadgeMedal";
import { Card } from "../components/Card";
import { Button, LinkButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { shortDate } from "../components/JournalCard";
import { ProgressBar, ProgressRing } from "../components/Progress";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";
import { Tooltip } from "../components/Tooltip";

export default function ProgressPage() {
  const { user } = useSession();
  const query = useQuery({ queryKey: ["progress"], queryFn: () => api.progress() });
  if (!user) return null;

  if (query.error != null) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-16">
        <Card padding="l">
          <EmptyState
            heading="Couldn't load your progress"
            body={
              query.error instanceof ApiError && query.error.status === 0
                ? "The connection dropped before your miles arrived. Check your network and try again."
                : "Something went wrong fetching your progress. Try again in a moment."
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
        <SkeletonGroup label="Loading your progress" className="flex flex-col gap-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </SkeletonGroup>
      </div>
    );
  }

  const progress = query.data;
  const level = progress.level;
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? null;
  const held = new Map(progress.badges.map((b) => [b.id, b.awardedAt]));

  return (
    <div className="mx-auto w-full max-w-page flex-1 px-6 py-10 lg:px-12">
      <p className="ts-eyebrow">Progress &amp; badges</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold">Miles on the trail</h1>

      {/* Level ring hero */}
      <Card padding="l" className="mt-8 flex flex-wrap items-center gap-8">
        <ProgressRing
          value={progress.levelProgress * 100}
          size={112}
          strokeWidth={8}
          label={`Level ${level} — ${levelTitle(level)}`}
        >
          <span className="flex flex-col items-center">
            <span className="font-mono text-2xl font-medium">{level}</span>
            <span className="text-xs text-ink-500">level</span>
          </span>
        </ProgressRing>
        <div>
          <h2 className="font-display text-2xl font-bold">{levelTitle(level)}</h2>
          <p className="mt-1 font-mono text-sm text-ink-500">
            {progress.xpTotal} XP total
            {nextThreshold !== null && ` · ${nextThreshold - progress.xpTotal} to the next level`}
          </p>
          <p className="mt-2 max-w-md text-sm text-ink-500">
            XP comes from finishing steps, lessons, and modules — and from sharp first-try answers
            on checkpoints. Never from speed.
          </p>
        </div>
      </Card>

      {/* Badge shelf — unearned as embossed outlines */}
      <section className="mt-10" aria-labelledby="badges-heading">
        <h2 id="badges-heading" className="font-display text-xl font-bold">
          Badge shelf
        </h2>
        <div className="mt-4 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-5 lg:grid-cols-9">
          {BADGE_FACTS.map((badge) => {
            const awardedAt = held.get(badge.id) ?? null;
            return (
              <Tooltip key={badge.id} content={badge.trigger}>
                <div className="flex justify-center">
                  <BadgeMedal
                    badgeId={badge.id}
                    name={badge.name}
                    earned={Boolean(awardedAt)}
                    detail={awardedAt ? shortDate(awardedAt) : undefined}
                  />
                </div>
              </Tooltip>
            );
          })}
        </div>
      </section>

      {/* Per-module completion bars */}
      <section className="mt-10" aria-labelledby="modules-heading">
        <h2 id="modules-heading" className="font-display text-xl font-bold">
          Module completion
        </h2>
        <Card padding="m" className="mt-4 flex flex-col gap-4">
          {progress.modules.map((mod) => (
            <div key={mod.moduleId} className="grid items-center gap-2 sm:grid-cols-[220px_1fr_110px]">
              <span className="text-sm font-medium">{mod.title}</span>
              <ProgressBar value={mod.percent} label={`${mod.title} completion`} />
              <span className="hidden whitespace-nowrap text-right font-mono text-xs text-ink-500 sm:block">
                {mod.lessonsCompleted}/{mod.lessonsTotal} · {mod.percent}%
              </span>
            </div>
          ))}
        </Card>
      </section>

      {/* Recent XP feed */}
      <section className="mt-10" aria-labelledby="xp-heading">
        <h2 id="xp-heading" className="font-display text-xl font-bold">
          Recent XP
        </h2>
        {progress.recentXp.length > 0 ? (
          <Card padding="m" className="mt-4">
            <ul className="flex flex-col">
              {progress.recentXp.map((event, i) => (
                <li
                  key={event.id}
                  className={`flex items-baseline justify-between gap-4 py-2.5 ${
                    i > 0 ? "border-t border-line-200" : ""
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-pine-950">
                    {event.label}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-ink-500">
                    {shortDate(event.createdAt)}
                  </span>
                  <span className="w-14 shrink-0 text-right font-mono text-sm font-medium text-clay-500">
                    +{event.xp}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card padding="l" className="mt-4">
            <EmptyState
              heading="No miles on the odometer yet"
              body="Complete your first lesson to start earning XP."
              action={<LinkButton to="/course">Go to the course</LinkButton>}
            />
          </Card>
        )}
      </section>
    </div>
  );
}
