import { Link } from "react-router-dom";
import { Compass, NotebookPen, Sparkles } from "lucide-react";
import { useSession } from "../lib/session";
import { MODULE_FACTS, levelTitle } from "../lib/modules";
import { Card } from "../components/Card";
import { ContourPanel } from "../components/ContourPanel";
import { BlazeMarker } from "../components/BlazeMarker";
import { ProgressRing } from "../components/Progress";
import { LinkButton } from "../components/Button";
import { SlotArt } from "../components/SlotArt";

function Greeting() {
  const { user } = useSession();
  if (!user) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-6">
      <div>
        <p className="ts-eyebrow">Basecamp</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold">
          Good to see you, {user.displayName}
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <ProgressRing value={0} size={64} label={`Level ${user.level} — ${levelTitle(user.level)}`}>
          <span className="font-mono text-sm font-medium">{user.level}</span>
        </ProgressRing>
        <div>
          <p className="font-display text-lg font-bold">{levelTitle(user.level)}</p>
          <p className="font-mono text-xs text-ink-500">{user.xpTotal} XP</p>
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

function TrailMini() {
  return (
    <Card padding="m">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-bold">The trail ahead</h2>
        <Link to="/course" className="rounded-sm text-sm font-medium text-pine-700 hover:underline">
          Open the course map
        </Link>
      </div>
      <ol className="mt-4 flex flex-col gap-3">
        {MODULE_FACTS.map((mod, i) => (
          <li key={mod.id} className="flex items-center gap-3">
            <BlazeMarker state={i === 0 ? "active" : "locked"} size="m" />
            <span className={`text-sm ${i === 0 ? "font-medium" : "text-ink-500"}`}>
              {mod.title}
            </span>
            {i === 0 && (
              <span className="ml-auto rounded-sm bg-clay-500/10 px-2 py-0.5 text-xs font-semibold text-clay-500">
                Up next
              </span>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}

function JournalPeek() {
  return (
    <Card padding="m" className="flex flex-col">
      <h2 className="font-display text-lg font-bold">Field Journal</h2>
      <div className="mt-2 flex flex-1 flex-col items-start justify-between gap-3">
        <p className="text-sm text-ink-500">
          As you ride through the course you'll build six artifacts — a risk profile, a gear card,
          an inspection log, and more. Your first one comes out of Module 1.
        </p>
        <Link
          to="/journal"
          className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-pine-700 hover:underline"
        >
          <NotebookPen className="size-4" strokeWidth={1.5} aria-hidden />
          Open your journal
        </Link>
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
      <div className="mt-2 flex flex-1 flex-col items-start justify-between gap-3">
        <p className="text-sm text-ink-500">
          Try one to see how it works:{" "}
          <span className="font-medium text-pine-950">
            "What should I check before every ride?"
          </span>
        </p>
        <LinkButton to="/tutor" variant="secondary" size="s">
          Ask Ranger
        </LinkButton>
      </div>
    </Card>
  );
}

function RecentXp() {
  return (
    <Card padding="m" className="flex flex-col">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        <Sparkles className="size-5 text-clay-500" strokeWidth={1.5} aria-hidden />
        Recent XP
      </h2>
      <div className="mt-2 flex flex-1 flex-col items-start justify-between gap-3">
        <p className="text-sm text-ink-500">
          Every step, lesson, and sharp first-try answer earns XP. Your first entries land as soon
          as you start Module 1.
        </p>
        <Link to="/progress" className="rounded-sm text-sm font-medium text-pine-700 hover:underline">
          See progress &amp; badges
        </Link>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-page flex-col gap-8 px-6 py-10 lg:px-12">
      <Greeting />
      <WelcomeCard />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <TrailMini />
        <JournalPeek />
        <RangerCard />
        <RecentXp />
      </div>
    </div>
  );
}
