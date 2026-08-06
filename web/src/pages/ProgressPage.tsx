import { useSession } from "../lib/session";
import { BADGE_FACTS, MODULE_FACTS, levelTitle } from "../lib/modules";
import { Card } from "../components/Card";
import { LinkButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { ProgressBar, ProgressRing } from "../components/Progress";
import { BlazeMarker } from "../components/BlazeMarker";
import { Tooltip } from "../components/Tooltip";

/** Early / first-run composition (DESIGN-003 §Progress). */
export default function ProgressPage() {
  const { user } = useSession();
  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-page flex-1 px-6 py-10 lg:px-12">
      <p className="ts-eyebrow">Progress &amp; badges</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold">Miles on the trail</h1>

      {/* Level ring hero */}
      <Card padding="l" className="mt-8 flex flex-wrap items-center gap-8">
        <ProgressRing
          value={0}
          size={112}
          strokeWidth={8}
          label={`Level ${user.level} — ${levelTitle(user.level)}`}
        >
          <span className="flex flex-col items-center">
            <span className="font-mono text-2xl font-medium">{user.level}</span>
            <span className="text-xs text-ink-500">level</span>
          </span>
        </ProgressRing>
        <div>
          <h2 className="font-display text-2xl font-bold">{levelTitle(user.level)}</h2>
          <p className="mt-1 font-mono text-sm text-ink-500">{user.xpTotal} XP total</p>
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
        <div className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-9">
          {BADGE_FACTS.map((badge) => (
            <Tooltip key={badge.id} content={badge.trigger}>
              <div
                className="flex flex-col items-center gap-2 rounded-md border border-line-200 bg-paper-0 p-3 text-center"
                role="img"
                aria-label={`${badge.name} — not earned yet. ${badge.trigger}.`}
              >
                <BlazeMarker state="locked" size="l" />
                <span className="text-xs leading-tight text-ink-500">{badge.name}</span>
              </div>
            </Tooltip>
          ))}
        </div>
      </section>

      {/* Per-module completion bars */}
      <section className="mt-10" aria-labelledby="modules-heading">
        <h2 id="modules-heading" className="font-display text-xl font-bold">
          Module completion
        </h2>
        <Card padding="m" className="mt-4 flex flex-col gap-4">
          {MODULE_FACTS.map((mod) => (
            <div key={mod.id} className="grid items-center gap-2 sm:grid-cols-[220px_1fr_48px]">
              <span className="text-sm font-medium">{mod.title}</span>
              <ProgressBar value={0} label={`${mod.title} completion`} />
              <span className="hidden text-right font-mono text-xs text-ink-500 sm:block">0%</span>
            </div>
          ))}
        </Card>
      </section>

      {/* Recent XP feed — DESIGN-005 empty copy, verbatim */}
      <section className="mt-10" aria-labelledby="xp-heading">
        <h2 id="xp-heading" className="font-display text-xl font-bold">
          Recent XP
        </h2>
        <Card padding="l" className="mt-4">
          <EmptyState
            heading="No miles on the odometer yet"
            body="Complete your first lesson to start earning XP."
            action={<LinkButton to="/course">Go to the course</LinkButton>}
          />
        </Card>
      </section>
    </div>
  );
}
