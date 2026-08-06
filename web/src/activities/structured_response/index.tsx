/* structured_response renderer (SPEC-007 §8): short written response against
 * visible criteria. Criteria render as chips that light via simple client
 * heuristics (length share + keyword presence) — coaching, not grading, and
 * never a gate. Submit needs only minLength; the exemplar (if present) then
 * appears as "One strong way to think about it" for self-comparison. Also the
 * inner component for checkpoint mode "structured_response" (§12).
 */
import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import type { ActivityProps, StructuredResponsePayload, WrittenResponseValue } from "../types";
import { Button } from "../../components/Button";
import { Textarea } from "../../components/Textarea";
import { BlazeMarker } from "../../components/BlazeMarker";
import { Markdown } from "../Markdown";
import { RiseIn } from "../motion";

/* ── Coverage heuristics ─────────────────────────────────────────────────── */

const STOPWORDS = new Set([
  "the", "and", "for", "not", "with", "this", "that", "each", "your", "you",
  "are", "was", "has", "have", "its", "one", "per", "any", "all", "but", "out",
  "what", "how", "why", "who", "when", "where", "from", "into", "than", "them",
  "they", "their", "there", "here", "would", "could", "should", "will", "can",
]);

/** Content-word prefixes (crude stems) drawn from the criterion's own text. */
function keywordsOf(criterion: string): string[] {
  return Array.from(
    new Set(
      criterion
        .toLowerCase()
        .replace(/[^a-z\s-]/g, " ")
        .split(/[\s-]+/)
        .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
        .map((w) => w.slice(0, 5)),
    ),
  );
}

/**
 * A criterion "lights" once the draft is long enough to plausibly reach it
 * (criteria light progressively as the response grows) AND echoes at least one
 * of the criterion's own content words. Deliberately generous — it nudges.
 */
function criterionLit(
  text: string,
  criterion: string,
  index: number,
  count: number,
  minLength: number,
): boolean {
  const trimmed = text.trim().toLowerCase();
  const lengthGate = Math.max(30, Math.round((minLength * (index + 1)) / (count + 1)));
  if (trimmed.length < lengthGate) return false;
  const keywords = keywordsOf(criterion);
  if (keywords.length === 0) return true;
  const hits = keywords.filter((k) => trimmed.includes(k)).length;
  return hits >= Math.min(2, keywords.length);
}

/* ── Renderer ────────────────────────────────────────────────────────────── */

export default function StructuredResponseActivity({ step, evidence, onEvidence }: ActivityProps) {
  const payload = step.payload as StructuredResponsePayload;
  const prior = (evidence?.value ?? null) as WrittenResponseValue | null;

  const [text, setText] = useState(prior?.text ?? "");
  const [submitted, setSubmitted] = useState(Boolean(evidence?.complete));
  const [revisit] = useState(Boolean(evidence?.complete));

  const length = text.trim().length;
  const longEnough = length >= payload.minLength;

  const litFlags = useMemo(
    () =>
      payload.criteria.map((criterion, i) =>
        criterionLit(text, criterion, i, payload.criteria.length, payload.minLength),
      ),
    [text, payload.criteria, payload.minLength],
  );
  const litCount = litFlags.filter(Boolean).length;

  const change = (next: string) => {
    setText(next);
    const trimmed = next.trim();
    onEvidence({
      kind: "written_response",
      value: { text: next },
      // Once submitted, edits keep completion as long as the floor holds.
      complete: submitted && trimmed.length >= payload.minLength,
    });
  };

  const submit = () => {
    if (!longEnough) return;
    setSubmitted(true);
    onEvidence({ kind: "written_response", value: { text }, complete: true });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg font-medium text-pine-950">
        <Markdown inline md={payload.prompt} />
      </p>

      {/* Criteria chips — coaching heuristics, never a gate. */}
      <section aria-label="What a strong response covers">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="ts-eyebrow">A strong response covers</p>
          <p className="font-mono text-xs text-ink-500" aria-live="polite">
            {litCount} of {payload.criteria.length} points touched
          </p>
        </div>
        <ul className="mt-2 flex flex-col gap-1.5">
          {payload.criteria.map((criterion, i) => {
            const lit = litFlags[i];
            return (
              <li
                key={criterion}
                className={`flex items-start gap-2.5 rounded-sm border px-3 py-2 text-sm transition-colors duration-(--ts-dur-base) ${
                  lit
                    ? "border-pine-300 bg-pine-300/15 text-pine-950"
                    : "border-line-200 bg-paper-0 text-ink-500"
                }`}
              >
                <BlazeMarker
                  state={lit ? "done" : "todo"}
                  size="m"
                  className="mt-1"
                  label={lit ? "Looks covered" : "Not detected yet"}
                />
                <span className="min-w-0">{criterion}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-1.5 text-xs text-ink-500">
          Chips light as your draft seems to touch each point — a nudge while you write, not a
          grade.
        </p>
      </section>

      <Textarea
        label="Your response"
        rows={7}
        value={text}
        placeholder={payload.placeholder}
        onChange={(e) => change(e.target.value)}
        hint={
          longEnough ? (
            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-pine-700">
              <BlazeMarker state="done" size="s" />
              Enough detail — submit when it says what you mean
            </span>
          ) : (
            <span className="font-mono text-xs">
              {length}/{payload.minLength} — keep going
            </span>
          )
        }
      />

      <div className="flex items-center gap-3">
        <Button
          onClick={submit}
          disabled={!longEnough || submitted}
          iconLeft={<Send className="size-4" strokeWidth={1.5} aria-hidden />}
        >
          {submitted ? "Response submitted" : "Submit response"}
        </Button>
      </div>

      {submitted && payload.exemplar && (
        <RiseIn delay={revisit ? 0 : 150}>
          <aside
            aria-label="One strong way to think about it"
            className="relative overflow-hidden rounded-md border border-line-200 bg-paper-0 p-5"
          >
            <span className="absolute inset-y-0 left-0 w-[3px] bg-sky-600" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-sky-600">
              One strong way to think about it
            </p>
            <Markdown md={payload.exemplar} className="mt-2.5 text-sm text-pine-950" />
            <p className="mt-3 text-xs italic text-ink-500">
              Compare, don't copy — yours counts because it's about your ride.
            </p>
          </aside>
        </RiseIn>
      )}
    </div>
  );
}
