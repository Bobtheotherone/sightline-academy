/* Progress & badges (DESIGN-003 §Progress): level ring hero with real
 * levelProgress + XP total (mono), the BadgeMedal shelf (unearned embossed),
 * per-module completion bars, and the recent XP feed. Empty-XP copy is
 * DESIGN-005 verbatim.
 *
 * Also the home of the two progress-art bindings shared with the dashboard —
 * `LevelEmblem` (VISUAL_ASSETS §7.2 B-023…B-029) and `XpMark` (B-069…B-078) —
 * because /progress is the surface that presents both at full size and the
 * dashboard shows the same two things in miniature.
 */
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "../lib/api";
import { useSession } from "../lib/session";
import { BADGE_FACTS, LEVEL_THRESHOLDS, levelTitle } from "../lib/modules";
import { slotIconUrl } from "../assets/slotmap";
import { BadgeMedal } from "../components/BadgeMedal";
import { Card } from "../components/Card";
import { Button, LinkButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { shortDate } from "../components/JournalCard";
import { ProgressBar, ProgressRing } from "../components/Progress";
import { SlotArt } from "../components/SlotArt";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";
import { Tooltip } from "../components/Tooltip";

/**
 * B-023 … B-029 · level emblems, keyed by the level NUMBER the API serves
 * (`GET /progress`.level, `UserOut.level`). Slot names follow
 * `level-${n}-${slug}` from SPEC-009 §Levels, written out rather than derived
 * from LEVEL_TITLES so the seven produced slots are literal in the source —
 * the manifest stays the sole authority on which emblems exist and the asset
 * lint can see this wiring (§10.4 resolves `family-${…}` for glyph prefixes
 * only, and `level-` is not one of them). Verified equal to the manifest's
 * `level-*` keys and to the seven SPEC-009 titles in order.
 */
const LEVEL_SLOT: Record<number, string> = {
  1: "level-1-trailhead",
  2: "level-2-greenhorn",
  3: "level-3-pathfinder",
  4: "level-4-trailhand",
  5: "level-5-ridge-runner",
  6: "level-6-wayfinder",
  7: "level-7-trail-boss",
};

/**
 * The level's emblem, or nothing at all when that level has no produced art —
 * a level number outside the ladder (a future eighth rank) must leave the ring
 * exactly as it was rather than draw a gap. Decorative: it sits beside the
 * ring's own "Level 7 — Trail Boss" label and the level title heading, so the
 * name is already spoken once.
 */
export function LevelEmblem({ level, className = "" }: { level: number; className?: string }) {
  const src = slotIconUrl(LEVEL_SLOT[level]);
  if (!src) return null;
  return <img src={src} alt="" aria-hidden className={`shrink-0 ${className}`} />;
}

/**
 * B-069 … B-078 · XP event marks, keyed by `XpEvent.event` (the SPEC-009 rule
 * name). Five rules do not hyphenate straight across — the slot names are the
 * short forms the registry gives them — so the mapping is tabulated, not
 * derived. An event with no entry (a rule added server-side after this build)
 * renders no mark and the row reads exactly as it did before the marks landed.
 */
const XP_SLOT: Record<string, string> = {
  step_complete: "xp-step-complete",
  lesson_complete: "xp-lesson-complete",
  checkpoint_first_try: "xp-checkpoint-first-try",
  module_complete: "xp-module-complete",
  journal_artifact_complete: "xp-journal-artifact",
  scenario_best_path: "xp-scenario-best-path",
  lab_objectives_met: "xp-lab-objectives",
  capstone_complete: "xp-capstone",
  final_assessment_passed: "xp-final-assessment",
  tutor_first_question: "xp-tutor-first",
};

/**
 * The 16px mark leading an XP row: what kind of progress this was. Decorative —
 * the row's own label says the same thing in words. Inline rather than a flex
 * child so it rides the label's own baseline (align-middle centres it on the
 * x-height) and the row's mono "+25" stays baseline-aligned with the text.
 * An unmapped event keeps the empty 16px box so every label in the feed starts
 * on one left edge, but draws nothing in it.
 */
export function XpMark({ event }: { event: string }) {
  const src = slotIconUrl(XP_SLOT[event]);
  return (
    <span className="mr-2 inline-block size-4 align-middle" aria-hidden>
      {src && <img src={src} alt="" className="block size-4" />}
    </span>
  );
}

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
        <LevelEmblem level={level} className="size-22 sm:size-24" />
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
                  /* gap-3, not gap-4: the event mark costs the label 24px and
                   * this row already truncates at 375px. */
                  className={`flex items-baseline justify-between gap-3 py-2.5 ${
                    i > 0 ? "border-t border-line-200" : ""
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-pine-950">
                    <XpMark event={event.event} />
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
              art={<SlotArt slot="empty-progress" ratio="3 / 2" />}
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
