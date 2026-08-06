/* The shared Ranger chat surface (SPEC-008 §UI): used by the /tutor page and
 * the AppShell slide-over. History loads on open (['tutor','history']); asks go
 * through POST /tutor/ask with the lesson context when opened from a lesson.
 */
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CloudOff, Compass, Info, MoreVertical, SendHorizonal } from "lucide-react";
import { api, ApiError, type SourceRef, type TutorAskResponse } from "../../lib/api";
import { useApiError } from "../../lib/useApiError";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { Modal } from "../../components/Modal";
import { Popover } from "../../components/Popover";
import { Skeleton, SkeletonGroup } from "../../components/Skeleton";
import { SlotArt } from "../../components/SlotArt";
import { ChatMessage, GroundingLabel, TypingBubble } from "./ChatMessage";

/** DESIGN-005 final copy. */
const TIMEOUT_COPY = "That one took too long on my end. Ask again — I'm still here.";
const MEET_RANGER_BODY =
  "Ask anything about ATV or road safety. Ranger knows this course inside out — and plenty beyond it, and will tell you which is which.";

/** History message as the wire actually sends it (api.ts's TutorMessageOut plus
 * the server-resolved sourceRefs chip data and the wider grounding values). */
interface HistoryMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  grounding: string;
  sourceRefs?: SourceRef[];
  triageCategory: string | null;
  createdAt: string;
}

interface LiveTurn {
  key: string;
  question: string;
  askedAt: string;
  status: "pending" | "done" | "failed";
  answer?: TutorAskResponse;
  answeredAt?: string;
  errorMessage?: string;
}

function OfflineBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-sun-400/60 bg-sun-400/15 px-2.5 py-1 text-xs font-medium text-pine-950">
      <CloudOff className="size-3.5 text-sun-400 brightness-75" strokeWidth={2} aria-hidden />
      Ranger is in offline mode
    </span>
  );
}

const ICON_BUTTON =
  "grid size-8 place-items-center rounded-sm text-ink-500 transition-colors duration-(--ts-dur-fast) hover:bg-moss-100 hover:text-pine-950";

function OverflowMenu({ onClear }: { onClear: () => void }) {
  return (
    <Popover
      trigger={
        <button type="button" aria-label="Conversation options" className={ICON_BUTTON}>
          <MoreVertical className="size-4" strokeWidth={1.5} aria-hidden />
        </button>
      }
      className="w-52"
    >
      <button
        type="button"
        onClick={onClear}
        className="w-full rounded-sm px-3 py-2 text-left text-sm font-medium text-danger-600 transition-colors duration-(--ts-dur-fast) hover:bg-moss-100"
      >
        Clear conversation
      </button>
    </Popover>
  );
}

function LegendPopover() {
  return (
    <Popover
      trigger={
        <button type="button" aria-label="What the grounding labels mean" className={ICON_BUTTON}>
          <Info className="size-4" strokeWidth={1.5} aria-hidden />
        </button>
      }
      className="w-80"
    >
      <p className="px-1 pt-0.5 pb-2 text-xs font-semibold text-ink-500">
        Every answer says where it comes from
      </p>
      <div className="flex flex-col gap-2 px-1 pb-1">
        <GroundingLabel grounding="curriculum" />
        <GroundingLabel grounding="mixed" />
        <GroundingLabel grounding="general" />
      </div>
    </Popover>
  );
}

