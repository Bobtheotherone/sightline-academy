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
import { Card } from "../../components/Card";
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
  /** Tokens streamed so far (SPEC-008 R5.6) — rendered into the pending ranger
   * bubble; grounding/sources/suggestions attach when the meta event lands. */
  streamText?: string;
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

/** Loading mirrors the settled conversation (DESIGN-005 §Loading): alternating
 * turns with the avatar, answer card and source-chip geometry already in place,
 * so the column carries the same density it will hand off to. */
function ConversationSkeleton({ className = "" }: { className?: string }) {
  return (
    <SkeletonGroup label="Loading your conversation" className={`flex flex-col gap-6 ${className}`}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-4">
          <Skeleton
            className={`h-12 rounded-md rounded-br-[4px] self-end ${i === 1 ? "w-2/5" : "w-3/5"}`}
          />
          <div className="flex w-[92%] items-start gap-2.5 self-start">
            <Skeleton className="mt-1 size-8 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className={`w-full rounded-md rounded-bl-[4px] ${i === 1 ? "h-24" : "h-32"}`} />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-40 rounded-sm" />
                <Skeleton className="h-6 w-28 rounded-sm" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </SkeletonGroup>
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
  const composerRef = useRef<HTMLTextAreaElement>(null);
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
    // Streaming first (POST /tutor/ask/stream): tokens append into the pending
    // bubble as they arrive. Transport/parse failures fall back silently to
    // plain POST /ask; server-reported errors surface through onError as usual.
    mutationFn: async (turn: { key: string; question: string }) => {
      const body = lessonId
        ? { message: turn.question, lessonId }
        : { message: turn.question };
      try {
        return await api.tutorAskStream(body, (token) =>
          setTurns((prev) =>
            prev.map((t) =>
              t.key === turn.key ? { ...t, streamText: (t.streamText ?? "") + token } : t,
            ),
          ),
        );
      } catch (err) {
        if (err instanceof ApiError && err.status > 0) throw err;
        return api.tutorAsk(body);
      }
    },
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
            ? {
                ...t,
                status: "done",
                answer,
                streamText: undefined,
                answeredAt: new Date().toISOString(),
              }
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
    // The CTA stays in its live treatment (aria-disabled, not disabled) so the
    // tutor's primary action never reads dead — an empty ask just asks for text.
    if (!message.trim()) {
      composerRef.current?.focus();
      return;
    }
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
    const list = listRef.current;
    if (!list) return;
    if (list.scrollHeight > list.clientHeight) {
      list.scrollTo({ top: list.scrollHeight });
      return;
    }
    // Below lg the page column flows in the document (no internal scroller), so
    // the page itself has to follow the conversation down.
    if (variant === "page" && history.length + turns.length > 0) {
      window.scrollTo({ top: document.documentElement.scrollHeight });
    }
  }, [history.length, turns, variant]);

  // Suggestion chips are pill buttons in v2 (DESIGN-002): raised, hover lifts.
  const promptButton =
    "rounded-pill border border-line-200 bg-paper-50 px-4 py-2 text-left text-sm text-pine-950 shadow-1 transition-all duration-(--ts-dur-fast) ease-(--ts-ease-out) hover:-translate-y-[2px] hover:border-pine-300 hover:shadow-2 disabled:opacity-55";

  return (
    <div className={`flex min-h-0 flex-col ${variant === "slideOver" ? "h-full" : ""} ${className}`}>
      {variant === "page" ? (
        <header className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-line-200 pb-4">
          <Compass className="size-5 text-sky-600" strokeWidth={1.5} aria-hidden />
          <h1 className="font-display text-lg font-bold">Ranger</h1>
          <span className="hidden text-sm text-ink-500 sm:inline">Your safety tutor</span>
          {/* Below sm the badge takes the second row on its own — the actions
              stay on the title row instead of orphaning one there. */}
          {offline && (
            <span className="order-last flex w-full sm:order-none sm:w-auto">
              <OfflineBadge />
            </span>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-1">
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
        className={`flex flex-col gap-4 py-5 ${
          variant === "slideOver"
            ? "min-h-0 flex-1 overflow-y-auto px-4"
            : "lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
        }`}
      >
        {historyQuery.isPending ? (
          <ConversationSkeleton className="flex-1" />
        ) : isEmpty ? (
          /* The first run lands on a sheet, not on the page's bare contour
             wash: the plate paints its own paper ground, which on the texture
             reads as a lighter rectangle floating behind the art (DESIGN-006
             "art is staged, not boxed"). Every other empty surface in the app
             already stages inside a Card; the tutor page was one of two that
             didn't. The card's own padding is EmptyState's. */
          <div className="my-auto">
            <Card padding="none" className="rounded-lg">
              <EmptyState
                art={<SlotArt slot="empty-tutor" ratio="5 / 3" className="shadow-1" />}
                heading="Meet Ranger"
                body={MEET_RANGER_BODY}
                action={
                  <div className="flex max-w-lg flex-wrap justify-center gap-2">
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
            </Card>
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
                {t.status === "pending" &&
                  (t.streamText ? (
                    <ChatMessage
                      role="assistant"
                      markdown={t.streamText}
                      grounding={null}
                      sources={[]}
                      triageCategory={null}
                      timestamp={t.askedAt}
                    />
                  ) : (
                    <TypingBubble />
                  ))}
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

      {/* Composer: sticky translucent chrome (DESIGN-003 §Tutor) so the
          conversation scrolls under it instead of ending in a hard edge. On the
          page it is a raised band — rounded top, shadow-2 — so the contour
          ground reads as continuous behind it rather than sliced by a slab; it
          clears the mobile tab bar until lg retires it.

          The band is offset 56px (the tab bar's minimum row height) and pays
          the difference back as bottom padding: the visible content sits where
          a 64px offset would put it, but the chrome runs past the bar's top
          edge instead of stopping short of it, so no strip of transcript can
          show between the two whatever the bar's real height turns out to be. */}
      <div
        className={`sticky z-10 border-t border-line-200 bg-paper-0/85 pt-3 backdrop-blur-chrome ${
          variant === "slideOver"
            ? "bottom-0 px-4 pb-4"
            : "bottom-14 rounded-t-lg px-4 pb-7 shadow-2 lg:bottom-0 lg:pb-5"
        }`}
      >
        {!isEmpty && suggestions.length > 0 && (
          /* Below sm the strip is one horizontally-scrollable row: wrapped, each
             pill claimed a full-width line and the dock grew past 44% of a phone
             screen, guillotining Ranger's answer at ~5 lines. The negative margin
             lets it scroll edge to edge under the band's padding; the -my/py pair
             keeps the box the same height while leaving the pills' hover lift and
             shadow room inside the scroller. From sm it wraps exactly as before. */
          <div className="mb-3 flex flex-wrap gap-2 max-sm:-mx-4 max-sm:-my-1 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:px-4 max-sm:py-1 max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden max-sm:[&>button]:shrink-0 max-sm:[&>button]:whitespace-nowrap">
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
        {/* Below sm the CTA takes its own row: side by side it squeezed the
            field to ~180px, where the placeholder wrapped past the two rows the
            box is tall and got sliced by its bottom edge. */}
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:flex-1">
            <label htmlFor={`tutor-composer-${variant}`} className="sr-only">
              Ask Ranger a question
            </label>
            <textarea
              id={`tutor-composer-${variant}`}
              ref={composerRef}
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
              className="max-h-40 min-h-[4.375rem] w-full resize-none field-sizing-content rounded-sm border border-line-200 bg-paper-0 px-3 py-2.5 text-base placeholder:text-ink-500/70 transition-colors duration-(--ts-dur-fast) hover:border-pine-300 focus:border-pine-700 disabled:opacity-55"
            />
            {/* Below sm the counter earns its 24px row only once there is
                something to count — the dock already owns too much of the
                screen for an idle 0/2000 to cost the transcript a line. */}
            <p
              className={`mt-1 text-right font-mono text-xs text-ink-500 ${
                message.length === 0 ? "max-sm:hidden" : ""
              }`}
            >
              {message.length}/2000
            </p>
          </div>
          <Button
            type="submit"
            size="l"
            loading={ask.isPending}
            aria-disabled={message.trim().length === 0}
            iconLeft={<SendHorizonal className="size-4" strokeWidth={1.5} aria-hidden />}
            className="w-full sm:mb-6 sm:w-auto"
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
