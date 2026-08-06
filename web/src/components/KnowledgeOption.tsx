import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { BlazeMarker } from "./BlazeMarker";

export type KnowledgeOptionState = "idle" | "selected" | "best" | "not-best";

const CARD: Record<KnowledgeOptionState, string> = {
  idle: "border-line-200 bg-paper-0",
  selected: "border-pine-700 bg-paper-0",
  best: "border-pine-700 bg-pine-300/15",
  "not-best": "border-sun-400 bg-sun-400/10",
};

/**
 * Multiple-choice option card (DESIGN-002): four states with inline authored
 * feedback reveal. The card is a div and the option itself a button so the
 * revealed feedback never sits inside interactive content.
 */
export function KnowledgeOption({
  state,
  marker,
  text,
  feedback,
  disabled = false,
  onSelect,
}: {
  state: KnowledgeOptionState;
  /** Option ordinal shown in the mono marker, e.g. "A". */
  marker: string;
  text: string;
  /** Inline authored feedback, revealed for the selected option. */
  feedback?: ReactNode;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const stateLabel =
    state === "best" ? "Best answer" : state === "not-best" ? "Worth another look" : null;
  return (
    <div
      className={`overflow-hidden rounded-sm border transition-colors duration-(--ts-dur-fast) ${CARD[state]}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        aria-pressed={state !== "idle"}
        className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-all duration-(--ts-dur-fast) ${
          disabled
            ? state === "idle"
              ? "opacity-55"
              : ""
            : "hover:bg-moss-100 active:scale-[0.99]"
        }`}
      >
        <span
          className={`mt-0.5 inline-grid size-6 shrink-0 place-items-center rounded-sm border font-mono text-xs font-medium ${
            state === "best"
              ? "border-pine-700 bg-pine-700 text-paper-0"
              : state === "not-best"
                ? "border-sun-400 bg-sun-400/20 text-pine-950"
                : "border-line-200 text-ink-500"
          }`}
          aria-hidden
        >
          {marker}
        </span>
        <span className="min-w-0 flex-1 text-base text-pine-950">{text}</span>
        {state === "best" && <BlazeMarker state="done" size="m" className="mt-1" label="Best answer" />}
        {state === "not-best" && (
          <AlertTriangle
            className="mt-1 size-4 shrink-0 text-sun-400"
            strokeWidth={2}
            aria-hidden
          />
        )}
      </button>
      {feedback && (
        <div className="border-t border-line-200/70 px-4 py-3 text-sm text-pine-950">
          {stateLabel && <p className="font-semibold">{stateLabel}</p>}
          <div className={stateLabel ? "mt-0.5" : ""}>{feedback}</div>
        </div>
      )}
    </div>
  );
}