export default function TutorChat({
  variant = "page",
  lessonId,
  className = "",
}: {
  variant?: "page" | "slideOver";
  /** Set when opened from /learn/* so answers can reference "this lesson". */
  lessonId?: string;
  className?: string;
}) {
  const [message, setMessage] = useState("");
  const [turns, setTurns] = useState<LiveTurn[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const seq = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const onApiError = useApiError();

  const historyQuery = useQuery({
    queryKey: ["tutor", "history"],
    queryFn: api.tutorHistory,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
  const suggestedQuery = useQuery({
    queryKey: ["tutor", "suggested"],
    queryFn: api.tutorSuggested,
    staleTime: 60_000,
  });
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: api.health,
    staleTime: 60_000,
  });
  const offline = healthQuery.data?.provider === "extractive";

  const ask = useMutation({
    mutationFn: (turn: { key: string; question: string }) =>
      api.tutorAsk(lessonId ? { message: turn.question, lessonId } : { message: turn.question }),
    onMutate: (turn) =>
      setTurns((prev) => {
        const retrying = prev.some((t) => t.key === turn.key);
        const fresh: LiveTurn = {
          key: turn.key,
          question: turn.question,
          askedAt: new Date().toISOString(),
          status: "pending",
        };
        return retrying ? prev.map((t) => (t.key === turn.key ? fresh : t)) : [...prev, fresh];
      }),
    onSuccess: (answer, turn) =>
      setTurns((prev) =>
        prev.map((t) =>
          t.key === turn.key
            ? { ...t, status: "done", answer, answeredAt: new Date().toISOString() }
            : t,
        ),
      ),
    onError: (err, turn) =>
      setTurns((prev) =>
        prev.map((t) =>
          t.key === turn.key
            ? {
                ...t,
                status: "failed",
                errorMessage: err instanceof ApiError ? err.message : TIMEOUT_COPY,
              }
            : t,
        ),
      ),
  });

  const clear = useMutation({
    mutationFn: api.clearTutorHistory,
    onSuccess: () => {
      queryClient.setQueryData(["tutor", "history"], { messages: [] });
      setTurns([]);
      setConfirmOpen(false);
    },
    onError: onApiError,
  });

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || ask.isPending) return;
    setMessage("");
    ask.mutate({ key: `turn-${++seq.current}`, question: trimmed });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    send(message);
  };

  const history = useMemo(
    () => (historyQuery.data?.messages ?? []) as unknown as HistoryMessage[],
    [historyQuery.data],
  );
  // A refetch can already include turns this instance asked — drop the local copy.
  const historyIds = useMemo(() => new Set(history.map((m) => m.id)), [history]);
  const liveTurns = turns.filter((t) => !(t.answer && historyIds.has(t.answer.id)));

  const lastAnswer = [...liveTurns].reverse().find((t) => t.answer)?.answer;
  const suggestions = lastAnswer?.suggestions.length
    ? lastAnswer.suggestions
    : (suggestedQuery.data?.prompts ?? []);

  const isEmpty = !historyQuery.isPending && history.length === 0 && liveTurns.length === 0;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [history.length, turns]);

  const promptButton =
    "rounded-sm border border-line-200 bg-paper-0 px-3 py-2 text-left text-sm text-pine-950 transition-colors duration-(--ts-dur-fast) hover:border-pine-300 hover:bg-moss-100 disabled:opacity-55";

  return (
    <div className={`flex min-h-0 flex-col ${variant === "slideOver" ? "h-full" : ""} ${className}`}>
      {variant === "page" ? (
        <header className="flex flex-wrap items-center gap-2.5 border-b border-line-200 pb-4">
          <Compass className="size-5 text-sky-600" strokeWidth={1.5} aria-hidden />
          <h1 className="font-display text-lg font-bold">Ranger</h1>
          <span className="hidden text-sm text-ink-500 sm:inline">Your safety tutor</span>
          {offline && <OfflineBadge />}
          <div className="ml-auto flex items-center gap-1">
            <LegendPopover />
            <OverflowMenu onClear={() => setConfirmOpen(true)} />
          </div>
        </header>
      ) : (
        <div className="flex items-center gap-2 border-b border-line-200 px-4 py-2">
          {offline && <OfflineBadge />}
          {lessonId && (
            <span className="truncate text-xs text-ink-500">Asking from this lesson</span>
          )}
          <div className="ml-auto flex items-center gap-1">
            <LegendPopover />
            <OverflowMenu onClear={() => setConfirmOpen(true)} />
          </div>
        </div>
      )}

      <div
        ref={listRef}
        className={`flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-5 ${variant === "slideOver" ? "px-4" : ""}`}
      >
        {historyQuery.isPending ? (
          <SkeletonGroup label="Loading your conversation" className="flex flex-col gap-4">
            <Skeleton className="h-16 w-3/5 self-end rounded-md" />
            <Skeleton className="h-28 w-4/5 self-start rounded-md" />
          </SkeletonGroup>
        ) : isEmpty ? (
          <div className="my-auto">
            <EmptyState
              art={<SlotArt slot="empty-tutor" ratio="5 / 3" />}
              heading="Meet Ranger"
              body={MEET_RANGER_BODY}
              action={
                <div className="flex max-w-md flex-col gap-2">
                  {(suggestedQuery.data?.prompts ?? []).map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      disabled={ask.isPending}
                      onClick={() => send(prompt)}
                      className={promptButton}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              }
            />
          </div>
        ) : (
          <>
            {history.map((m) => (
              <ChatMessage
                key={m.id}
                role={m.role}
                markdown={m.content}
                grounding={m.grounding}
                sources={m.sourceRefs ?? []}
                triageCategory={m.triageCategory}
                timestamp={m.createdAt}
              />
            ))}
            {liveTurns.map((t) => (
              <div key={t.key} className="flex flex-col gap-4">
                <ChatMessage
                  role="user"
                  markdown={t.question}
                  grounding={null}
                  sources={[]}
                  triageCategory={null}
                  timestamp={t.askedAt}
                />
                {t.status === "pending" && <TypingBubble />}
                {t.status === "failed" && (
                  <ChatMessage
                    role="assistant"
                    markdown=""
                    grounding={null}
                    sources={[]}
                    triageCategory={null}
                    timestamp={t.askedAt}
                    failed
                    errorMessage={t.errorMessage ?? TIMEOUT_COPY}
                    onRetry={() => ask.mutate({ key: t.key, question: t.question })}
                  />
                )}
                {t.answer && (
                  <ChatMessage
                    role="assistant"
                    markdown={t.answer.answerMarkdown}
                    grounding={t.answer.grounding}
                    sources={t.answer.sources}
                    triageCategory={t.answer.triage?.category ?? null}
                    timestamp={t.answeredAt ?? t.askedAt}
                  />
                )}
              </div>
            ))}
          </>
        )}
      </div>

      <div className={`border-t border-line-200 pt-3 ${variant === "slideOver" ? "px-4 pb-4" : ""}`}>
        {!isEmpty && suggestions.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {suggestions.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={ask.isPending}
                onClick={() => send(prompt)}
                className={promptButton}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={submit} className="flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor={`tutor-composer-${variant}`} className="sr-only">
              Ask Ranger a question
            </label>
            <textarea
              id={`tutor-composer-${variant}`}
              rows={2}
              maxLength={2000}
              placeholder={
                ask.isPending
                  ? "Ranger is answering — hang tight…"
                  : "Ask about machines, trails, weather, roads…"
              }
              disabled={ask.isPending}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(message);
                }
              }}
              className="w-full resize-none rounded-sm border border-line-200 bg-paper-0 px-3 py-2.5 text-base placeholder:text-ink-500/70 transition-colors duration-(--ts-dur-fast) hover:border-pine-300 focus:border-pine-700 disabled:opacity-55"
            />
            <p className="mt-1 text-right font-mono text-xs text-ink-500">{message.length}/2000</p>
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

      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Clear this conversation?"
        description="This wipes your chat with Ranger. Your course progress and journal aren't touched."
      >
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
            Keep it
          </Button>
          <Button variant="danger" loading={clear.isPending} onClick={() => clear.mutate()}>
            Clear conversation
          </Button>
        </div>
      </Modal>
    </div>
  );
}
