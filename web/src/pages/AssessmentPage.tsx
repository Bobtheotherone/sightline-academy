/* Final assessment (DESIGN-003 §Assessment, SPEC-006 §Hierarchy & unlocking).
 * Locked until all six modules are complete (the locked state names what
 * remains); then the intro — four mono stat tiles (20 questions · 80% bar · no
 * timer · attempts) over a dark CTA band with the hero-assessment art bleeding
 * out of its edge — then the one-question-at-a-time flow in pages/assessment/.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Award,
  Gauge,
  ListChecks,
  RotateCcw,
  TimerOff,
  type LucideIcon,
} from "lucide-react";
import { api, ApiError, type ModuleProgressRollup } from "../lib/api";
import { MODULE_FACTS } from "../lib/modules";
import { Card } from "../components/Card";
import { ContourPanel } from "../components/ContourPanel";
import { Button, LinkButton } from "../components/Button";
import { BlazeMarker } from "../components/BlazeMarker";
import { SlotArt } from "../components/SlotArt";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";
import { CountUp, Reveal } from "../activities/motion";
import AttemptFlow from "./assessment/AttemptFlow";

interface StatFact {
  icon: LucideIcon;
  /** null renders the unlimited glyph instead of a counting numeral. */
  value: number | null;
  suffix?: string;
  label: string;
  body: string;
}

const STATS: StatFact[] = [
  {
    icon: ListChecks,
    value: 20,
    label: "Questions",
    body: "Drawn from all six modules — judgment, machine, gear, terrain, environment, roads.",
  },
  {
    icon: Gauge,
    value: 80,
    suffix: "%",
    label: "To pass",
    body: "Miss the bar and you'll get a review list of the modules to ride back through.",
  },
  {
    icon: TimerOff,
    value: 0,
    label: "Minutes on the clock",
    body: "No timer at all. Speed has nothing to do with judgment — take the time you need.",
  },
  {
    icon: RotateCcw,
    value: null,
    label: "Attempts left",
    body: "Retakes stay open. Feedback lands once you submit — never while you answer.",
  },
];

function Header({ complete, total }: { complete: number; total: number }) {
  return (
    <ContourPanel variant="light" className="border-b border-line-200">
      <div className="mx-auto flex w-full max-w-page flex-wrap items-end justify-between gap-6 px-6 py-10 lg:px-12">
        <div>
          <p className="ts-eyebrow">Final assessment</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold">The last climb</h1>
          <p className="mt-2 max-w-xl text-ink-500">
            Twenty questions across the whole course. Pass it and your certificate is issued on the
            spot.
          </p>
        </div>
        {total > 0 && (
          <div className="flex items-center gap-2.5">
            <BlazeMarker state={complete === total ? "done" : "active"} size="m" />
            <p className="font-mono text-sm text-ink-500">
              <CountUp value={complete} className="text-pine-950" />/{total} modules complete
            </p>
          </div>
        )}
      </div>
    </ContourPanel>
  );
}

/** The intro facts as stat tiles: numeral first, then what it means (DESIGN-003). */
function StatTiles() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {STATS.map(({ icon: Icon, value, suffix, label, body }, i) => (
        <Reveal key={label} index={i} className="h-full">
          <Card padding="m" className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-3">
              {value === null ? (
                <span className="font-mono text-3xl leading-none font-medium text-pine-950">
                  <span aria-hidden>∞</span>
                  <span className="sr-only">Unlimited</span>
                </span>
              ) : (
                <CountUp
                  value={value}
                  suffix={suffix}
                  delay={i * 60}
                  className="text-3xl leading-none font-medium text-pine-950"
                />
              )}
              <Icon className="size-5 shrink-0 text-pine-700" strokeWidth={1.5} aria-hidden />
            </div>
            <h2 className="ts-eyebrow mt-3">{label}</h2>
            <p className="mt-1.5 text-sm text-ink-500">{body}</p>
          </Card>
        </Reveal>
      ))}
    </div>
  );
}

/** Locked composition — the same dark CTA band the unlocked intro runs, art
 * scrimmed and desaturated the way ModuleCard treats a locked waypoint, with
 * the unlock route in place of the start button; the six-module checklist then
 * composes to both edges underneath it (DESIGN-003, DESIGN-006 §Depth). */
