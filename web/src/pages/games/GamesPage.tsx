/* Field Practice hub (DESIGN-004 §Play): every unlocked module's challenges,
 * replayable. Sharp rounds are built from the module's own checkpoint
 * questions; hunts, sorts, matches, and scenario rides are the lesson
 * activities as pure play — no grades, no evidence, bests kept locally.
 * Locked modules keep their games locked: you practice what you've earned.
 */
import { Link } from "react-router-dom";
import { ArrowLeft, Lock, Target } from "lucide-react";
import { useSession } from "../../lib/session";
import { Card } from "../../components/Card";
import { ContourPanel } from "../../components/ContourPanel";
import { EmptyState } from "../../components/EmptyState";
import { SlotArt } from "../../components/SlotArt";
import { Skeleton, SkeletonGroup } from "../../components/Skeleton";
import { Glyph, hasGlyph } from "../../components/Glyph";
import { Reveal } from "../../activities/motion";
import { slotIconUrl } from "../../assets/slotmap";
import {
  loadBest,
  REPLAY_VERB,
  useFieldPractice,
  type Best,
  type ModuleGames,
} from "./data";

/** The right-bleed art seam on the hero band (LessonCompleteView's treatment). */
const ART_FADE = "linear-gradient(90deg, rgb(0 0 0 / 0) 0%, rgb(0 0 0 / 0.55) 24%, rgb(0 0 0) 54%)";

function BestChip({ best }: { best: Best | null }) {
  if (!best) return null;
  return (
    <span className="ml-auto shrink-0 font-mono text-xs text-ink-500">
      Best {best.score}/{best.total}
      {best.clean ? " · clean" : ""}
    </span>
  );
}

