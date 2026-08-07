/* Final assessment (DESIGN-003 §Assessment, SPEC-006 §Hierarchy & unlocking).
 * Locked until all six modules are complete (the locked state names what
 * remains); then the intro (what it covers, 20 questions, 80% bar, no timer),
 * then the one-question-at-a-time attempt flow in pages/assessment/.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Award, CircleHelp, Gauge, ListChecks, TimerOff } from "lucide-react";
import { api, ApiError, type ModuleProgressRollup } from "../lib/api";
import { MODULE_FACTS } from "../lib/modules";
import { Card } from "../components/Card";
import { ContourPanel } from "../components/ContourPanel";
import { Button, LinkButton } from "../components/Button";
import { BlazeMarker } from "../components/BlazeMarker";
import { SlotArt } from "../components/SlotArt";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";
import AttemptFlow from "./assessment/AttemptFlow";

const FACTS = [
  {
    icon: ListChecks,
    title: "20 questions",
    body: "Drawn from all six modules — judgment, machine, gear, terrain, environment, roads.",
  },
  {
    icon: Gauge,
    title: "80% to pass",
    body: "Miss the bar and you'll get a review list of the modules to revisit. Retakes are open.",
  },
  {
    icon: TimerOff,
    title: "No timer",
    body: "Speed has nothing to do with judgment — take the time you need.",
  },
  {
    icon: CircleHelp,
    title: "Feedback after submission",
    body: "You'll see per-question feedback once you submit — not while you answer.",
  },
];

function Header() {
  return (
    <ContourPanel variant="light" className="border-b border-line-200">
      <div className="mx-auto w-full max-w-page px-6 py-10 lg:px-12">
        <p className="ts-eyebrow">Final assessment</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold">The last climb</h1>
        <p className="mt-2 max-w-xl text-ink-500">
          Twenty questions across the whole course. Pass it and your certificate is issued on the
          spot.
        </p>
      </div>
    </ContourPanel>
  );
}

function FactsGrid() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {FACTS.map(({ icon: Icon, title, body }) => (
        <Card key={title} padding="m">
          <Icon className="size-6 text-pine-700" strokeWidth={1.5} aria-hidden />
          <h2 className="mt-3 font-display text-lg font-bold">{title}</h2>
          <p className="mt-1.5 text-sm text-ink-500">{body}</p>
        </Card>
      ))}
    </div>
  );
}

/** Locked composition — names exactly what stands between here and the attempt. */
function LockedState({ modules }: { modules: ModuleProgressRollup[] }) {
  const remaining = modules.filter((m) => !m.complete);
  const frontier = remaining[0];
  const facts = frontier ? MODULE_FACTS.find((m) => m.id === frontier.moduleId) : undefined;
  return (
    <Card padding="l" className="mt-8">
      <h2 className="font-display text-xl font-bold">Locked for now</h2>
      <p className="mt-2 max-w-xl text-sm text-ink-500">
        The assessment opens when all six modules are complete —{" "}
        {remaining.length === 1
          ? "one module to go."
          : `${remaining.length} modules between you and it.`}
      </p>
      <ul className="mt-5 flex flex-col gap-2.5">
        {modules.map((mod) => (
          <li key={mod.moduleId} className="flex items-center gap-3 text-sm">
            <BlazeMarker
              state={mod.complete ? "done" : mod.moduleId === frontier?.moduleId ? "active" : "todo"}
            />
            <span className={mod.complete ? "text-ink-500" : "font-medium"}>{mod.title}</span>
            {!mod.complete && mod.lessonsCompleted > 0 && (
              <span className="font-mono text-xs text-ink-500">
                {mod.lessonsCompleted}/{mod.lessonsTotal} lessons
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-3">
        {frontier && facts && (
          <LinkButton
            to={`/course/${frontier.moduleId}`}
            iconRight={<ArrowRight className="size-4" strokeWidth={2} aria-hidden />}
          >
            Continue Module {facts.order} · {facts.title}
          </LinkButton>
        )}
        <LinkButton to="/course" variant="ghost">
          Back to the course map
        </LinkButton>
      </div>
    </Card>
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
        <Card padding="m" className="mb-6 flex flex-wrap items-center justify-between gap-4">
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
      )}
      <FactsGrid />
      <ContourPanel variant="dark" className="mt-8 overflow-hidden rounded-lg">
        {/* Same composition as the dashboard's Continue hero: the words and the
         * CTA on the left, the plate on the right. The ridge with the marker
         * already in sight is what this moment is (VISUAL_ASSETS §7.2 B-082). */}
        <div className="grid items-center gap-8 p-8 md:grid-cols-[1.4fr_1fr]">
          <div className="max-w-xl">
            <p className="ts-eyebrow text-sun-400!">All six modules complete</p>
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
          <SlotArt
            slot="hero-assessment"
            variant="dark"
            ratio="16 / 9"
            className="hidden md:block"
          />
        </div>
      </ContourPanel>
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
      <Header />
      <div className="mx-auto w-full max-w-page px-6 py-10 lg:px-12">
        {progressQuery.isLoading ? (
          <SkeletonGroup label="Checking your trail" className="flex flex-col gap-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Skeleton className="h-36" />
              <Skeleton className="h-36" />
              <Skeleton className="h-36" />
              <Skeleton className="h-36" />
            </div>
            <Skeleton className="h-40" />
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
            <FactsGrid />
            <LockedState modules={modules} />
          </>
        )}
      </div>
    </div>
  );
}
