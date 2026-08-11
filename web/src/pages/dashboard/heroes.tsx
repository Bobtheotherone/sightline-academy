/* Dashboard hero variants (DESIGN-003 v2 §Dashboard, SPEC-006 §Resume &
 * continuity): the span-8 bento hero in its four states — first-run welcome,
 * the mid-course Continue card (deep-linking to the learner_state lesson+step
 * while that lesson is unfinished, falling forward to the next lesson once it
 * isn't), the open assessment, and the graduate composition. All four wear the
 * same shell: dark drifting panel, module art bled to the right edge behind a
 * left scrim, one clay CTA.
 */
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Award, NotebookPen } from "lucide-react";
import {
  api,
  ApiError,
  type LearnerStateOut,
  type LessonResponse,
  type LessonSummary,
} from "../../lib/api";
import { MODULE_FACTS } from "../../lib/modules";
import { ContourPanel } from "../../components/ContourPanel";
import { shortDate } from "../../components/JournalCard";
import { ProgressBar } from "../../components/Progress";
import { LinkButton } from "../../components/Button";
import { SlotArt } from "../../components/SlotArt";
import { Skeleton, SkeletonGroup } from "../../components/Skeleton";

/**
 * The hero shell. Art is staged as composition, not as a framed plate: it fills
 * the panel's right edge at full height and the scrim ramps it back to panel
 * colour under the type, so the headline never sits on illustration detail. Both
 * layers are decorative and drop out below md, where the copy owns the width.
 */
function HeroPanel({ slot, children }: { slot?: string; children: ReactNode }) {
  return (
    <ContourPanel variant="dark" drift className="h-full rounded-lg">
      {slot && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[52%] md:block"
        >
          <SlotArt
            slot={slot}
            variant="dark"
            bleed
            ratio="4 / 3"
            sizes="(min-width: 1024px) 38vw, 0px"
            className="absolute inset-0 h-full w-full"
          />
          {/* The scrim rides the art, not the panel: the contour drift on the
           * left stays visible, and the illustration ramps out of panel colour
           * instead of butting against it. */}
          <span className="absolute inset-0 bg-linear-to-r from-pine-950 via-pine-950/45 via-38% to-pine-950/0" />
        </span>
      )}
      <div className="relative flex h-full flex-col justify-center p-8 md:max-w-[55%] md:p-10">
        {children}
      </div>
    </ContourPanel>
  );
}

/** Shared by the Continue card's lookups: a 4xx is an answer, not a blip. */
function retryLookup(n: number, err: Error): boolean {
  return !(err instanceof ApiError && err.status >= 400) && n < 2;
}

/** What the Continue card opens: a lesson, the graduate hero, or neither yet. */
type ContinueTarget =
  | { kind: "loading" }
  | { kind: "graduate" }
  | { kind: "unresolved" }
  | {
      kind: "lesson";
      /** Course-fresh summary (title, percent) — the lesson list, not the cached detail. */
      summary: LessonSummary;
      /** Step list + evidence for the step counter and the up-next line. */
      detail: LessonResponse;
      /** True while that lesson is unfinished: resume the exact step (R1.2). */
      resume: boolean;
      /** Progress through the module the target sits in — the number the trail mini shows. */
      modulePercent: number;
    };

/**
 * Where "Continue" actually points. learner_state drives it (SPEC-006 §Resume &
 * continuity) and R1.2 wants the exact step back — but only while that lesson is
 * still unfinished. Once it's done, learner_state points backwards, so the card
 * falls forward through real course data: the next unfinished lesson of that
 * module, else the first one left in the frontier module the trail card names,
 * else the graduate hero. Completion comes from ["course"] / ["module"] — the
 * keys the player invalidates on completion — never from a lesson-detail cache.
 */
