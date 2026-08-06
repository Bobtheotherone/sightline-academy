/* Dashboard hero variants (DESIGN-003 §Dashboard, SPEC-006 §Resume &
 * continuity): the mid-course Continue card deep-linking to the learner_state
 * lesson+step, and the graduate composition (certificate card, Ride Plan card,
 * keep-exploring-with-Ranger prompt) with the assessment-open state when every
 * module is done but the certificate isn't earned yet.
 */
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Award, Compass, NotebookPen } from "lucide-react";
import { api, ApiError, type LearnerStateOut } from "../../lib/api";
import { MODULE_FACTS } from "../../lib/modules";
import { Card } from "../../components/Card";
import { ContourPanel } from "../../components/ContourPanel";
import { shortDate } from "../../components/JournalCard";
import { ProgressBar } from "../../components/Progress";
import { LinkButton } from "../../components/Button";
import { SlotArt } from "../../components/SlotArt";
import { Skeleton, SkeletonGroup } from "../../components/Skeleton";

/** Mid-course hero: deep-links to the learner_state lesson+step (SPEC-006). */
export function ContinueCard({ state }: { state: LearnerStateOut }) {
  const lessonId = state.lastLessonId ?? "";
  const lessonQuery = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => api.lesson(lessonId),
    enabled: Boolean(lessonId),
    retry: (n, err) => !(err instanceof ApiError && err.status >= 400) && n < 2,
  });

  if (lessonQuery.isLoading) {
    return (
      /* Height tracks the loaded card (~391px desktop) so the swap doesn't
       * shift the grid below (QA-004 CLS). */
      <SkeletonGroup label="Loading where you left off" className="block">
        <Skeleton className="h-96 w-full rounded-lg" />
      </SkeletonGroup>
    );
  }

  const data = lessonQuery.data;
  if (!data) {
    return (
      <ContourPanel variant="dark" className="overflow-hidden rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-6 p-8">
          <div>
            <p className="ts-eyebrow text-pine-300!">Back on the trail</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-paper-0">
              Pick up where you left off
            </h2>
          </div>
          <LinkButton to="/course" variant="accent" size="l">
            Open the course map
          </LinkButton>
        </div>
      </ContourPanel>
    );
  }

  const facts = MODULE_FACTS.find((m) => m.id === data.lesson.moduleId);
  const steps = [...data.steps].sort((a, b) => a.order - b.order);
  const frontier =
    steps.find((s) => s.required && !data.evidence[s.id]?.complete) ?? steps[steps.length - 1];
  const stepNumber = steps.findIndex((s) => s.id === frontier.id) + 1;
  const href = state.lastStepId
    ? `/learn/${data.lesson.id}?step=${state.lastStepId}`
    : `/learn/${data.lesson.id}`;

  return (
    <ContourPanel variant="dark" className="overflow-hidden rounded-lg">
      <div className="grid items-center gap-8 p-8 md:grid-cols-[1.2fr_1fr] md:p-10">
        <div>
          <p className="ts-eyebrow text-pine-300!">Continue</p>
          <p className="mt-2 text-sm font-medium text-paper-0/70">
            Module {facts?.order} · {facts?.title}
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold text-paper-0">
            {data.lesson.title}
          </h2>
          <div className="mt-4 flex items-center gap-3">
            <ProgressBar
              value={data.lesson.percent}
              label={`${data.lesson.title}: ${data.lesson.percent} percent complete`}
              className="max-w-56 bg-paper-0/20"
            />
            <span className="font-mono text-xs text-paper-0/70">
              Step {stepNumber} of {steps.length}
            </span>
          </div>
          <p className="mt-3 text-sm text-paper-0/80">Up next: {frontier.title}</p>
          <div className="mt-6">
            <LinkButton
              to={href}
              variant="accent"
              size="l"
              iconRight={<ArrowRight className="size-4" strokeWidth={2} aria-hidden />}
            >
              Pick up the trail
            </LinkButton>
          </div>
        </div>
        {facts && (
          <SlotArt slot={facts.heroSlot} variant="dark" ratio="4 / 3" className="hidden md:block" />
        )}
      </div>
    </ContourPanel>
  );
}

/** Graduate hero (SPEC-006): certificate, Ride Plan, keep exploring. */
export function GraduateHero() {
  const certQuery = useQuery({
    queryKey: ["certificate"],
    queryFn: () => api.certificate(),
    retry: (n, err) => !(err instanceof ApiError && err.status === 404) && n < 2,
  });
  const cert = certQuery.data;

  if (!certQuery.isLoading && !cert) {
    // Every module complete, certificate pending — the assessment is the trailhead.
    return (
      <ContourPanel variant="dark" className="overflow-hidden rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-6 p-8 md:p-10">
          <div className="max-w-xl">
            <p className="ts-eyebrow text-sun-400!">All six modules complete</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-paper-0">
              The final assessment is open
            </h2>
            <p className="mt-3 text-paper-0/80">
              Twenty questions across the whole course, no timer, 80% to earn your certificate.
            </p>
          </div>
          <LinkButton to="/assessment" variant="accent" size="l">
            Take the assessment
          </LinkButton>
        </div>
      </ContourPanel>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <ContourPanel variant="dark" className="overflow-hidden rounded-lg lg:col-span-1">
        <div className="flex h-full flex-col justify-between gap-6 p-7">
          <div>
            <p className="ts-eyebrow text-sun-400!">Graduate</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-paper-0">
              You've ridden the whole trail
            </h2>
            <p className="mt-2 text-sm text-paper-0/80">
              Certificate earned{cert ? ` ${shortDate(cert.issuedAt)}` : ""} — verification code
              in hand.
            </p>
            {cert && <p className="mt-2 font-mono text-sm text-sun-400">{cert.code}</p>}
          </div>
          <LinkButton
            to="/certificate"
            variant="accent"
            iconLeft={<Award className="size-4" strokeWidth={1.5} aria-hidden />}
          >
            View your certificate
          </LinkButton>
        </div>
      </ContourPanel>
      <Card padding="m" className="flex flex-col justify-between gap-4">
        <div>
          <p className="ts-eyebrow">The capstone</p>
          <h2 className="mt-1 font-display text-xl font-bold">Your Ride Plan</h2>
          <p className="mt-2 text-sm text-ink-500">
            Everything the course taught you, folded into one printable plan. Revisit it before
            every ride that matters.
          </p>
        </div>
        <LinkButton
          to="/journal/ride_plan"
          variant="secondary"
          iconLeft={<NotebookPen className="size-4" strokeWidth={1.5} aria-hidden />}
        >
          Open your Ride Plan
        </LinkButton>
      </Card>
      <Card padding="m" className="flex flex-col justify-between gap-4">
        <div>
          <p className="ts-eyebrow">Keep exploring</p>
          <h2 className="mt-1 flex items-center gap-2 font-display text-xl font-bold">
            <Compass className="size-5 text-sky-600" strokeWidth={1.5} aria-hidden />
            Ranger's still here
          </h2>
          <p className="mt-2 text-sm text-ink-500">
            The course ends; the questions don't. Ask Ranger about the rides you're actually
            planning — <span className="font-medium text-pine-950">"How should I prep for a
            group ride in wet season?"</span>
          </p>
        </div>
        <LinkButton to="/tutor" variant="secondary">
          Ask Ranger
        </LinkButton>
      </Card>
    </div>
  );
}
