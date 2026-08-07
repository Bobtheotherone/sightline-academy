/* Dashboard (DESIGN-003 §Dashboard): greeting + level ring, then the variant —
 * first-run welcome (as shipped in Wave 0), mid-course Continue card deep-
 * linking to the learner_state lesson+step, or the SPEC-006 graduate state
 * (certificate card, Ride Plan card, keep-exploring-with-Ranger prompt).
 * Secondary rank: course-map mini, Journal peek, recent XP, Ask Ranger.
 */
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Compass, Map as MapIcon, NotebookPen, Sparkles } from "lucide-react";
import { api, type CourseResponse, type ProgressResponse } from "../lib/api";
import { useSession } from "../lib/session";
import { ARTIFACT_FACTS, levelTitle } from "../lib/modules";
import { Card } from "../components/Card";
import { ContourPanel } from "../components/ContourPanel";
import { BlazeMarker } from "../components/BlazeMarker";
import { shortDate } from "../components/JournalCard";
import { ProgressRing } from "../components/Progress";
import { LinkButton } from "../components/Button";
import { SlotArt } from "../components/SlotArt";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";
import { ContinueCard, GraduateHero } from "./dashboard/heroes";
/* The level emblem (B-023…B-029) and XP event marks (B-069…B-078) are bound
 * once on /progress — the surface that shows both at full size — and reused
 * here at greeting/peek scale so the two surfaces name a level and an XP rule
 * with the same picture. */
import { LevelEmblem, XpMark } from "./ProgressPage";

function Greeting({ progress }: { progress: ProgressResponse | undefined }) {
  const { user } = useSession();
  if (!user) return null;
  const ringValue = (progress?.levelProgress ?? 0) * 100;
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
        <ProgressRing value={ringValue} size={64} label={`Level ${level} — ${levelTitle(level)}`}>
          <span className="font-mono text-sm font-medium">{level}</span>
        </ProgressRing>
        <LevelEmblem level={level} className="size-11" />
        <div>
          <p className="font-display text-lg font-bold">{levelTitle(level)}</p>
          <p className="font-mono text-xs text-ink-500">{xpTotal} XP</p>
        </div>
      </div>
    </div>
  );
}

/** First-run hero: welcome card introducing the course + Ranger (DESIGN-003). */
function WelcomeCard() {
  return (
    <ContourPanel variant="dark" className="overflow-hidden rounded-lg">
      <div className="grid items-center gap-8 p-8 md:grid-cols-[1.2fr_1fr] md:p-10">
        <div>
          <p className="ts-eyebrow text-pine-300!">Start here</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-paper-0">
            Module 1 · The Rider's Mindset
          </h2>
          <p className="mt-3 max-w-lg text-paper-0/80">
            Most crashes are decided before the wheels turn. In about 45 minutes you'll see why —
            and build the risk profile the rest of the course leans on. Ranger, your safety tutor,
            rides along the whole way.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <LinkButton to="/course/m1-riders-mindset" variant="accent" size="l">
              Start Module 1
            </LinkButton>
            <LinkButton to="/tutor" variant="ghost" size="l" className="text-paper-0! hover:bg-paper-0/10!">
              Meet Ranger first
            </LinkButton>
          </div>
        </div>
        <SlotArt slot="hero-m1-mindset" variant="dark" ratio="4 / 3" className="hidden md:block" />
      </div>
    </ContourPanel>
  );
}

function TrailMini({ course }: { course: CourseResponse | undefined }) {
  const frontier = course?.modules.find((m) => !m.complete && !m.locked);
  return (
    <Card padding="m">
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
      <ol className="mt-4 flex flex-col gap-3">
        {(course?.modules ?? []).map((mod) => (
          <li key={mod.id} className="flex items-center gap-3">
            <BlazeMarker
              state={mod.complete ? "done" : mod.locked ? "locked" : "active"}
              size="m"
            />
            <span
              className={`min-w-0 truncate text-sm ${
                mod.complete || mod.id === frontier?.id ? "font-medium" : "text-ink-500"
              }`}
            >
              {mod.title}
            </span>
            {mod.id === frontier?.id ? (
              <span className="ml-auto shrink-0 rounded-sm bg-clay-500/10 px-2 py-0.5 text-xs font-semibold text-clay-500">
                {mod.percent > 0 ? `${mod.percent}%` : "Up next"}
              </span>
            ) : mod.complete ? (
              <span className="ml-auto shrink-0 font-mono text-xs text-pine-700">100%</span>
            ) : null}
          </li>
        ))}
      </ol>
    </Card>
  );
}