function useContinueTarget(state: LearnerStateOut): ContinueTarget {
  const lastLessonId = state.lastLessonId ?? "";
  /* staleTime 0: the player edits evidence without writing back to this key, so
   * the card revalidates rather than naming a step already answered. */
  const lastLessonQuery = useQuery({
    queryKey: ["lesson", lastLessonId],
    queryFn: () => api.lesson(lastLessonId),
    enabled: Boolean(lastLessonId),
    staleTime: 0,
    retry: retryLookup,
  });
  const courseQuery = useQuery({ queryKey: ["course"], queryFn: () => api.course() });

  const modules = courseQuery.data?.modules;
  const lastModuleId = lastLessonQuery.data?.lesson.moduleId ?? "";
  const lastModule = modules?.find((m) => m.id === lastModuleId);
  // The module holding the next thing to do: the last-visited one while it still
  // has lessons left, otherwise the frontier.
  const searchModule =
    lastModule && !lastModule.complete
      ? lastModule
      : modules?.find((m) => !m.complete && !m.locked);
  const searchModuleId = searchModule?.id ?? "";
  const lessonsQuery = useQuery({
    queryKey: ["module", searchModuleId],
    queryFn: () => api.module(searchModuleId),
    enabled: Boolean(searchModuleId),
    retry: retryLookup,
  });

  const lessons = lessonsQuery.data?.lessons;
  const ordered = lessons ? [...lessons].sort((a, b) => a.order - b.order) : undefined;
  const lastSummary = ordered?.find((l) => l.id === lastLessonId);
  const resume = lastSummary !== undefined && !lastSummary.complete;
  const summary = resume ? lastSummary : (ordered?.find((l) => !l.complete) ?? ordered?.[0]);
  const targetId = summary?.id ?? "";
  const targetQuery = useQuery({
    queryKey: ["lesson", targetId],
    queryFn: () => api.lesson(targetId),
    enabled: Boolean(targetId) && targetId !== lastLessonId,
    staleTime: 0,
    retry: retryLookup,
  });
  const detail = targetId === lastLessonId ? lastLessonQuery.data : targetQuery.data;
  const modulePercent = lessonsQuery.data?.module.percent ?? searchModule?.percent ?? 0;

  if (summary && detail) return { kind: "lesson", summary, detail, resume, modulePercent };
  if (
    lastLessonQuery.isLoading ||
    courseQuery.isLoading ||
    lessonsQuery.isLoading ||
    targetQuery.isLoading
  ) {
    return { kind: "loading" };
  }
  // Every module done but the progress rollup hasn't said so yet.
  if (modules !== undefined && modules.length > 0 && modules.every((m) => m.complete)) {
    return { kind: "graduate" };
  }
  return { kind: "unresolved" };
}

/** First-run hero: welcome card introducing the course + Ranger (DESIGN-003). */
export function WelcomeCard() {
  return (
    <HeroPanel slot="hero-m1-mindset">
      <p className="ts-eyebrow text-pine-300!">Start here</p>
      <h2 className="mt-2 font-display text-2xl font-bold text-paper-0">
        Module 1 · The Rider's Mindset
      </h2>
      <p className="mt-3 max-w-lg text-paper-0/80">
        Most crashes are decided before the wheels turn. In about 45 minutes you'll see why — and
        build the risk profile the rest of the course leans on. Ranger, your safety tutor, rides
        along the whole way.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <LinkButton to="/course/m1-riders-mindset" variant="accent" size="l">
          Start Module 1
        </LinkButton>
        <LinkButton
          to="/tutor"
          variant="ghost"
          size="l"
          className="text-paper-0! hover:bg-paper-0/10!"
        >
          Meet Ranger first
        </LinkButton>
      </div>
    </HeroPanel>
  );
}

