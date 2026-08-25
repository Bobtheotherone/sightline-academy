/* Sharp Round (DESIGN-004 §Play): a module's checkpoint questions, re-dealt as
 * a one-shot round. No clock, no retries — the game is precision, exactly the
 * skill the XP law rewards ("sharp first-try answers... never from speed").
 * The rail is a mini trail: every correct answer blazes the next waypoint.
 * Bests live locally; nothing touches the server.
 */
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { RotateCcw, X } from "lucide-react";
import { useSession } from "../../lib/session";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { BlazeMarker } from "../../components/BlazeMarker";
import { FeedbackStrip } from "../../components/FeedbackStrip";
import { CountUp } from "../../activities/motion";
import { Markdown } from "../../activities/Markdown";
import { CleanRun } from "../../activities/streak";
import { Skeleton, SkeletonGroup } from "../../components/Skeleton";
import { RangeHeader } from "./GamesPage";
import { loadBest, saveBest, useFieldPractice, type Best, type QuizQuestion } from "./data";

const ROUND_SIZE = 5;

function dealt<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, ROUND_SIZE);
}

export default function RoundPage() {
  const { moduleId = "" } = useParams();
  const { user } = useSession();
  const userId = user?.id ?? "anon";
  const { games } = useFieldPractice();
  const entry = games.find((g) => g.module.id === moduleId);

  const [deal, setDeal] = useState(0);
  // `deal` is the re-shuffle trigger: bumping it deals a fresh round.
  const round = useMemo(() => (entry?.quiz ? dealt(entry.quiz) : null), [entry?.quiz, deal]);

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [best, setBest] = useState<Best | null>(() =>
    moduleId ? loadBest(userId, `round:${moduleId}`) : null,
  );

  if (!entry || entry.module.locked) {
    return (
      <div className="mx-auto w-full max-w-lesson px-6 py-10">
        <RangeHeader title="Sharp round" sub="That module's games aren't unlocked yet." />
      </div>
    );
  }
  if (!round) {
    return (
      <div className="mx-auto w-full max-w-lesson px-6 py-10">
        <RangeHeader title="Sharp round" />
        <SkeletonGroup label="Dealing the round" className="mt-6 flex flex-col gap-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-32 w-full" />
        </SkeletonGroup>
      </div>
    );
  }

  const total = round.length;
  // Not "done" until the last feedback strip has been read and dismissed —
  // the pick locks in, but the teaching moment still gets its beat.
  const done = results.length === total && total > 0 && !picked;
  const score = results.filter(Boolean).length;
  const question: QuizQuestion | undefined = round[index];
  const gameId = `round:${entry.module.id}`;

  const pick = (optionId: string) => {
    if (picked || !question) return;
    setPicked(optionId);
    const correct = Boolean(question.options.find((o) => o.id === optionId)?.isBest);
    const nextResults = [...results, correct];
    setResults(nextResults);
    if (nextResults.length === total) {
      const run = nextResults.filter(Boolean).length;
      setBest(
        saveBest(userId, gameId, {
          score: run,
          total,
          clean: run === total,
          at: new Date().toISOString(),
        }),
      );
    }
  };

  const next = () => {
    setPicked(null);
    setIndex((i) => i + 1);
  };

  const again = () => {
    setResults([]);
    setIndex(0);
    setPicked(null);
    setDeal((d) => d + 1);
  };

  const pickedOption = picked && question
    ? question.options.find((o) => o.id === picked)
    : null;

  return (
    <div className="mx-auto w-full max-w-lesson px-6 py-10">
      <RangeHeader
        title={`Sharp round — ${entry.module.title}`}
        sub="One shot per question. No clock — sharp beats fast."
      />

      {/* The round's own trail: blazed where you were sharp. */}
      <div className="mt-5 flex items-center gap-2" aria-label="Round progress">
        {Array.from({ length: total }, (_, i) =>
          i < results.length && !results[i] ? (
            // A miss is its own mark — a padlock here would read as "locked".
            <span
              key={i}
              role="img"
              aria-label={`Question ${i + 1}: missed`}
              className="grid size-5 place-items-center rounded-full border border-sun-400/70 bg-sun-100"
            >
              <X className="size-3 text-pine-950/70" strokeWidth={2.5} aria-hidden />
            </span>
          ) : (
            <BlazeMarker
              key={i}
              size="m"
              state={
                i < results.length
                  ? "done"
                  : i === results.length && !done
                    ? "active"
                    : "todo"
              }
              label={
                i < results.length ? `Question ${i + 1}: sharp` : `Question ${i + 1}`
              }
            />
          ),
        )}
        <span className="ml-1 font-mono text-xs text-ink-500">
          {done ? `${score} of ${total}` : `${index + 1} of ${total}`}
        </span>
        {best && !done && (
          <span className="ml-auto font-mono text-xs text-ink-500">
            Best {best.score}/{best.total}
            {best.clean ? " · clean" : ""}
          </span>
        )}
      </div>

      {!done && question && (
        <Card padding="l" className="mt-5 rounded-lg">
          <p className="ts-eyebrow">{question.lessonTitle}</p>
          <h2 className="mt-1.5 font-display text-xl font-bold text-pine-950">
            {question.prompt}
          </h2>
          <ul className="mt-4 flex flex-col gap-2">
            {question.options.map((option) => {
              const isPicked = picked === option.id;
              const showTruth = Boolean(picked) && option.isBest;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    disabled={Boolean(picked)}
                    onClick={() => pick(option.id)}
                    className={`flex min-h-11 w-full items-start gap-2.5 rounded-sm border px-3.5 py-2.5 text-left text-sm transition-all duration-(--ts-dur-fast) ${
                      showTruth
                        ? "border-pine-700 bg-pine-300/15 text-pine-950"
                        : isPicked
                          ? "border-sun-400 bg-sun-100 text-pine-950"
                          : picked
                            ? "border-line-200 bg-paper-0 text-ink-500"
                            : "cursor-pointer border-line-200 bg-paper-0 text-pine-950 hover:-translate-y-0.5 hover:border-pine-300 active:scale-[0.98]"
                    }`}
                  >
                    <span className="min-w-0 flex-1">{option.text}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {pickedOption && (
            <div className="mt-4 flex flex-col gap-3">
              <FeedbackStrip
                tone={pickedOption.isBest ? "positive" : "caution"}
                label={pickedOption.isBest ? "Sharp" : "Not this one"}
              >
                <Markdown md={pickedOption.feedback} />
              </FeedbackStrip>
              <Button className="self-end" onClick={next}>
                {index + 1 === total ? "See the round" : "Next question"}
              </Button>
            </div>
          )}
        </Card>
      )}

      {done && (
        <div className="mt-5 flex flex-col gap-4">
          {score === total && (
            <CleanRun
              label="A clean round"
              detail={`All ${total}, one shot each — that's the judgment the trail wants.`}
              artSlot="moment-perfect-round"
            />
          )}
          <Card padding="l" className="rounded-lg text-center">
            <p className="ts-eyebrow">Round complete</p>
            <p className="mt-2 font-display text-4xl font-extrabold text-pine-950">
              <CountUp value={score} className="tabular-nums" />
              <span className="text-ink-500"> / {total}</span>
            </p>
            <p className="mt-2 text-sm text-ink-500">
              {best && (best.score > score || (best.score === score && best.clean && score !== total))
                ? `Your best is ${best.score}/${best.total}${best.clean ? " clean" : ""} — it stands.`
                : score === total
                  ? "A new bar. It'll be waiting next time."
                  : entry.quiz && entry.quiz.length > total
                    ? "Every re-deal draws fresh questions from the module."
                    : "Same questions, same standard — run it until it's clean."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button
                onClick={again}
                iconLeft={<RotateCcw className="size-4" strokeWidth={1.5} aria-hidden />}
              >
                Run it again
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