function JournalPeek() {
  const query = useQuery({ queryKey: ["journal"], queryFn: () => api.journal() });
  const latest = query.data?.artifacts
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  return (
    <Card padding="m" className="flex flex-col">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        <NotebookPen className="size-5 text-pine-700" strokeWidth={1.5} aria-hidden />
        Field Journal
      </h2>
      <div className="mt-3 flex flex-1 flex-col justify-between gap-3">
        {latest ? (
          <>
            <Link to={`/journal/${latest.artifactType}`} className="block rounded-sm">
              <div className="ts-ruled rounded-sm border border-line-200 px-4 py-3 transition-all duration-150 hover:border-pine-300">
                <p className="ts-eyebrow">{ARTIFACT_FACTS[latest.artifactType]?.name}</p>
                <p className="mt-0.5 truncate font-display text-base font-bold leading-8">
                  {latest.title || ARTIFACT_FACTS[latest.artifactType]?.name}
                </p>
                <p className="font-mono text-xs leading-8 text-ink-500">
                  {latest.status === "complete" ? "Complete" : "Draft"} ·{" "}
                  <span className="whitespace-nowrap">
                    updated {shortDate(latest.updatedAt)}
                  </span>
                </p>
              </div>
            </Link>
            <Link
              to="/journal"
              className="rounded-sm text-sm font-medium text-pine-700 hover:underline"
            >
              Open your journal
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-500">
              As you ride through the course you'll build six artifacts — a risk profile, a gear
              card, an inspection log, and more. Your first one comes out of Module 1.
            </p>
            <Link
              to="/journal"
              className="rounded-sm text-sm font-medium text-pine-700 hover:underline"
            >
              Open your journal
            </Link>
          </>
        )}
      </div>
    </Card>
  );
}

function RangerCard() {
  return (
    <Card padding="m" className="flex flex-col">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        <Compass className="size-5 text-sky-600" strokeWidth={1.5} aria-hidden />
        Ask Ranger
      </h2>
      <div className="mt-3 flex flex-1 flex-col justify-between gap-3">
        <p className="text-sm text-ink-500">
          Try one to see how it works:{" "}
          <span className="font-medium text-pine-950">
            "What should I check before every ride?"
          </span>
        </p>
        <LinkButton to="/tutor" variant="secondary" size="s" className="self-start">
          Ask Ranger
        </LinkButton>
      </div>
    </Card>
  );
}

function RecentXp({ progress }: { progress: ProgressResponse | undefined }) {
  const events = progress?.recentXp.slice(0, 5) ?? [];
  return (
    <Card padding="m" className="flex flex-col">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-2 whitespace-nowrap font-display text-lg font-bold">
          <Sparkles className="size-5 shrink-0 text-clay-500" strokeWidth={1.5} aria-hidden />
          Recent XP
        </h2>
        <Link
          to="/progress"
          className="shrink-0 rounded-sm text-sm font-medium text-pine-700 hover:underline"
        >
          See all
        </Link>
      </div>
      <div className="mt-3 flex flex-1 flex-col justify-between gap-3">
        {events.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {events.map((event) => (
              <li key={event.id} className="flex items-baseline justify-between gap-3">
                {/* Full reflow, never a mid-word ellipsis (crawl pass-2 P2).
                 * The event mark leads line one; pl-6/-indent-6 hangs it in the
                 * margin so wrapped lines stay flush with the label above. */}
                <span className="min-w-0 pl-6 -indent-6 text-sm leading-snug text-pine-950">
                  <XpMark event={event.event} />
                  {event.label}
                </span>
                <span className="shrink-0 font-mono text-xs font-medium text-clay-500">
                  +{event.xp}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-500">
            Every step, lesson, and sharp first-try answer earns XP. Your first entries land as
            soon as you start Module 1.
          </p>
        )}
      </div>
    </Card>
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
      <Greeting progress={progress} />

      {progressQuery.isLoading ? (
        /* Skeleton heights track the loaded layout (hero ~391px, cards ~335px on
         * desktop) so the swap doesn't shift the page (QA-004 CLS). */
        <SkeletonGroup label="Loading your basecamp" className="flex flex-col gap-8">
          <Skeleton className="h-96 w-full rounded-lg" />
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </SkeletonGroup>
      ) : (
        <>
          {graduate ? (
            <GraduateHero />
          ) : midCourse && state ? (
            <ContinueCard state={state} />
          ) : (
            <WelcomeCard />
          )}
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <TrailMini course={courseQuery.data} />
            <JournalPeek />
            <RangerCard />
            <RecentXp progress={progress} />
          </div>
        </>
      )}
    </div>
  );
}
