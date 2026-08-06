/* The live assessment attempt (DESIGN-003 §Assessment): one question at a time
 * with KnowledgeOption cards and NO inline feedback until submission; question
 * order and option order shuffled per attempt; blaze progress rail; a review
 * screen before submit (SPEC-006). Results render in ResultsView.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ClipboardCheck, Send } from "lucide-react";
import {
  api,
  type AssessmentBankOption,
  type AssessmentBankQuestion,
  type AssessmentBankResponse,
  type AssessmentResult,
} from "../../lib/api";
import { useApiError } from "../../lib/useApiError";
import { MODULE_FACTS } from "../../lib/modules";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { KnowledgeOption } from "../../components/KnowledgeOption";
import { ProgressBar } from "../../components/Progress";
import { RiseIn } from "../../activities/motion";
import ResultsView from "./ResultsView";

const MARKERS = ["A", "B", "C", "D", "E", "F"];

interface Slot {
  question: AssessmentBankQuestion;
  options: AssessmentBankOption[];
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function deal(bank: AssessmentBankResponse): Slot[] {
  return shuffle(bank.questions).map((question) => ({
    question,
    options: shuffle(question.options),
  }));
}

/** Blaze rail: one jump-dot per question — answered filled, current clay. */
function QuestionRail({
  slots,
  answers,
  index,
  onJump,
}: {
  slots: Slot[];
  answers: Record<string, string>;
  index: number;
  onJump: (i: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Jump to a question">
      {slots.map((slot, i) => {
        const answered = Boolean(answers[slot.question.id]);
        const current = i === index;
        return (
          <button
            key={slot.question.id}
            type="button"
            onClick={() => onJump(i)}
            aria-label={`Question ${i + 1}${answered ? " — answered" : ""}${current ? " — current" : ""}`}
            aria-current={current ? "step" : undefined}
            className="grid size-7 place-items-center rounded-sm transition-colors duration-(--ts-dur-fast) hover:bg-moss-100"
          >
            <span
              className={`size-2.5 rotate-45 rounded-[3px] transition-colors duration-(--ts-dur-fast) ${
                current ? "bg-clay-500" : answered ? "bg-pine-700" : "bg-line-200"
              }`}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}

export default function AttemptFlow({
  bank,
  onExit,
}: {
  bank: AssessmentBankResponse;
  onExit: () => void;
}) {
  const [slots, setSlots] = useState<Slot[]>(() => deal(bank));
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const queryClient = useQueryClient();
  const onApiError = useApiError();

  const submit = useMutation({
    mutationFn: () => api.submitAssessment({ answers }),
    onSuccess: (res) => {
      setResult(res);
      window.scrollTo({ top: 0 });
      if (res.passed) {
        for (const key of ["certificate", "progress", "me"]) {
          void queryClient.invalidateQueries({ queryKey: [key] });
        }
      }
    },
    onError: onApiError,
  });

  const retake = () => {
    setSlots(deal(bank));
    setAnswers({});
    setIndex(0);
    setReviewing(false);
    setResult(null);
    submit.reset();
    window.scrollTo({ top: 0 });
  };

  if (result) {
    return <ResultsView result={result} bank={bank} onRetake={retake} />;
  }

  const total = slots.length;
  const answered = slots.filter((s) => answers[s.question.id]).length;
  const jump = (i: number) => {
    setIndex(i);
    setReviewing(false);
    window.scrollTo({ top: 0 });
  };

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-200 pb-4">
      <div>
        <p className="ts-eyebrow">Final assessment</p>
        <p className="mt-0.5 font-mono text-sm text-pine-950">
          {reviewing ? `${answered} of ${total} answered` : `Question ${index + 1} of ${total}`}
        </p>
      </div>
      <button
        type="button"
        onClick={onExit}
        className="rounded-sm text-sm font-medium text-ink-500 hover:text-pine-950 hover:underline"
        title="Nothing is scored until you submit."
      >
        Leave the attempt
      </button>
    </div>
  );

  if (reviewing) {
    const unanswered = total - answered;
    return (
      <div className="mx-auto w-full max-w-lesson flex-1 px-6 py-10">
        {header}
        <RiseIn className="mt-6">
          <div className="flex items-start gap-3">
            <ClipboardCheck className="mt-1 size-6 shrink-0 text-pine-700" strokeWidth={1.5} aria-hidden />
            <div>
              <h1 className="font-display text-2xl font-bold">Review before you submit</h1>
              <p className="mt-1 text-sm text-ink-500">
                Nothing is scored until you submit. Tap any row to change an answer.
              </p>
            </div>
          </div>
          <Card padding="none" className="mt-6 overflow-hidden">
            <ol>
              {slots.map((slot, i) => {
                const chosen = slot.options.find((o) => o.id === answers[slot.question.id]);
                return (
                  <li key={slot.question.id} className={i > 0 ? "border-t border-line-200" : ""}>
                    <button
                      type="button"
                      onClick={() => jump(i)}
                      className="grid w-full grid-cols-[2rem_1fr] items-baseline gap-x-3 px-5 py-3 text-left transition-colors duration-(--ts-dur-fast) hover:bg-moss-100"
                    >
                      <span className="font-mono text-xs text-ink-500">{i + 1}.</span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-pine-950">
                          {slot.question.prompt}
                        </span>
                        {chosen ? (
                          <span className="mt-0.5 block text-sm text-ink-500">{chosen.text}</span>
                        ) : (
                          <span className="mt-0.5 block text-sm font-medium text-clay-500">
                            Not answered yet
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </Card>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <Button variant="secondary" onClick={() => setReviewing(false)}>
              <ArrowLeft className="size-4" strokeWidth={2} aria-hidden />
              Back to the questions
            </Button>
            <div className="flex flex-col items-end gap-1.5">
              <Button
                size="l"
                disabled={unanswered > 0}
                loading={submit.isPending}
                onClick={() => submit.mutate()}
                iconLeft={<Send className="size-4" strokeWidth={1.5} aria-hidden />}
              >
                Submit for scoring
              </Button>
              {unanswered > 0 && (
                <p className="text-xs text-ink-500">
                  Answer the remaining {unanswered === 1 ? "question" : `${unanswered} questions`}{" "}
                  to submit.
                </p>
              )}
            </div>
          </div>
        </RiseIn>
      </div>
    );
  }

  const slot = slots[index];
  const moduleFacts = MODULE_FACTS.find((m) => m.id === slot.question.module);
  const chosenId = answers[slot.question.id];
  const last = index === total - 1;

  return (
    <div className="mx-auto w-full max-w-lesson flex-1 px-6 py-10">
      {header}
      <div className="mt-4 flex flex-col gap-3">
        <ProgressBar
          value={(answered / total) * 100}
          label={`${answered} of ${total} questions answered`}
        />
        <QuestionRail slots={slots} answers={answers} index={index} onJump={jump} />
      </div>

      <RiseIn key={slot.question.id} className="mt-6">
        {moduleFacts && (
          <p className="ts-eyebrow">
            Module {moduleFacts.order} · {moduleFacts.title}
          </p>
        )}
        <p className="mt-2 text-lg font-medium text-pine-950">{slot.question.prompt}</p>
        <div className="mt-4 flex flex-col gap-2" role="group" aria-label={slot.question.prompt}>
          {slot.options.map((option, i) => (
            <KnowledgeOption
              key={option.id}
              state={option.id === chosenId ? "selected" : "idle"}
              marker={MARKERS[i] ?? String(i + 1)}
              text={option.text}
              onSelect={() =>
                setAnswers((prev) => ({ ...prev, [slot.question.id]: option.id }))
              }
            />
          ))}
        </div>
      </RiseIn>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line-200 pt-5">
        <Button
          variant="ghost"
          disabled={index === 0}
          onClick={() => jump(index - 1)}
          iconLeft={<ArrowLeft className="size-4" strokeWidth={2} aria-hidden />}
        >
          Back
        </Button>
        <div className="flex flex-col items-end gap-1.5">
          {last ? (
            <Button size="l" onClick={() => setReviewing(true)}>
              Review your answers
              <ClipboardCheck className="ml-2 size-4" strokeWidth={1.5} aria-hidden />
            </Button>
          ) : (
            <Button
              size="l"
              disabled={!chosenId}
              onClick={() => jump(index + 1)}
              iconRight={<ArrowRight className="size-4" strokeWidth={2} aria-hidden />}
            >
              Next question
            </Button>
          )}
          {!chosenId && !last && (
            <p className="text-xs text-ink-500">Choose an answer to continue.</p>
          )}
        </div>
      </div>
    </div>
  );
}
