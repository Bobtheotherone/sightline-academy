import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Compass, SendHorizonal } from "lucide-react";
import { api, ApiError, type TutorAskResponse } from "../lib/api";
import { useApiError } from "../lib/useApiError";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { SlotArt } from "../components/SlotArt";

const STARTER_PROMPTS = [
  "What should I check before every ride?",
  "Why can't I ride my ATV on paved roads?",
  "What gear actually matters, and why?",
];

const GROUNDING_LABEL = {
  curriculum: { dot: "bg-pine-700", text: "text-pine-700", label: "From the course" },
  mixed: { dot: "bg-clay-500", text: "text-clay-500", label: "Course + Ranger's knowledge" },
  general: {
    dot: "bg-sky-600",
    text: "text-sky-600",
    label: "Ranger's general knowledge — not covered in the course",
  },
} as const;

interface Turn {
  question: string;
  answer?: TutorAskResponse;
  failed?: boolean;
}

function RangerBubble({ turn }: { turn: Turn }) {
  if (turn.failed) {
    return (
      <div className="max-w-[92%] self-start rounded-md rounded-bl-[4px] border border-line-200 bg-moss-100 p-4">
        <p className="text-sm">That one took too long on my end. Ask again — I'm still here.</p>
      </div>
    );
  }
  if (!turn.answer) {
    return (
      <div
        className="flex items-center gap-1.5 self-start rounded-md rounded-bl-[4px] border border-line-200 bg-moss-100 px-4 py-3"
        role="status"
        aria-label="Ranger is thinking"
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-pulse rounded-full bg-ink-500"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </div>
    );
  }
  const grounding = GROUNDING_LABEL[turn.answer.grounding];
  return (
    <div className="max-w-[92%] self-start rounded-md rounded-bl-[4px] border border-line-200 bg-moss-100 p-4">
      <p className={`flex items-center gap-1.5 text-xs font-semibold ${grounding.text}`}>
        <span className={`size-2 rounded-full ${grounding.dot}`} aria-hidden />
        {grounding.label}
      </p>
      <p className="mt-2 text-sm whitespace-pre-wrap">{turn.answer.answerMarkdown}</p>
      {turn.answer.sources.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {turn.answer.sources.map((source) => (
            <span
              key={source.chunkId}
              className="rounded-sm border border-line-200 bg-paper-0 px-2 py-1 font-mono text-xs text-ink-500"
            >
              {source.title} · {source.moduleRef}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TutorPage() {
  const [message, setMessage] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const onApiError = useApiError();

  const ask = useMutation({
    mutationFn: (question: string) => api.tutorAsk({ message: question }),
    onMutate: (question) => setTurns((prev) => [...prev, { question }]),
    onSuccess: (answer) =>
      setTurns((prev) => prev.map((t, i) => (i === prev.length - 1 ? { ...t, answer } : t))),
    onError: (err, _question) => {
      setTurns((prev) => prev.map((t, i) => (i === prev.length - 1 ? { ...t, failed: true } : t)));
      if (!(err instanceof ApiError && err.status === 0)) onApiError(err);
    },
  });

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || ask.isPending) return;
    setMessage("");
    ask.mutate(trimmed);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    send(message);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-6">
      {/* Slim header */}
      <header className="flex items-center gap-2.5 border-b border-line-200 pb-4">
        <Compass className="size-5 text-sky-600" strokeWidth={1.5} aria-hidden />
        <h1 className="font-display text-lg font-bold">Ranger</h1>
        <span className="text-sm text-ink-500">Your safety tutor</span>
      </header>

      {/* Message list / first-run intro */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-6">
        {turns.length === 0 ? (
          <div className="my-auto">
            <EmptyState
              art={<SlotArt slot="empty-tutor" ratio="5 / 3" />}
              heading="Meet Ranger"
              body="Ask anything about ATV or road safety. Ranger knows this course inside out — and plenty beyond it, and will tell you which is which."
            />
          </div>
        ) : (
          turns.map((turn, i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="max-w-[85%] self-end rounded-md rounded-br-[4px] bg-pine-300/30 px-4 py-3 text-sm">
                {turn.question}
              </div>
              <RangerBubble turn={turn} />
            </div>
          ))
        )}
      </div>

      {/* Suggestions + composer */}
      <div className="border-t border-line-200 pt-4">
        {turns.length === 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => send(prompt)}
                className="rounded-sm border border-line-200 bg-paper-0 px-3 py-2 text-sm text-pine-950 transition-colors duration-(--ts-dur-fast) hover:border-pine-300 hover:bg-moss-100"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={submit} className="flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor="tutor-composer" className="sr-only">
              Ask Ranger a question
            </label>
            <textarea
              id="tutor-composer"
              rows={2}
              maxLength={2000}
              placeholder="Ask about machines, trails, weather, roads…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(message);
                }
              }}
              className="w-full resize-none rounded-sm border border-line-200 bg-paper-0 px-3 py-2.5 text-base placeholder:text-ink-500/70 transition-colors duration-(--ts-dur-fast) hover:border-pine-300 focus:border-pine-700"
            />
            <p className="mt-1 text-right font-mono text-xs text-ink-500">
              {message.length}/2000
            </p>
          </div>
          <Button
            type="submit"
            size="l"
            loading={ask.isPending}
            disabled={message.trim().length === 0}
            iconLeft={<SendHorizonal className="size-4" strokeWidth={1.5} aria-hidden />}
            className="mb-6"
          >
            Ask
          </Button>
        </form>
      </div>
    </div>
  );
}
