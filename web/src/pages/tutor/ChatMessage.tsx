/* Presentational pieces of the Ranger chat surface (DESIGN-002 §Tutor):
 * ChatMessage (user right / ranger left with hat-glyph avatar), GroundingLabel
 * (the three exact label texts), SourceChips (deep-link to /course/:moduleId),
 * the triage treatment, and the three-dot typing bubble.
 */
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Markdown } from "../../activities/Markdown";
import { useEntered, useReducedMotion } from "../../activities/motion";
import { Button } from "../../components/Button";
import { Glyph } from "../../components/Glyph";
import type { SourceRef } from "../../lib/api";

/** Ranger's bubble surface: raised paper, no hairline — elevation carries it. */
const BUBBLE = "rounded-md rounded-bl-[4px] bg-paper-50 shadow-1";

/**
 * The v2 message entrance (DESIGN-004 §6): 8px rise + fade, once, when the
 * bubble mounts — messages are keyed by id, so a settled one never replays it.
 * Reduced motion paints the settled state on the first frame.
 */
function useMessageRise(): string {
  const reduced = useReducedMotion();
  const entered = useEntered();
  return `transition-[opacity,translate] duration-(--ts-dur-base) ease-(--ts-ease-out) ${
    reduced || entered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
  }`;
}

/** The ranger-hat glyph avatar (flat vector per DESIGN-001). */
export function RangerAvatar() {
  return (
    <span
      className="mt-1 grid size-8 shrink-0 place-items-center rounded-full border border-sky-600/30 bg-sky-600/10"
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-5 text-sky-600" fill="none">
        <path
          d="M8 14.5 C8 9.5 9.6 6.5 12 6.5 C14.4 6.5 16 9.5 16 14.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <ellipse cx="12" cy="15.5" rx="9" ry="2.8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 13.2 h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/** DESIGN-002 GroundingLabel — dot + exact label text per grounding. */
export function GroundingLabel({ grounding }: { grounding: string }) {
  if (grounding === "curriculum") {
    return (
      <p className="flex items-center gap-1.5 text-xs font-semibold text-pine-700">
        <span className="size-2 rounded-full bg-pine-700" aria-hidden />
        From the course
      </p>
    );
  }
  if (grounding === "mixed") {
    return (
      <p className="flex items-center gap-1.5 text-xs font-semibold text-pine-700">
        <span
          className="size-2 rounded-full border border-pine-700"
          style={{ background: "linear-gradient(90deg, var(--ts-pine-700) 50%, transparent 50%)" }}
          aria-hidden
        />
        Course + Ranger's knowledge
      </p>
    );
  }
  if (grounding === "general") {
    return (
      <p className="flex items-center gap-1.5 text-xs font-semibold text-sky-600">
        <span className="size-2 rounded-full bg-sky-600" aria-hidden />
        Ranger's general knowledge — not covered in the course
      </p>
    );
  }
  return null;
}

const MODULE_REF_RE = /^m(\d)-/;

function moduleLabel(moduleRef: string): string {
  const match = MODULE_REF_RE.exec(moduleRef);
  return match ? `Module ${match[1]}` : "";
}

/* Corpus topic marks (VISUAL_ASSETS B-036…B-042). TutorSource carries no
 * topic field, but every chunk id in content/corpus/ is `<topic>-<slug>` and
 * its frontmatter `topic:` matches that prefix for all 33 chunks — so the
 * prefix is the topic. Anything outside the seven renders no glyph. */
const TOPICS = new Set([
  "mindset",
  "machine",
  "gear",
  "terrain",
  "environment",
  "roads",
  "general",
]);

function topicGlyph(chunkId: string): string | null {
  const prefix = chunkId.split("-")[0];
  return TOPICS.has(prefix) ? `topic-${prefix}` : null;
}

/** The leading topic mark on a source chip; nothing for an unknown prefix. */
function TopicMark({ chunkId }: { chunkId: string }) {
  const name = topicGlyph(chunkId);
  return name ? <Glyph name={name} size={16} className="text-pine-700" /> : null;
}

/** SourceChips row — chunk title + module ref, chip links to /course/:moduleId. */
export function SourceChips({ sources }: { sources: SourceRef[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {sources.map((source) =>
        source.moduleRef ? (
          <Link
            key={source.chunkId}
            to={`/course/${source.moduleRef}`}
            className="inline-flex items-center gap-1.5 rounded-sm border border-line-200 bg-moss-100 px-2 py-1 text-xs text-pine-950 transition-colors duration-(--ts-dur-fast) hover:border-pine-300 hover:bg-pine-300/25"
          >
            <TopicMark chunkId={source.chunkId} />
            {source.title}
            <span className="font-mono text-[11px] text-pine-700">{moduleLabel(source.moduleRef)}</span>
          </Link>
        ) : (
          <span
            key={source.chunkId}
            className="inline-flex items-center gap-1.5 rounded-sm border border-line-200 bg-moss-100 px-2 py-1 text-xs text-ink-500"
          >
            <TopicMark chunkId={source.chunkId} />
            {source.title}
          </span>
        ),
      )}
    </div>
  );
}

/** Ranger-voice eyebrow for triage answers — a boundary, never a scold. */
const TRIAGE_EYEBROW: Record<string, string> = {
  self_harm: "Here for you",
  stunt_technique: "Not something I coach",
  impaired_riding: "Hard line",
  medical: "One for the professionals",
  legal_specific: "Rules vary by place",
  minor_unsupervised: "Ride with your supervisor",
  prompt_injection: "Still Ranger",
};

function TriageEyebrow({ category }: { category: string }) {
  return (
    <p className="flex items-center gap-1.5 text-xs font-semibold text-sun-400 brightness-75">
      <ShieldCheck className="size-3.5" strokeWidth={2} aria-hidden />
      {TRIAGE_EYEBROW[category] ?? "Trail boundary"}
    </p>
  );
}

function timeLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** Three-dot ranger typing bubble (DESIGN-004 §6). */
export function TypingBubble() {
  return (
    <div className="flex items-start gap-2.5 self-start">
      <RangerAvatar />
      <div
        className={`flex items-center gap-1.5 px-4 py-3.5 ${BUBBLE}`}
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
    </div>
  );
}

export interface ChatMessageProps {
  role: "user" | "assistant";
  markdown: string;
  /** curriculum | mixed | general | triage | none (null on user turns). */
  grounding: string | null;
  sources: SourceRef[];
  triageCategory: string | null;
  timestamp: string;
  /** Failed asks render the DESIGN-005 error copy with a retry button. */
  failed?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
}

/** One message bubble — user right (pine tint) / ranger left (paper card). */
export function ChatMessage({
  role,
  markdown,
  grounding,
  sources,
  triageCategory,
  timestamp,
  failed = false,
  errorMessage,
  onRetry,
}: ChatMessageProps) {
  const rise = useMessageRise();

  if (role === "user") {
    return (
      <div className={`group flex max-w-[85%] flex-col items-end gap-1 self-end ${rise}`}>
        <div className="rounded-md rounded-br-[4px] bg-pine-300/30 px-4 py-3 text-sm whitespace-pre-wrap">
          {markdown}
        </div>
        <time className="pr-1 text-[11px] text-ink-500 opacity-0 transition-opacity duration-(--ts-dur-fast) group-hover:opacity-100">
          {timeLabel(timestamp)}
        </time>
      </div>
    );
  }

  if (failed) {
    return (
      <div className={`flex max-w-[92%] items-start gap-2.5 self-start ${rise}`}>
        <RangerAvatar />
        <div className={`p-4 ${BUBBLE}`}>
          <p className="text-sm">{errorMessage}</p>
          {onRetry && (
            <Button variant="secondary" size="s" className="mt-3" onClick={onRetry}>
              Ask again
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex w-full max-w-[92%] items-start gap-2.5 self-start ${rise}`}>
      <RangerAvatar />
      <div className="flex min-w-0 flex-col gap-1">
        <div className={`p-4 ${BUBBLE}`}>
          {triageCategory ? (
            <TriageEyebrow category={triageCategory} />
          ) : (
            grounding && <GroundingLabel grounding={grounding} />
          )}
          <Markdown md={markdown} className="mt-2 text-sm" />
          <SourceChips sources={sources} />
        </div>
        <time className="pl-1 text-[11px] text-ink-500 opacity-0 transition-opacity duration-(--ts-dur-fast) group-hover:opacity-100">
          {timeLabel(timestamp)}
        </time>
      </div>
    </div>
  );
}
