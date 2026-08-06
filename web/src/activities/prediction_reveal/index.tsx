/* prediction_reveal renderer (SPEC-007 §2): commit → locked-in state → the
 * reveal. Per DESIGN-004 moment 4, the per-option response unmasks first and
 * the general reveal fades in 200ms later. No right/wrong framing anywhere —
 * predictions are honored, not graded.
 */
import { useState } from "react";
import { Lock } from "lucide-react";
import type { ActivityProps, PredictionRevealPayload, PredictionValue } from "../types";
import { Card } from "../../components/Card";
import { BlazeMarker } from "../../components/BlazeMarker";
import { Markdown } from "../Markdown";
import { Unmask, useEntered } from "../motion";

export default function PredictionRevealActivity({
  step,
  evidence,
  onEvidence,
}: ActivityProps) {
  const payload = step.payload as PredictionRevealPayload;
  const prior = (evidence?.value ?? null) as PredictionValue | null;
  const [chosenId, setChosenId] = useState<string | null>(prior?.optionId ?? null);
  /** Revisit mode renders the reveal without re-running the choreography. */
  const [instant] = useState(Boolean(prior));

  const choose = (optionId: string) => {
    if (chosenId) return;
    setChosenId(optionId);
    onEvidence({ kind: "prediction", value: { optionId }, complete: true });
  };

  const chosen = payload.options.find((o) => o.id === chosenId);
  const perOption = chosenId ? payload.reveal.perOption[chosenId] : undefined;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-lg font-medium text-pine-950">{payload.question}</p>

      <div role="radiogroup" aria-label={payload.question} className="flex flex-col gap-2">
        {payload.options.map((option) => {
          const isChosen = option.id === chosenId;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isChosen}
              disabled={Boolean(chosenId)}
              onClick={() => choose(option.id)}
              className={`flex w-full items-center gap-3 rounded-sm border px-4 py-3.5 text-left transition-all duration-(--ts-dur-fast) ${
                isChosen
                  ? "border-pine-700 bg-pine-300/15"
                  : chosenId
                    ? "border-line-200 bg-paper-0 opacity-50"
                    : "border-line-200 bg-paper-0 hover:-translate-y-0.5 hover:border-pine-300 active:scale-[0.99]"
              }`}
            >
              <BlazeMarker state={isChosen ? "active" : "todo"} size="s" />
              <span className="min-w-0 flex-1 text-base text-pine-950">{option.label}</span>
              {isChosen && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-pine-700 px-2.5 py-1 text-xs font-medium text-paper-0">
                  <Lock className="size-3" strokeWidth={2} aria-hidden />
                  Locked in
                </span>
              )}
            </button>
          );
        })}
      </div>

      {chosen && (
        <div className="flex flex-col gap-4" aria-live="polite">
          {perOption && (
            <Unmask instant={instant}>
              <Card padding="s" className="border-pine-300 bg-pine-300/10">
                <p className="ts-eyebrow">About your prediction</p>
                <Markdown md={perOption} className="mt-2 text-base text-pine-950" />
              </Card>
            </Unmask>
          )}
          <GeneralReveal md={payload.reveal.md} instant={instant} />
        </div>
      )}
    </div>
  );
}

/** The general reveal fades in 200ms after the per-option unmask. */
function GeneralReveal({ md, instant }: { md: string; instant: boolean }) {
  const entered = useEntered(instant ? 0 : 200);
  return (
    <div
      className={`transition-opacity duration-(--ts-dur-base) ease-(--ts-ease-out) ${
        instant || entered ? "opacity-100" : "opacity-0"
      }`}
    >
      <Card padding="m">
        <p className="ts-eyebrow">The pattern</p>
        <Markdown md={md} className="mt-2 text-base text-pine-950" />
      </Card>
    </div>
  );
}