/** Mid-course hero: the next lesson to ride, at the exact step (SPEC-006). */
export function ContinueCard({ state }: { state: LearnerStateOut }) {
  const target = useContinueTarget(state);

  if (target.kind === "loading") {
    return (
      /* Height tracks the loaded card (~391px desktop) so the swap doesn't
       * shift the grid below (QA-004 CLS). */
      <SkeletonGroup label="Loading where you left off" className="block h-full">
        <Skeleton className="h-96 w-full rounded-lg" />
      </SkeletonGroup>
    );
  }

  if (target.kind === "graduate") return <GraduateHero />;

  if (target.kind === "unresolved") {
    return (
      <HeroPanel>
        <p className="ts-eyebrow text-pine-300!">Back on the trail</p>
        <h2 className="mt-2 font-display text-2xl font-bold text-paper-0">
          Pick up where you left off
        </h2>
        <div className="mt-6">
          <LinkButton to="/course" variant="accent" size="l">
            Open the course map
          </LinkButton>
        </div>
      </HeroPanel>
    );
  }

  const { summary, detail, resume, modulePercent } = target;
  const facts = MODULE_FACTS.find((m) => m.id === summary.moduleId);
  const steps = [...detail.steps].sort((a, b) => a.order - b.order);
  // The target lesson is unfinished by construction, so this always names a step
  // the learner still owes — never one they've already answered.
  const frontier = steps.find((s) => s.required && !detail.evidence[s.id]?.complete) ?? steps[0];
  const stepNumber = steps.findIndex((s) => s.id === frontier.id) + 1;
  const href =
    resume && state.lastStepId
      ? `/learn/${summary.id}?step=${state.lastStepId}`
      : `/learn/${summary.id}`;
  // Only a lesson already under way is one you "pick up".
  const started = resume || summary.percent > 0;
  /* The bar carries the module, not the lesson: a lesson whose first step is
   * still owed reports 0, and an empty track on the home hero reads as broken
   * next to a trail mini naming a real percentage. */
  const percent = Math.round(Math.max(modulePercent, summary.percent));

  return (
    <HeroPanel slot={facts?.heroSlot}>
      <p className="ts-eyebrow text-pine-300!">Continue</p>
      <p className="mt-2 text-sm font-medium text-paper-0/70">
        Module {facts?.order} · {facts?.title}
      </p>
      <h2 className="mt-1 font-display text-2xl font-bold text-paper-0">{summary.title}</h2>
      <div className="mt-4 flex items-center gap-3">
        {/* On pine-950 the default pine-700 fill and a paper-0/20 track resolve
         * to the same value — the fill is restated on-dark so they read apart. */}
        <ProgressBar
          value={percent}
          animateIn
          label={`${facts?.title ?? "This module"}: ${percent} percent complete`}
          className="max-w-56 bg-paper-0/20 [&>div]:bg-pine-300"
        />
        <span className="shrink-0 whitespace-nowrap font-mono text-xs text-paper-0/70">
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
          {started ? "Pick up the trail" : "Start the lesson"}
        </LinkButton>
      </div>
    </HeroPanel>
  );
}

/** Graduate hero (SPEC-006): certificate, Ride Plan, and the assessment-open
 * state for the window where every module is done but the code isn't earned. */
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
      <HeroPanel slot="hero-assessment">
        <p className="ts-eyebrow text-sun-400!">All six modules complete</p>
        <h2 className="mt-2 font-display text-2xl font-bold text-paper-0">
          The final assessment is open
        </h2>
        <p className="mt-3 max-w-lg text-paper-0/80">
          Twenty questions across the whole course, no timer, 80% to earn your certificate.
        </p>
        <div className="mt-6">
          <LinkButton to="/assessment" variant="accent" size="l">
            Take the assessment
          </LinkButton>
        </div>
      </HeroPanel>
    );
  }

  return (
    <HeroPanel slot="hero-graduate">
      <p className="ts-eyebrow text-sun-400!">Graduate</p>
      <h2 className="mt-2 font-display text-2xl font-bold text-paper-0">
        You've ridden the whole trail
      </h2>
      <p className="mt-3 max-w-lg text-paper-0/80">
        Certificate earned{cert ? ` ${shortDate(cert.issuedAt)}` : ""} — verification code in hand.
        Your Ride Plan is the piece that keeps working after the course ends.
      </p>
      {cert && <p className="mt-2 font-mono text-sm text-sun-400">{cert.code}</p>}
      {/* Stacked below sm: two icon buttons on one wrap line add their
       * min-content widths together, which pushes the bento column — and with
       * it the page — past the viewport at 375px. */}
      <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap">
        <LinkButton
          to="/certificate"
          variant="accent"
          size="l"
          iconLeft={<Award className="size-4" strokeWidth={1.5} aria-hidden />}
        >
          View your certificate
        </LinkButton>
        <LinkButton
          to="/journal/ride_plan"
          variant="ghost"
          size="l"
          className="text-paper-0! hover:bg-paper-0/10!"
          iconLeft={<NotebookPen className="size-4" strokeWidth={1.5} aria-hidden />}
        >
          Open your Ride Plan
        </LinkButton>
      </div>
    </HeroPanel>
  );
}
