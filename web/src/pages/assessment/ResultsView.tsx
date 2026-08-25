/* Assessment results (DESIGN-003, SPEC-006): the pass celebration with the
 * certificate CTA, and the fail state — the designed "review these modules"
 * interstitial mapping perQuestion misses to module titles — plus the
 * question-by-question feedback list both outcomes share.
 */
import type { ReactNode } from "react";
import { ArrowRight, Award, Check, RotateCcw, TriangleAlert } from "lucide-react";
import type { AssessmentBankResponse, AssessmentResult } from "../../lib/api";
import { MODULE_FACTS } from "../../lib/modules";
import { BadgeMedal } from "../../components/BadgeMedal";
import { Button, LinkButton } from "../../components/Button";
import { Card } from "../../components/Card";
import { ContourPanel } from "../../components/ContourPanel";
import { SlotArt } from "../../components/SlotArt";
import { RiseIn, useEntered, useReducedMotion } from "../../activities/motion";

interface WeakModule {
  moduleId: string;
  order: number;
  title: string;
  missed: number;
  asked: number;
}

function weakModules(result: AssessmentResult, bank: AssessmentBankResponse): WeakModule[] {
  const byId = new Map(bank.questions.map((q) => [q.id, q]));
  const rows = new Map<string, WeakModule>();
  for (const per of result.perQuestion) {
    const question = byId.get(per.questionId);
    if (!question) continue;
    const facts = MODULE_FACTS.find((m) => m.id === question.module);
    const row = rows.get(question.module) ?? {
      moduleId: question.module,
      order: facts?.order ?? 0,
      title: facts?.title ?? question.module,
      missed: 0,
      asked: 0,
    };
    row.asked += 1;
    if (!per.correct) row.missed += 1;
    rows.set(question.module, row);
  }
  return [...rows.values()]
    .filter((r) => r.missed > 0)
    .sort((a, b) => b.missed - a.missed || a.order - b.order);
}

/** Both outcomes keep the 760px reading column, but the ground behind it runs
 * full height in contour so the wide margins read as textured trail rather than
 * blank paper (DESIGN-003 — the call the tutor column already follows). */
function ResultsGround({ children }: { children: ReactNode }) {
  return (
    <div className="ts-contour flex-1">
      <div className="mx-auto flex w-full max-w-lesson flex-col gap-8 px-6 py-10">{children}</div>
    </div>
  );
}

/* The score stays a plain mono numeral rather than a CountUp surface: J2 asserts
 * getByText(/100%/), and CountUp's sr-only twin would make that match twice. */
function ScoreLine({ result }: { result: AssessmentResult }) {
  const missed = result.perQuestion.filter((p) => !p.correct).length;
  return (
    <p className="font-mono text-sm tabular-nums">
      <span className={result.passed ? "text-clay-400" : "text-clay-500"}>
        {Math.round(result.scorePct)}%
      </span>{" "}
      · {result.perQuestion.length - missed} of {result.perQuestion.length} correct · bar is 80%
    </p>
  );
}

interface ReviewGroup {
  moduleId: string;
  order: number;
  missed: number;
  rows: { questionId: string; correct: boolean; feedback: string; prompt: string }[];
}

/* The review list is chunked by the module each question came from, so it reads
 * as the same gapped-card rhythm as "Review these modules" instead of one
 * 1200px slab. Module titles stay out of the headers on purpose: they already
 * name themselves in the weak-module cards above, and repeating them here would
 * make the same title ambiguous on the page. */
function reviewGroups(result: AssessmentResult, bank: AssessmentBankResponse): ReviewGroup[] {
  const byId = new Map(bank.questions.map((q) => [q.id, q]));
  const groups = new Map<string, ReviewGroup>();
  for (const per of result.perQuestion) {
    const question = byId.get(per.questionId);
    const moduleId = question?.module ?? "unsorted";
    const facts = MODULE_FACTS.find((m) => m.id === moduleId);
    const group = groups.get(moduleId) ?? {
      moduleId,
      order: facts?.order ?? 99,
      missed: 0,
      rows: [],
    };
    group.rows.push({ ...per, prompt: question?.prompt ?? per.questionId });
    if (!per.correct) group.missed += 1;
    groups.set(moduleId, group);
  }
  return [...groups.values()].sort((a, b) => a.order - b.order);
}

