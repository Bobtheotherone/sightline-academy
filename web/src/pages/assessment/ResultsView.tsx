/* Assessment results (DESIGN-003, SPEC-006): the pass celebration with the
 * certificate CTA, and the fail state — the designed "review these modules"
 * interstitial mapping perQuestion misses to module titles — plus the
 * question-by-question feedback list both outcomes share.
 */
import { ArrowRight, Award, Check, RotateCcw, TriangleAlert } from "lucide-react";
import type { AssessmentBankResponse, AssessmentResult } from "../../lib/api";
import { MODULE_FACTS } from "../../lib/modules";
import { BadgeMedal } from "../../components/BadgeMedal";
import { Button, LinkButton } from "../../components/Button";
import { Card } from "../../components/Card";
import { ContourPanel } from "../../components/ContourPanel";
import { SlotArt } from "../../components/SlotArt";
import { RiseIn } from "../../activities/motion";

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

function ScoreLine({ result }: { result: AssessmentResult }) {
  const missed = result.perQuestion.filter((p) => !p.correct).length;
  return (
    <p className="font-mono text-sm">
      <span className={result.passed ? "text-sun-400" : "text-clay-500"}>
        {Math.round(result.scorePct)}%
      </span>{" "}
      · {result.perQuestion.length - missed} of {result.perQuestion.length} correct · bar is 80%
    </p>
  );
}

/** Question-by-question feedback — the authored teaching both outcomes share. */
function QuestionReview({
  result,
  bank,
}: {
  result: AssessmentResult;
  bank: AssessmentBankResponse;
}) {
  const byId = new Map(bank.questions.map((q) => [q.id, q]));
  return (
    <section aria-labelledby="question-review-heading">
      <h2 id="question-review-heading" className="font-display text-xl font-bold">
        Question by question
      </h2>
      <Card padding="none" className="mt-4 overflow-hidden">
        <ol>
          {result.perQuestion.map((per, i) => {
            const question = byId.get(per.questionId);
            return (
              <li
                key={per.questionId}
                className={`flex items-start gap-3 px-5 py-3.5 ${i > 0 ? "border-t border-line-200" : ""}`}
              >
                {per.correct ? (
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-sm bg-pine-700/10">
                    <Check className="size-3.5 text-pine-700" strokeWidth={2.5} aria-hidden />
                  </span>
                ) : (
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-sm bg-sun-400/20">
                    <TriangleAlert className="size-3.5 text-sun-400 brightness-75" strokeWidth={2} aria-hidden />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-pine-950">
                    {question?.prompt ?? per.questionId}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-500">{per.feedback}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </Card>
    </section>
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
  if (result.passed) {
    return (
      <div className="mx-auto flex w-full max-w-lesson flex-1 flex-col gap-8 px-6 py-10">
        <RiseIn>
          <ContourPanel variant="dark" className="overflow-hidden rounded-lg">
            <div className="flex flex-col gap-7 p-8 md:p-10">
              <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
                <BadgeMedal
                  badgeId="b-graduate"
                  name="Sightline Safety Academy Graduate"
                  earned
                  size="l"
                  className="shrink-0 [&_figcaption_span]:text-paper-0"
                />
                <div className="min-w-0">
                  <p className="ts-eyebrow text-sun-400!">Final assessment — passed</p>
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
                        <span className="font-mono text-sun-400">{result.certificateCode}</span>
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
               * awarded; the plate says what was climbed — so it closes the
               * panel rather than competing with the headline above it. */}
              <SlotArt slot="hero-graduate" variant="dark" ratio="16 / 9" />
            </div>
          </ContourPanel>
        </RiseIn>
        <RiseIn delay={140}>
          <QuestionReview result={result} bank={bank} />
        </RiseIn>
      </div>
    );
  }

  const weak = weakModules(result, bank);
  return (
    <div className="mx-auto flex w-full max-w-lesson flex-1 flex-col gap-8 px-6 py-10">
      <RiseIn>
        <ContourPanel variant="light" className="overflow-hidden rounded-lg border border-line-200">
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

      <RiseIn delay={100}>
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

      <RiseIn delay={180}>
        <QuestionReview result={result} bank={bank} />
      </RiseIn>

      <RiseIn delay={240}>
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
    </div>
  );
}