function LockedState({ modules }: { modules: ModuleProgressRollup[] }) {
  const remaining = modules.filter((m) => !m.complete);
  const frontier = remaining[0];
  const facts = frontier ? MODULE_FACTS.find((m) => m.id === frontier.moduleId) : undefined;
  const lessonsLeft = modules.reduce((n, m) => n + (m.lessonsTotal - m.lessonsCompleted), 0);
  return (
    <>
      <Reveal index={4} className="mt-8">
        <ContourPanel
          variant="dark"
          drift
          glow="clay"
          glowClassName="-right-[6%] -bottom-[20%] size-[70%]"
          className="overflow-hidden rounded-lg"
        >
          <div className="grid items-center gap-8 p-8 md:grid-cols-[1.35fr_1fr] md:gap-10 md:py-10 md:pr-0 md:pl-10">
            <div>
              <p className="ts-eyebrow text-clay-400!">
                {remaining.length === 1
                  ? "One module to go"
                  : `${remaining.length} modules to go`}
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold text-paper-0">Locked for now</h2>
              <p className="mt-2 text-sm text-paper-0/80">
                The assessment opens the moment all six modules are complete. Nothing you've
                finished expires while you get there — pick the trail back up where you left it.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {frontier && facts && (
                  <LinkButton
                    to={`/course/${frontier.moduleId}`}
                    variant="accent"
                    size="l"
                    iconRight={<ArrowRight className="size-4" strokeWidth={2} aria-hidden />}
                  >
                    Continue Module {facts.order} · {facts.title}
                  </LinkButton>
                )}
                <LinkButton
                  to="/course"
                  variant="ghost"
                  size="l"
                  className="text-paper-0! hover:bg-paper-0/10!"
                >
                  Back to the course map
                </LinkButton>
              </div>
            </div>
            {/* D-016, not the summit-approach hero: promising the summit to a
             * learner with modules left is a reward they haven't earned
             * (VISUAL_ASSETS §5.4.1). This plate shows it high and unclimbed.
             * The left seam dissolves instead of cutting (DESIGN-006). */}
            <div
              className="hidden self-end md:-mb-16 md:block md:translate-x-6"
              style={{
                maskImage: "linear-gradient(90deg, transparent 0%, black 22%)",
                WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 22%)",
              }}
            >
              <SlotArt
                slot="state-assessment-locked"
                variant="dark"
                ratio="5 / 3"
                bleed
                scrim
                sizes="(min-width: 1024px) 34vw, 100vw"
              />
            </div>
          </div>
        </ContourPanel>
      </Reveal>
      <Reveal index={5} className="mt-6">
        <Card padding="l">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line-200 pb-4">
            <h3 className="font-display text-lg font-bold">What's left before the start line</h3>
            <p className="font-mono text-xs text-ink-500">
              {lessonsLeft} {lessonsLeft === 1 ? "lesson" : "lessons"} left
            </p>
          </div>
          <ul className="grid sm:grid-cols-2 sm:gap-x-10">
            {modules.map((mod) => (
              <li
                key={mod.moduleId}
                className="flex items-center gap-3 border-b border-line-200 py-3 text-sm last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0"
              >
                <BlazeMarker
                  state={
                    mod.complete ? "done" : mod.moduleId === frontier?.moduleId ? "active" : "todo"
                  }
                />
                <span className={mod.complete ? "min-w-0 text-ink-500" : "min-w-0 font-medium"}>
                  {mod.title}
                </span>
                <span className="ml-auto shrink-0 font-mono text-xs text-ink-500">
                  {mod.complete ? "complete" : `${mod.lessonsCompleted}/${mod.lessonsTotal} lessons`}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </Reveal>
    </>
  );
}

/** Unlocked intro — the "start when ready" moment; notes an already-issued
 * certificate so a post-pass revisit stays honest about what a retake changes. */
function IntroState({ onStart, ready }: { onStart: () => void; ready: boolean }) {
  const certQuery = useQuery({
    queryKey: ["certificate"],
    queryFn: () => api.certificate(),
    retry: (n, err) => !(err instanceof ApiError && err.status === 404) && n < 2,
  });
  const cert = certQuery.data;
  return (
    <>
      {cert && (
        <Reveal className="mb-6">
          <Card padding="m" className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Award className="mt-0.5 size-5 shrink-0 text-sun-400" strokeWidth={1.5} aria-hidden />
              <p className="max-w-md text-sm text-ink-500">
                You've already passed — your certificate is issued and a retake won't change it.
                Ride through again purely for the practice.
              </p>
            </div>
            <LinkButton to="/certificate" variant="secondary" size="s">
              View your certificate
            </LinkButton>
          </Card>
        </Reveal>
      )}
      <StatTiles />
      <Reveal index={4} className="mt-8">
        {/* Same composition as the dashboard's Continue hero: the words and the
         * CTA on the left, the ridge with the marker already in sight bleeding
         * off the panel's bottom-right edge (VISUAL_ASSETS §7.2 B-082). */}
        <ContourPanel
          variant="dark"
          drift
          glow="clay"
          glowClassName="-right-[6%] -bottom-[20%] size-[70%]"
          className="overflow-hidden rounded-lg"
        >
          <div className="grid items-center gap-8 p-8 md:grid-cols-[1.35fr_1fr] md:gap-10 md:py-10 md:pr-0 md:pl-10">
            <div className="max-w-xl">
              <p className="ts-eyebrow text-clay-400!">All six modules complete</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-paper-0">
                Ready when you are
              </h2>
              <p className="mt-2 text-sm text-paper-0/80">
                Answer at your own pace, review everything before you submit, and see exactly where
                each answer landed afterward.
              </p>
              <div className="mt-6">
                <Button
                  variant="accent"
                  size="l"
                  onClick={onStart}
                  loading={!ready}
                  iconRight={<ArrowRight className="size-4" strokeWidth={2} aria-hidden />}
                >
                  Start the assessment
                </Button>
              </div>
            </div>
            <div
              className="hidden self-end md:-mb-16 md:block md:translate-x-6"
              style={{
                maskImage: "linear-gradient(90deg, transparent 0%, black 22%)",
                WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 22%)",
              }}
            >
              <SlotArt
                slot="hero-assessment"
                variant="dark"
                ratio="4 / 3"
                bleed
                sizes="(min-width: 1024px) 34vw, 100vw"
              />
            </div>
          </div>
        </ContourPanel>
      </Reveal>
    </>
  );
}

export default function AssessmentPage() {
  const [attempt, setAttempt] = useState(0);
  const progressQuery = useQuery({ queryKey: ["progress"], queryFn: () => api.progress() });
  const modules = progressQuery.data?.modules ?? [];
  const unlocked = modules.length > 0 && modules.every((m) => m.complete);

  const bankQuery = useQuery({
    queryKey: ["assessment", "bank"],
    queryFn: () => api.assessmentBank(),
    enabled: unlocked,
    staleTime: 5 * 60_000,
  });

  if (attempt > 0 && bankQuery.data) {
    return (
      <AttemptFlow
        key={attempt}
        bank={bankQuery.data}
        onExit={() => setAttempt(0)}
      />
    );
  }

  return (
    <div className="flex-1">
      <Header complete={modules.filter((m) => m.complete).length} total={modules.length} />
      <div className="mx-auto w-full max-w-page px-6 py-10 lg:px-12">
        {progressQuery.isLoading ? (
          <SkeletonGroup label="Checking your trail" className="flex flex-col gap-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </div>
            <Skeleton className="h-56" />
          </SkeletonGroup>
        ) : progressQuery.error || bankQuery.error ? (
          <Card padding="l">
            <div className="flex flex-col items-center py-6 text-center">
              <h2 className="font-display text-xl font-bold">Couldn't load the assessment</h2>
              <p className="mt-2 max-w-md text-sm text-ink-500">
                {(progressQuery.error ?? bankQuery.error) instanceof ApiError &&
                ((progressQuery.error ?? bankQuery.error) as ApiError).status === 0
                  ? "The connection dropped on the way up. Check your network and try again."
                  : "Something went wrong fetching the questions. Try again in a moment."}
              </p>
              <Button
                variant="secondary"
                className="mt-5"
                onClick={() => {
                  void progressQuery.refetch();
                  void bankQuery.refetch();
                }}
              >
                Try again
              </Button>
            </div>
          </Card>
        ) : unlocked ? (
          <IntroState ready={Boolean(bankQuery.data)} onStart={() => setAttempt((n) => n + 1)} />
        ) : (
          <>
            <StatTiles />
            <LockedState modules={modules} />
          </>
        )}
      </div>
    </div>
  );
}
