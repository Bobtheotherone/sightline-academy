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
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "../lib/api";
import { useSession } from "../lib/session";
import { BADGE_FACTS, LEVEL_THRESHOLDS, LEVEL_TITLES, levelTitle } from "../lib/modules";
import { slotIconUrl } from "../assets/slotmap";
import { CountUp, Reveal, useReducedMotion } from "../activities/motion";
import { BadgeMedal } from "../components/BadgeMedal";
import { BlazeMarker } from "../components/BlazeMarker";
import { Card } from "../components/Card";
import { Button, LinkButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { shortDate } from "../components/JournalCard";
import { ProgressBar, ProgressRing } from "../components/Progress";
import { SlotArt } from "../components/SlotArt";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";
import { StatStrip } from "../components/StatStrip";
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

/**
 * One module's completion row. The bar mounts on its own 60ms beat so the shelf
 * of bars fills in reading order rather than all at once (DESIGN-004 §Progress
 * draws) — the track's height is reserved either way, so the stagger costs no
 * layout shift. Reduced motion mounts every bar at its final width immediately.
 */
function ModuleBar({ percent, label, delay }: { percent: number; label: string; delay: number }) {
  const reduced = useReducedMotion();
  const [armed, setArmed] = useState(reduced);
  useEffect(() => {
    if (reduced) {
      setArmed(true);
      return;
    }
    const t = window.setTimeout(() => setArmed(true), delay);
    return () => window.clearTimeout(t);
  }, [reduced, delay]);
  return (
    <div className="min-h-1.5">
      {armed && <ProgressBar value={percent} label={label} animateIn={!reduced} />}
    </div>
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
  const earnedCount = progress.badges.filter((b) => b.awardedAt).length;
  const modulesComplete = progress.modules.filter((m) => m.complete).length;
  const levelPercent = Math.round(progress.levelProgress * 100);

  return (
    <div className="mx-auto w-full max-w-page flex-1 px-6 py-10 lg:px-12">
      {/* Title band composes to its edges: identity left, the trophy-room
       * tallies right (DESIGN-003 v2 §standing rule 1). */}
      <Reveal index={0} className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div>
          <p className="ts-eyebrow">Progress &amp; badges</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold">Miles on the trail</h1>
        </div>
        <StatStrip
          items={[
            { value: earnedCount, label: "Badges earned", suffix: `/${BADGE_FACTS.length}` },
            {
              value: modulesComplete,
              label: "Modules complete",
              suffix: `/${progress.modules.length}`,
            },
          ]}
        />
      </Reveal>

      {/* Level ring hero: ring + level + XP total left, the climb to the next
       * rank right — both halves carry weight so the band has no dead middle. */}
      <Reveal index={1}>
        <Card padding="l" className="mt-8 rounded-lg">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-6">
              <ProgressRing
                value={progress.levelProgress * 100}
                size={112}
                strokeWidth={8}
                animateIn
                label={`Level ${level} — ${levelTitle(level)}`}
              >
                <span className="flex flex-col items-center">
                  <span className="font-mono text-2xl font-medium">{level}</span>
                  <span className="text-xs text-ink-500">level</span>
                </span>
              </ProgressRing>
              <LevelEmblem level={level} className="size-20 sm:size-24" />
              <div className="min-w-0">
                <p className="ts-eyebrow">Level {level}</p>
                <h2 className="mt-1 font-display text-2xl font-bold">{levelTitle(level)}</h2>
                <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
                  <CountUp
                    value={progress.xpTotal}
                    format={(n) => n.toLocaleString()}
                    className="text-3xl leading-none font-medium text-pine-950"
                  />
                  <span className="ts-eyebrow">XP total</span>
                </p>
              </div>
            </div>

            <div className="w-full shrink-0 lg:max-w-xs">
              {nextThreshold !== null ? (
                <>
                  <ProgressBar
                    value={progress.levelProgress * 100}
                    animateIn
                    label="Next level"
                    valueLabel={<CountUp value={levelPercent} suffix="%" delay={180} />}
                  />
                  <p className="mt-2.5 text-sm text-ink-500">
                    <span className="font-mono font-medium text-pine-950">
                      {nextThreshold - progress.xpTotal} XP
                    </span>{" "}
                    to {levelTitle(level + 1)}
                  </p>
                </>
              ) : (
                <>
                  <p className="ts-eyebrow">Next level</p>
                  <p className="mt-1.5 text-sm text-ink-500">
                    Top of the ladder — Trail Boss. Everything from here is riding for its own
                    sake.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* The closing strip runs the full card width — explainer left, the
           * seven-rank ladder right, so the hairline never dies mid-card. */}
          <div className="mt-6 flex flex-col gap-6 border-t border-line-200 pt-5 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
            <p className="max-w-2xl text-sm text-ink-500">
              XP comes from finishing steps, lessons, and modules — and from sharp first-try answers
              on checkpoints. Never from speed.
            </p>
            <div className="shrink-0">
              <div className="flex items-baseline justify-between gap-6">
                <p className="ts-eyebrow">Rank ladder</p>
                <p className="font-mono text-xs text-ink-500">
                  {level} of {LEVEL_TITLES.length}
                </p>
              </div>
              <ol className="mt-2.5 flex items-center gap-2">
                {LEVEL_TITLES.map((title, i) => (
                  <li key={title} className="flex items-center gap-2">
                    <BlazeMarker
                      state={i + 1 < level ? "done" : i + 1 === level ? "active" : "todo"}
                      size={i + 1 === level ? "m" : "s"}
                      current={i + 1 === level}
                      label={`Level ${i + 1} — ${title}${i + 1 === level ? ", you are here" : ""}`}
                    />
                    {i < LEVEL_TITLES.length - 1 && (
                      <span className="h-px w-4 bg-line-200" aria-hidden />
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Card>
      </Reveal>

      {/* Badge shelf — earned in full color on their own plinths, unearned as
       * embossed outlines. No ceremony here: this is the revisit surface. */}
      <section className="mt-10" aria-labelledby="badges-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="badges-heading" className="font-display text-xl font-bold">
            Badge shelf
          </h2>
          <p className="font-mono text-xs text-ink-500">
            {earnedCount} of {BADGE_FACTS.length} earned
          </p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
          {BADGE_FACTS.map((badge, i) => {
            const awardedAt = held.get(badge.id) ?? null;
            return (
              <Reveal key={badge.id} index={i} className="h-full">
                <Tooltip content={badge.trigger}>
                  {/* The medal stretches to the row height and pushes its
                   * caption to the foot, so every tile's last line — the earn
                   * date — shares one baseline across the shelf. */}
                  <Card interactive padding="s" className="flex h-full justify-center">
                    <BadgeMedal
                      className="justify-between"
                      badgeId={badge.id}
                      name={badge.name}
                      earned={Boolean(awardedAt)}
                      detail={awardedAt ? shortDate(awardedAt) : undefined}
                    />
                  </Card>
                </Tooltip>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Per-module completion bars — each fills from zero on its own beat with
       * its percentage counting alongside. */}
      <section className="mt-10" aria-labelledby="modules-heading">
        <h2 id="modules-heading" className="font-display text-xl font-bold">
          Module completion
        </h2>
        <Card padding="m" className="mt-4 flex flex-col gap-4">
          {progress.modules.map((mod, i) => (
            <Reveal
              key={mod.moduleId}
              index={i}
              className="grid items-center gap-2 sm:grid-cols-[220px_1fr_150px]"
            >
              <span className="text-sm font-medium">{mod.title}</span>
              <ModuleBar
                percent={mod.percent}
                label={`${mod.title} completion`}
                delay={i * 60}
              />
              <span className="hidden items-baseline justify-end gap-2 whitespace-nowrap text-right sm:flex">
                <span className="font-mono text-xs text-ink-500">
                  {mod.lessonsCompleted}/{mod.lessonsTotal} lessons
                </span>
                <CountUp
                  value={mod.percent}
                  suffix="%"
                  delay={i * 60}
                  className="text-sm font-medium text-pine-950"
                />
              </span>
            </Reveal>
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
                  className={i > 0 ? "border-t border-line-200" : ""}
                >
                  {/* gap-3, not gap-4: the event mark costs the label 24px and
                   * this row already truncates at 375px. */}
                  <Reveal
                    index={Math.min(i, 8)}
                    className="flex items-baseline justify-between gap-3 py-2.5"
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
                  </Reveal>
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