/** Question-by-question feedback — the authored teaching both outcomes share. */
function QuestionReview({
  result,
  bank,
}: {
  result: AssessmentResult;
  bank: AssessmentBankResponse;
}) {
  const groups = reviewGroups(result, bank);
  const correct = result.perQuestion.filter((p) => p.correct).length;
  return (
    <section aria-labelledby="question-review-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="question-review-heading" className="font-display text-xl font-bold">
          Question by question
        </h2>
        <p className="font-mono text-xs text-ink-500">
          {correct} right · {result.perQuestion.length - correct} to revisit
        </p>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {groups.map((group) => (
          <Card key={group.moduleId} padding="none" bordered className="overflow-hidden">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line-200 bg-moss-50 px-5 py-2.5">
              <h3 className="ts-eyebrow">
                {group.order < 99 ? `Module ${group.order}` : "Other questions"}
              </h3>
              <p className="font-mono text-xs text-ink-500">
                {group.missed === 0
                  ? `all ${group.rows.length} right`
                  : `${group.missed} of ${group.rows.length} missed`}
              </p>
            </div>
            <ol>
              {group.rows.map((row, i) => (
                <li
                  key={row.questionId}
                  className={`flex items-start gap-3 px-5 py-3.5 ${i > 0 ? "border-t border-line-200" : ""}`}
                >
                  {row.correct ? (
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-sm bg-pine-100">
                      <Check className="size-4 text-pine-700" strokeWidth={2.5} aria-hidden />
                      <span className="sr-only">Right:</span>
                    </span>
                  ) : (
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-sm bg-sun-100">
                      <TriangleAlert
                        className="size-4 text-sun-400 brightness-75"
                        strokeWidth={2.25}
                        aria-hidden
                      />
                      <span className="sr-only">Missed:</span>
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-pine-950">{row.prompt}</p>
                    <p className="mt-0.5 text-sm text-ink-500">{row.feedback}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        ))}
      </div>
    </section>
  );
}

/** The pass ceremony (DESIGN-004 §Ceremonies 5): the banner rises, the graduate
 * medal runs the earn ceremony, the summit plate fades up behind its scrim, and
 * the question review staggers in after all three. */
function PassResult({
  result,
  bank,
}: {
  result: AssessmentResult;
  bank: AssessmentBankResponse;
}) {
  const reduced = useReducedMotion();
  const artIn = useEntered(reduced ? 0 : 220);
  return (
    <ResultsGround>
      <RiseIn>
        <ContourPanel variant="dark" drift className="rounded-lg">
          <div className="flex flex-col gap-7 p-8 md:p-10">
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              <BadgeMedal
                badgeId="b-graduate"
                name="Sightline Safety Academy Graduate"
                earned
                size="l"
                ceremony
                className="shrink-0 [&_figcaption_span]:text-paper-0"
              />
              <div className="min-w-0">
                <p className="ts-eyebrow text-clay-400!">Final assessment — passed</p>
                <h1 className="mt-1 font-display text-3xl font-extrabold text-paper-0">
                  You've earned your sightline
                </h1>
                <div className="mt-2 text-paper-0/85">
                  <ScoreLine result={result} />
                </div>
                <p className="mt-3 max-w-lg text-sm text-paper-0/80">
                  Six modules, twenty questions, one standard — and you cleared it. Your
                  certificate is issued and verifiable
                  {result.certificateCode ? (
                    <>
                      {" "}under code{" "}
                      <span className="font-mono text-clay-400">{result.certificateCode}</span>
                    </>
                  ) : null}
                  .
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <LinkButton
                    to="/certificate"
                    variant="accent"
                    size="l"
                    iconLeft={<Award className="size-4" strokeWidth={1.5} aria-hidden />}
                  >
                    View your certificate
                  </LinkButton>
                  <LinkButton
                    to="/dashboard"
                    variant="ghost"
                    size="l"
                    className="text-paper-0! hover:bg-paper-0/10!"
                  >
                    Back to your dashboard
                  </LinkButton>
                </div>
              </div>
            </div>
            {/* The summit reached, with the whole range the course crossed
             * below it (VISUAL_ASSETS §7.2 B-083). The medal says what was
             * awarded; the plate says what was climbed — so it bleeds out of
             * the panel floor behind a scrim rather than sitting in a box. */}
            <div className="relative -mx-8 -mb-8 md:-mx-10 md:-mb-10">
              <SlotArt
                slot="hero-graduate"
                variant="dark"
                ratio="21 / 9"
                bleed
                sizes="(min-width: 768px) 760px, 100vw"
                className={`transition-[opacity,translate] duration-(--ts-dur-slow) ease-(--ts-ease-out) ${
                  artIn ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                }`}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-2/5 bg-linear-to-b from-pine-950 to-transparent"
              />
            </div>
          </div>
        </ContourPanel>
      </RiseIn>
      <RiseIn delay={reduced ? 0 : 280}>
        <QuestionReview result={result} bank={bank} />
      </RiseIn>

      {/* The review runs ~2000px; the hero's CTAs are long gone by the end of it,
       * so the pass route closes on the same terminal action row the fail route
       * has. Labels differ from the hero pair so no two links on the page share
       * an accessible name. */}
      <RiseIn delay={reduced ? 0 : 340}>
        <div className="flex flex-wrap items-center justify-center gap-3 pb-2">
          <LinkButton
            to="/certificate"
            variant="accent"
            size="l"
            iconLeft={<Award className="size-4" strokeWidth={1.5} aria-hidden />}
          >
            Go to your certificate
          </LinkButton>
          <LinkButton to="/course" variant="ghost">
            Back to the course map
          </LinkButton>
        </div>
      </RiseIn>
    </ResultsGround>
  );
}

export default function ResultsView({
  result,
  bank,
  onRetake,
}: {
  result: AssessmentResult;
  bank: AssessmentBankResponse;
  onRetake: () => void;
}) {
  const reduced = useReducedMotion();
  if (result.passed) return <PassResult result={result} bank={bank} />;

  const weak = weakModules(result, bank);
  return (
    <ResultsGround>
      <RiseIn>
        {/* The plate carries its own paper fill so the strong contour rides a
         * raised surface instead of merging into the contour ground — one step
         * above the paper-50 review cards below it (DESIGN-006 §Depth). The fill
         * is inline because .ts-contour's background-color is unlayered CSS and
         * outranks every Tailwind bg-* utility. */}
        <ContourPanel
          variant="light"
          style={{ backgroundColor: "var(--ts-paper-50)" }}
          className="ts-contour--strong overflow-hidden rounded-lg border border-line-200 shadow-2"
        >
          <div className="p-8 md:p-10">
            <p className="ts-eyebrow">Final assessment</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold">
              Not this time — the trail's still there
            </h1>
            <div className="mt-2">
              <ScoreLine result={result} />
            </div>
            <p className="mt-3 max-w-xl text-sm text-ink-500">
              The misses cluster in the modules below. Ride back through them — completed modules
              stay open for review — then take the assessment again. No timer, no attempt limit.
            </p>
          </div>
        </ContourPanel>
      </RiseIn>

      <RiseIn delay={reduced ? 0 : 100}>
        <section aria-labelledby="weak-modules-heading">
          <h2 id="weak-modules-heading" className="font-display text-xl font-bold">
            Review these modules
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            {weak.map((row) => (
              <Card
                key={row.moduleId}
                padding="s"
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="ts-eyebrow">Module {row.order}</p>
                  <p className="mt-0.5 font-display text-lg font-bold">{row.title}</p>
                  <p className="font-mono text-xs text-ink-500">
                    missed {row.missed} of {row.asked} here
                  </p>
                </div>
                <LinkButton
                  to={`/course/${row.moduleId}`}
                  variant="secondary"
                  size="s"
                  iconRight={<ArrowRight className="size-4" strokeWidth={2} aria-hidden />}
                >
                  Revisit
                </LinkButton>
              </Card>
            ))}
          </div>
        </section>
      </RiseIn>

      <RiseIn delay={reduced ? 0 : 180}>
        <QuestionReview result={result} bank={bank} />
      </RiseIn>

      <RiseIn delay={reduced ? 0 : 240}>
        <div className="flex flex-wrap items-center justify-center gap-3 pb-2">
          <Button
            size="l"
            onClick={onRetake}
            iconLeft={<RotateCcw className="size-4" strokeWidth={2} aria-hidden />}
          >
            Retake the assessment
          </Button>
          <LinkButton to="/course" variant="ghost">
            Back to the course map
          </LinkButton>
        </div>
      </RiseIn>
    </ResultsGround>
  );
}