function GameCard({
  to,
  glyph,
  icon,
  art,
  title,
  sub,
  best,
}: {
  to: string;
  glyph?: string;
  icon?: React.ReactNode;
  /** Card art slot (G-series); falls back to the glyph box when unproduced. */
  art?: string;
  title: string;
  sub: string;
  best: Best | null;
}) {
  const artUrl = art ? slotIconUrl(art) : undefined;
  return (
    <li>
      <Link to={to} className="group block rounded-md">
        <Card padding="m" interactive className="flex h-full items-center gap-3.5">
          {artUrl ? (
            /* Decorative — the title names the game; hover joins the card's
             * lift with the DESIGN-004 interior-art 1.03 scale, one gesture. */
            <span className="w-24 shrink-0 overflow-hidden rounded-sm border border-line-200" aria-hidden>
              <img
                src={artUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="aspect-[3/2] w-full object-cover transition-transform duration-(--ts-dur-slow) ease-(--ts-ease-out) group-hover:scale-103"
              />
            </span>
          ) : (
            <span className="grid size-10 shrink-0 place-items-center rounded-sm border border-line-200 bg-paper-0 text-ink-500">
              {glyph && hasGlyph(glyph) ? <Glyph name={glyph} size={22} /> : icon}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-pine-950">{title}</span>
            <span className="mt-0.5 block text-xs text-ink-500">{sub}</span>
          </span>
          <BestChip best={best} />
        </Card>
      </Link>
    </li>
  );
}

function RangeChip({ moduleId }: { moduleId: string }) {
  /* R-series range card: the module's blaze-diamond emblem. Decorative — the
   * heading names the module — so it hides entirely when unproduced. */
  const url = slotIconUrl(`range-${moduleId.split("-")[0]}`);
  if (!url) return null;
  return <img src={url} alt="" loading="lazy" decoding="async" className="size-11 shrink-0" aria-hidden />;
}

function ModuleSection({ games, userId }: { games: ModuleGames; userId: string }) {
  const { module, quiz, replays } = games;
  if (module.locked) {
    return (
      <section aria-label={module.title} className="opacity-70">
        <div className="flex items-center gap-2.5">
          <Lock className="size-4 shrink-0 text-ink-500" strokeWidth={1.5} aria-hidden />
          <h2 className="font-display text-lg font-bold text-ink-500">
            Module {module.order} · {module.title}
          </h2>
        </div>
        <p className="mt-1 text-sm text-ink-500">
          Its games unlock with the module — the range only drills what you've ridden.
        </p>
      </section>
    );
  }
  if (quiz === null || replays === null) {
    return (
      <SkeletonGroup label={`Loading ${module.title} games`} className="flex flex-col gap-3">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-16 w-full" />
      </SkeletonGroup>
    );
  }
  const round = quiz.length >= 2;
  const order = module.id.startsWith("m2");
  const count = (round ? 1 : 0) + (order ? 1 : 0) + replays.length;
  if (count === 0) return null;
  return (
    <section aria-label={module.title}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <RangeChip moduleId={module.id} />
          <h2 className="font-display text-lg font-bold text-pine-950">
            Module {module.order} · {module.title}
          </h2>
        </div>
        <span className="font-mono text-xs text-ink-500">
          {count} {count === 1 ? "game" : "games"}
        </span>
      </div>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {round && (
          <GameCard
            to={`/games/${module.id}/round`}
            art="games-card-sharp-round"
            icon={<Target className="size-5" strokeWidth={1.5} aria-hidden />}
            title="Sharp round"
            sub={`${quiz.length} checkpoint questions — one shot each, no clock`}
            best={loadBest(userId, `round:${module.id}`)}
          />
        )}
        {order && (
          <GameCard
            to="/games/walkaround-order"
            art="games-card-walkaround"
            glyph="act-lab-objective"
            icon={<Target className="size-5" strokeWidth={1.5} aria-hidden />}
            title="The walkaround, from memory"
            sub="Rebuild the T-CLOC sequence, tap by tap"
            best={loadBest(userId, "order:walkaround")}
          />
        )}
        {replays.map(({ lessonId, step }) => (
          <GameCard
            key={step.id}
            to={`/games/replay/${lessonId}/${step.id}`}
            glyph={`act-${step.renderer.replace(/_/g, "-")}`}
            icon={<Target className="size-5" strokeWidth={1.5} aria-hidden />}
            title={REPLAY_VERB[step.renderer] ?? "Replay"}
            sub={`${step.title} — pure play, nothing recorded`}
            best={null}
          />
        ))}
      </ul>
    </section>
  );
}

export default function GamesPage() {
  const { user } = useSession();
  const { loading, error, games } = useFieldPractice();
  const userId = user?.id ?? "anon";
  const ready = games.filter((g) => !g.module.locked).length;
  const allLocked = !loading && !error && games.length > 0 && ready === 0;
  /* Unlocked modules whose loaded payloads yielded nothing playable — every
   * ModuleSection would render null and the page would be a header over blank
   * ground. Mirrors ModuleSection's own round/order/replays count. */
  const nothingPlayable =
    !loading &&
    !error &&
    ready > 0 &&
    games.every(
      (g) =>
        g.module.locked ||
        (g.quiz !== null &&
          g.replays !== null &&
          g.quiz.length < 2 &&
          !g.module.id.startsWith("m2") &&
          g.replays.length === 0),
    );

  return (
    <div className="ts-contour flex-1">
      <div className="mx-auto w-full max-w-page px-6 py-10 lg:px-12">
        {/* The range's own hero band: the marker-loop clearing bleeding off the
         * panel's right edge, the same composition the earned-moment banner runs. */}
        <Reveal>
          <ContourPanel variant="dark" drift className="rounded-lg">
            <header className="grid items-center gap-6 p-7 sm:grid-cols-[1.5fr_1fr] sm:gap-5 sm:py-8 sm:pr-0 sm:pl-9">
              <div className="min-w-0">
                <p className="ts-eyebrow text-pine-300!">Field practice</p>
                <h1 className="mt-1 font-display text-3xl font-extrabold text-paper-0">The range</h1>
                <p className="mt-2 max-w-xl text-sm text-paper-0/80">
                  The course's own challenges, replayable. Nothing here is graded or recorded —
                  this is where trail sense gets sharp between lessons.
                </p>
                <p className="mt-4 font-mono text-sm text-pine-300">
                  {ready} of {games.length || 6} modules on the range
                </p>
              </div>
              <div
                className="relative hidden self-stretch sm:-my-8 sm:block"
                style={{ maskImage: ART_FADE, WebkitMaskImage: ART_FADE }}
              >
                <SlotArt
                  slot="games-hero"
                  variant="dark"
                  ratio="3 / 2"
                  bleed
                  sizes="(min-width: 640px) 34vw, 100vw"
                  className="absolute inset-0 h-full w-full"
                />
              </div>
            </header>
          </ContourPanel>
        </Reveal>

        {loading && (
          <SkeletonGroup label="Loading the range" className="mt-8 flex flex-col gap-4">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </SkeletonGroup>
        )}
        {error && (
          <Card padding="l" className="mt-8 rounded-lg">
            <EmptyState
              art={<SlotArt slot="state-404" ratio="5 / 3" />}
              heading="The range didn't load"
              body="Check your connection and try again — the games are built from your course, so they need it reachable."
            />
          </Card>
        )}

        {allLocked && (
          <Card padding="l" className="mt-8 rounded-lg">
            <EmptyState
              art={<SlotArt slot="games-locked" ratio="5 / 3" />}
              heading="The range is still gated"
              body="Games unlock module by module as you ride the course — the range only drills what you've earned. Finish your first module and its challenges open here."
            />
          </Card>
        )}

        {nothingPlayable && (
          <Card padding="l" className="mt-8 rounded-lg">
            <EmptyState
              art={<SlotArt slot="games-empty" ratio="5 / 3" />}
              heading="No markers on the range yet"
              body="Your unlocked modules haven't produced any challenges to replay. Ride further into the course and the range fills in behind you."
            />
          </Card>
        )}

        {!loading && !error && !allLocked && !nothingPlayable && (
          <div className="mt-8 flex flex-col gap-8 pb-6">
            {games.map((g, i) => (
              <Reveal key={g.module.id} index={Math.min(i, 5)}>
                <ModuleSection games={g} userId={userId} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Shared back-link header for the play pages. */
export function RangeHeader({ title, sub, art }: { title: string; sub?: string; art?: string }) {
  const artUrl = art ? slotIconUrl(art) : undefined;
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Link
          to="/games"
          className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-pine-700 hover:underline"
        >
          <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />
          Field practice
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-pine-950">{title}</h1>
        {sub && <p className="mt-1 text-sm text-ink-500">{sub}</p>}
      </div>
      {artUrl && (
        <img
          src={artUrl}
          alt=""
          decoding="async"
          className="hidden aspect-[3/2] w-28 shrink-0 rounded-sm border border-line-200 object-cover sm:block"
          aria-hidden
        />
      )}
    </header>
  );
}
