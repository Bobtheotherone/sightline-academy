/* Dashboard (DESIGN-003 v2 §Dashboard): a bento, not a row of voids. Greeting
 * row with the level cluster, then a 12-column grid — the hero (first-run
 * welcome, mid-course Continue, or the SPEC-006 graduate state) spanning 8 next
 * to the tall trail rail, and the Journal peek / Ask Ranger / Recent XP widgets
 * spanning 4 each with their action rows on one baseline. Cards rest on
 * shadow-1, lift on hover, and enter on the shared 60ms stagger.
 */
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Compass, Map as MapIcon, NotebookPen, Sparkles } from "lucide-react";
import { api, type ArtifactType, type CourseResponse, type ProgressResponse } from "../lib/api";
import { useSession } from "../lib/session";
import { ARTIFACT_FACTS, levelProgressFor, levelTitle } from "../lib/modules";
import { Card } from "../components/Card";
import { BlazeMarker } from "../components/BlazeMarker";
import { shortDate } from "../components/JournalCard";
import { ProgressRing } from "../components/Progress";
import { LinkButton } from "../components/Button";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";
import { CountUp, Reveal } from "../activities/motion";
import { ContinueCard, GraduateHero, WelcomeCard } from "./dashboard/heroes";
/* The level emblem (B-023…B-029) and XP event marks (B-069…B-078) are bound
 * once on /progress — the surface that shows both at full size — and reused
 * here at greeting/peek scale so the two surfaces name a level and an XP rule
 * with the same picture. */
import { LevelEmblem, XpMark } from "./ProgressPage";

/** Widget shell: every bento card is the same object — stretched, stacked, with
 * its action row pushed to the shared baseline by `mt-auto`. */
const WIDGET = "flex h-full flex-col";
/** Shared by all four widgets: shadow-1 resting, lift on hover (DESIGN-003). */
const WIDGET_CARD = { padding: "m", interactive: true, className: WIDGET } as const;
/** The action row itself: one baseline across the bento (DESIGN-003). */
const ACTION_ROW = "mt-auto pt-4";
/** Grid-item guard: below md the bento is one implicit `auto` track, so a card
 * whose content is wider than the column would size the track — and every card
 * in it — past the page. `min-w-0` pins the track to the column. */
const CELL = "min-w-0";

function Greeting({ progress }: { progress: ProgressResponse | undefined }) {
  const { user } = useSession();
  if (!user) return null;
  const ringValue = (progress?.levelProgress ?? levelProgressFor(user.xpTotal)) * 100;
  const level = progress?.level ?? user.level;
  const xpTotal = progress?.xpTotal ?? user.xpTotal;
  return (
    <div className="flex flex-wrap items-center justify-between gap-6">
      <div>
        <p className="ts-eyebrow">Basecamp</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold">
          Good to see you, {user.displayName}
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <ProgressRing
          value={ringValue}
          size={64}
          animateIn
          label={`Level ${level} — ${levelTitle(level)}`}
        >
          <span className="font-mono text-sm font-medium">{level}</span>
        </ProgressRing>
        {/* 56px, not smaller: below that the denser emblems (the Wayfinder
         * compass, the Trail Boss range) collapse into a smudge. */}
        <LevelEmblem level={level} className="size-14" />
        <div>
          <p className="font-display text-lg font-bold">{levelTitle(level)}</p>
          <CountUp value={xpTotal} suffix=" XP" className="block text-xs text-ink-500" />
        </div>
      </div>
    </div>
  );
}

/**
 * The six-blaze rail. Rows are links with a hover tint; the spine between them
 * is drawn solid where the trail is ridden and dashed where it isn't, and the
 * frontier blaze breathes (DESIGN-004 §Ambient). Each connector is positioned
 * inside its row, so it paints over the row tint but under the blaze itself.
 */
function TrailMini({ course }: { course: CourseResponse | undefined }) {
  const modules = course?.modules ?? [];
  const frontier = modules.find((m) => !m.complete && !m.locked);
  return (
    <Card {...WIDGET_CARD}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-2 whitespace-nowrap font-display text-lg font-bold">
          <MapIcon className="size-5 shrink-0 text-pine-700" strokeWidth={1.5} aria-hidden />
          The trail
        </h2>
        <Link
          to="/course"
          className="shrink-0 rounded-sm text-sm font-medium text-pine-700 hover:underline"
        >
          Map
        </Link>
      </div>
      <ol className="mt-3 flex flex-1 flex-col">
        {modules.map((mod, i) => (
          <li key={mod.id} className="relative flex-1">
            {i < modules.length - 1 && (
              <span
                aria-hidden
                className={`pointer-events-none absolute top-1/2 left-[7px] h-full w-px ${
                  mod.complete ? "bg-pine-500" : "border-l border-dashed border-line-200"
                }`}
              />
            )}
            <Link
              to={`/course/${mod.id}`}
              className="-mx-2 flex h-full items-center gap-3 rounded-sm px-2 py-2 transition-colors duration-(--ts-dur-fast) ease-(--ts-ease-out) hover:bg-moss-100"
            >
              <BlazeMarker
                state={mod.complete ? "done" : mod.locked ? "locked" : "active"}
                size="m"
                current={mod.id === frontier?.id}
              />
              {/* Wraps rather than truncates: with a mono value on every row the
               * longest title lost a word mid-way in the graduate state alone,
               * so one row of six read as a bug. */}
              <span
                className={`min-w-0 flex-1 text-sm leading-snug ${
                  mod.complete || mod.id === frontier?.id ? "font-medium" : "text-ink-500"
                }`}
              >
                {mod.title}
              </span>
              {/* One rule for the trailing slot: a percentage is always mono
               * text and the clay pill is reserved for the "Up next" label, so
               * pill vs plain encodes a label against a datum, not a state. */}
              {mod.id === frontier?.id && mod.percent === 0 ? (
                <span className="shrink-0 rounded-sm bg-clay-500/10 px-2 py-0.5 text-xs font-semibold text-clay-500">
                  Up next
                </span>
              ) : mod.id === frontier?.id ? (
                <span className="shrink-0 font-mono text-xs text-clay-500">{mod.percent}%</span>
              ) : mod.complete ? (
                <span className="shrink-0 font-mono text-xs text-pine-700">100%</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/* The first two artifacts the course hands over. Drawn as ghosts before any of
 * them exist so the zero-state card fills its list area instead of pinning a
 * link under a void (DESIGN-005 §Presentation law, DESIGN-006). */
const GHOST_ARTIFACTS: ArtifactType[] = ["risk_profile", "inspection_log"];

/* The peek's mini-cards are the object JournalCard is, at peek scale: a moss-50
 * eyebrow band over a ruled paper-0 sheet. Without the band both grounds are
 * paper-50 and the nested sheet reads as paper-on-paper with only a hairline
 * between them (DESIGN-002 §Journal). */
const MINI_CARD =
  "flex h-full flex-col overflow-hidden rounded-sm border border-line-200 bg-paper-0 transition-all duration-(--ts-dur-base) ease-(--ts-ease-out) hover:border-pine-300 hover:shadow-(--ts-shadow-1)";
const MINI_BAND = "ts-eyebrow bg-moss-50 px-4 py-1.5";

function JournalPeek() {
  const query = useQuery({ queryKey: ["journal"], queryFn: () => api.journal() });
  // Two, not one: a single mini-card leaves a hollow middle in a bento cell.
  const recent = (query.data?.artifacts ?? [])
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 2);

  return (
    <Card {...WIDGET_CARD}>
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        <NotebookPen className="size-5 text-pine-700" strokeWidth={1.5} aria-hidden />
        Field Journal
      </h2>
      {recent.length > 0 ? (
        <ul className="mt-3 flex flex-1 flex-col gap-2">
          {recent.map((artifact) => (
            <li key={artifact.artifactType} className="flex-1">
              <Link to={`/journal/${artifact.artifactType}`} className={MINI_CARD}>
                <p className={`${MINI_BAND}`}>
                  {ARTIFACT_FACTS[artifact.artifactType]?.name}
                </p>
                <div className="ts-ruled flex-1 px-4 pb-3 pt-2">
                  <p className="truncate font-display text-base font-bold leading-8">
                    {artifact.title || ARTIFACT_FACTS[artifact.artifactType]?.name}
                  </p>
                  <p className="font-mono text-xs leading-8 text-ink-500">
                    {artifact.status === "complete" ? "Complete" : "Draft"} ·{" "}
                    <span className="whitespace-nowrap">
                      updated {shortDate(artifact.updatedAt)}
                    </span>
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <p className="mt-2 text-sm text-ink-500">
            Six artifacts come out of this course. The first two are waiting in Modules 1 and 2.
          </p>
          <ul className="mt-3 flex flex-1 flex-col gap-2">
            {GHOST_ARTIFACTS.map((type) => (
              <li key={type} className="flex-1">
                <div className="flex h-full flex-col overflow-hidden rounded-sm border border-dashed border-line-200 bg-paper-0">
                  <p className={`${MINI_BAND}`}>
                    {ARTIFACT_FACTS[type].name}
                  </p>
                  <div className="ts-ruled flex-1 px-4 pb-3 pt-2">
                    <p className="font-display text-base font-bold leading-8 text-ink-500">
                      Not written yet
                    </p>
                    <p className="font-mono text-xs leading-8 text-ink-500">
                      Module {ARTIFACT_FACTS[type].moduleOrder}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className={ACTION_ROW}>
        <Link to="/journal" className="rounded-sm text-sm font-medium text-pine-700 hover:underline">
          Open your journal
        </Link>
      </div>
    </Card>
  );
}

/* The orientation starters /tutor/suggested actually serves — tapping one is a
 * way into Ranger, not a decoration. All three, not two: the chip stack has to
 * reach the action row's baseline or the button sits under a void (DESIGN-006
 * §Depth). */
const RANGER_PROMPTS = [
  "What should I check before every ride?",
  "Why can't I ride my ATV on paved roads?",
  "What gear actually matters, and why?",
];

function RangerCard() {
  return (
    <Card {...WIDGET_CARD}>
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        <Compass className="size-5 text-sky-600" strokeWidth={1.5} aria-hidden />
        Ask Ranger
      </h2>
      <p className="mt-2 text-sm text-ink-500">
        Your safety tutor knows this course inside out. Start with one of these:
      </p>
      <ul className="mt-3 flex flex-1 flex-col justify-between gap-2">
        {RANGER_PROMPTS.map((prompt) => (
          <li key={prompt}>
            <Link
              to="/tutor"
              className="block rounded-pill border border-line-200 bg-paper-0 px-4 py-2.5 text-sm text-pine-950 transition-all duration-(--ts-dur-fast) ease-(--ts-ease-out) hover:-translate-y-px hover:border-pine-300 hover:bg-moss-100"
            >
              {prompt}
            </Link>
          </li>
        ))}
      </ul>
      <div className={ACTION_ROW}>
        <LinkButton to="/tutor" variant="secondary" size="s">
          Ask your own
        </LinkButton>
      </div>
    </Card>
  );
}

/* The ledger's first three rungs, shown as ghosts while the ledger is empty:
 * the card fills to its action row rather than trailing off into white, and the
 * zero-state says what XP is actually for (DESIGN-005). The rungs each take an
 * equal share of the list area, so the slack the tallest bento card imposes
 * lands as row rhythm instead of pooling into a void above and below. */
const GHOST_XP = [
  { label: "Step complete", xp: 5 },
  { label: "Lesson complete", xp: 25 },
  { label: "Module complete", xp: 75 },
];

function RecentXp({ progress }: { progress: ProgressResponse | undefined }) {
  const events = progress?.recentXp.slice(0, 5) ?? [];
  return (
    <Card {...WIDGET_CARD}>
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        <Sparkles className="size-5 shrink-0 text-clay-500" strokeWidth={1.5} aria-hidden />
        Recent XP
      </h2>
      {events.length > 0 ? (
        <>
          <ul className="mt-3 flex flex-1 flex-col justify-between gap-2.5">
            {events.map((event, i) => (
              <li key={event.id}>
                {/* The mark rides its own clay disc, so a wrapped label stays
                 * flush instead of needing a hanging indent (crawl pass-2 P2). */}
                <Reveal index={i} className="flex items-center gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-clay-100 [&>span]:mr-0">
                    <XpMark event={event.event} />
                  </span>
                  <span className="min-w-0 flex-1 text-sm leading-snug text-pine-950">
                    {event.label}
                  </span>
                  <span className="shrink-0 font-mono text-xs font-medium text-clay-500">
                    +{event.xp}
                  </span>
                </Reveal>
              </li>
            ))}
          </ul>
          {/* The ledger's own action row, in place of the header link it used to
           * carry: without one this is the single bento card that ends in bare
           * paper while both its neighbours reach the shared baseline. */}
          <div className={ACTION_ROW}>
            <Link
              to="/progress"
              className="rounded-sm text-sm font-medium text-pine-700 hover:underline"
            >
              See your full ledger
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-ink-500">
            Your first entries land as soon as you start Module 1. Here's what they pay:
          </p>
          <ul className="mt-3 flex flex-1 flex-col gap-2.5">
            {GHOST_XP.map((row) => (
              <li key={row.label} className="flex flex-1 items-center gap-3">
                <span className="size-7 shrink-0 rounded-full border border-dashed border-clay-500/40" />
                <span className="min-w-0 flex-1 text-sm leading-snug text-ink-500">{row.label}</span>
                <span className="shrink-0 font-mono text-xs font-medium text-ink-500">
                  +{row.xp}
                </span>
              </li>
            ))}
          </ul>
          <div className={ACTION_ROW}>
            <Link
              to="/course"
              className="rounded-sm text-sm font-medium text-pine-700 hover:underline"
            >
              Go to the course
            </Link>
          </div>
        </>
      )}
    </Card>
  );
}

/* Loading mirrors the bento (DESIGN-005 §Loading): the hero's eyebrow / module
 * line / title / progress / CTA stack and each widget's icon heading, list rows
 * and action row are drawn in place, so the swap only fills in ink. Spans and
 * heights are unchanged — the reserved geometry is the CLS fix (QA-004). */
function HeroSkeleton() {
  return (
    <div className="relative flex h-96 flex-col justify-center overflow-hidden rounded-lg border border-line-200 bg-paper-0 p-8 md:col-span-12 md:p-10 lg:col-span-8">
      {/* The hero this hands off to is half art (heroes.tsx HeroPanel). Without
       * the bleed the right 52% of the widest card is dead width and the loading
       * bento is five identical pale rectangles (DESIGN-006 §Depth). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[52%] md:block"
      >
        <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
      </div>
      {/* Centred, not bottom-pinned: `mt-auto` on the CTA row parked the buttons
       * under a 130px void at the foot of the reserved 384px box. The right
       * gutter keeps the progress row's trailing pill clear of the art panel's
       * seam — same skeleton fill, so flush edges read as one fused shape. */}
      <div className="relative md:w-[48%] md:pr-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-4 h-4 w-52 max-w-full" />
        <Skeleton className="mt-3 h-8 w-4/5" />
        <div className="mt-6 flex items-center gap-3">
          <Skeleton className="h-2 min-w-0 flex-1 rounded-full" />
          <Skeleton className="h-3 w-10 shrink-0" />
        </div>
        {/* Proportional, not w-48/w-36: at 48% of the hero the two fixed widths
         * add past the stack and wrap into a column of slabs. */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Skeleton className="h-12 w-[52%]" />
          <Skeleton className="h-12 w-[38%]" />
        </div>
      </div>
    </div>
  );
}

function WidgetSkeleton({ rows, className }: { rows: number; className: string }) {
  return (
    <div className={`flex flex-col rounded-md border border-line-200 bg-paper-0 p-5 ${className}`}>
      <div className="flex items-center gap-2">
        <Skeleton className="size-5 shrink-0" />
        <Skeleton className="h-4 w-32" />
      </div>
      <ul className="mt-3 flex flex-1 flex-col gap-2">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex flex-1 gap-3">
            <Skeleton className="size-4 shrink-0 self-center rounded-full" />
            <Skeleton className="min-w-0 flex-1 self-stretch" />
          </li>
        ))}
      </ul>
      <div className={ACTION_ROW}>
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { state } = useSession();
  const progressQuery = useQuery({ queryKey: ["progress"], queryFn: () => api.progress() });
  const courseQuery = useQuery({ queryKey: ["course"], queryFn: () => api.course() });

  const progress = progressQuery.data;
  const graduate =
    progress !== undefined &&
    progress.modules.length > 0 &&
    progress.modules.every((m) => m.complete);
  const midCourse =
    !graduate && Boolean(state?.lastLessonId || (progress && progress.xpTotal > 0));

  return (
    <div className="mx-auto flex w-full max-w-page flex-col gap-8 px-6 py-10 lg:px-12">
      <Reveal>
        <Greeting progress={progress} />
      </Reveal>

      {progressQuery.isLoading ? (
        /* Skeleton spans track the loaded bento (hero ~391px, widgets ~335px on
         * desktop) so the swap doesn't shift the page (QA-004 CLS). */
        <SkeletonGroup label="Loading your basecamp" className="grid gap-6 md:grid-cols-12">
          <HeroSkeleton />
          <WidgetSkeleton rows={6} className="h-96 md:col-span-6 lg:col-span-4" />
          <WidgetSkeleton rows={2} className="h-80 md:col-span-6 lg:col-span-4" />
          <WidgetSkeleton rows={3} className="h-80 md:col-span-6 lg:col-span-4" />
          <WidgetSkeleton rows={3} className="h-80 md:col-span-6 lg:col-span-4" />
        </SkeletonGroup>
      ) : (
        /* 12 columns at lg — hero 8 + rail 4, then three 4s. One column below md,
         * in DOM order: hero, trail, journal, Ranger, XP. */
        <div className="grid gap-6 md:grid-cols-12">
          <Reveal index={1} className={`${CELL} md:col-span-12 lg:col-span-8`}>
            {graduate ? (
              <GraduateHero />
            ) : midCourse && state ? (
              <ContinueCard state={state} />
            ) : (
              <WelcomeCard />
            )}
          </Reveal>
          <Reveal index={2} className={`${CELL} md:col-span-6 lg:col-span-4`}>
            <TrailMini course={courseQuery.data} />
          </Reveal>
          <Reveal index={3} className={`${CELL} md:col-span-6 lg:col-span-4`}>
            <JournalPeek />
          </Reveal>
          <Reveal index={4} className={`${CELL} md:col-span-6 lg:col-span-4`}>
            <RangerCard />
          </Reveal>
          <Reveal index={5} className={`${CELL} md:col-span-6 lg:col-span-4`}>
            <RecentXp progress={progress} />
          </Reveal>
        </div>
      )}
    </div>
  );
}
