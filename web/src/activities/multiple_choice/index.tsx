/* multiple_choice renderer (SPEC-007 §3): KnowledgeOption cards with inline
 * authored feedback. Not-best keeps the others enabled for retry; finding the
 * best locks the set and shows the explanation. firstAttemptOptionId records
 * once and rides along on every evidence write.
 */
import { useState } from "react";
import type { ActivityProps, ChoiceValue, MultipleChoicePayload } from "../types";
import { KnowledgeOption, type KnowledgeOptionState } from "../../components/KnowledgeOption";
import { FeedbackStrip } from "../../components/FeedbackStrip";
import { Markdown } from "../Markdown";

const MARKERS = ["A", "B", "C", "D", "E", "F"];

export default function MultipleChoiceActivity({ step, evidence, onEvidence }: ActivityProps) {
  const payload = step.payload as MultipleChoicePayload;
  const prior = (evidence?.value ?? null) as ChoiceValue | null;
  const [selectedId, setSelectedId] = useState<string | null>(prior?.optionId ?? null);
  const [firstAttemptId, setFirstAttemptId] = useState<string | null>(
    prior?.firstAttemptOptionId ?? null,
  );
  const [revisit] = useState(Boolean(evidence?.complete));

  const selected = payload.options.find((o) => o.id === selectedId);
  const solved = Boolean(selected?.isBest);

  const pick = (optionId: string) => {
    if (solved) return;
    const option = payload.options.find((o) => o.id === optionId);
    if (!option) return;
    const first = firstAttemptId ?? optionId;
    setFirstAttemptId(first);
    setSelectedId(optionId);
    onEvidence({
      kind: "choice",
      value: { optionId, firstAttemptOptionId: first },
      complete: option.isBest,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg font-medium text-pine-950">{payload.prompt}</p>

      <div className="flex flex-col gap-2" role="group" aria-label={payload.prompt}>
        {payload.options.map((option, i) => {
          const isSelected = option.id === selectedId;
          const state: KnowledgeOptionState = isSelected
            ? option.isBest
              ? "best"
              : "not-best"
            : "idle";
          return (
            <KnowledgeOption
              key={option.id}
              state={state}
              marker={MARKERS[i] ?? String(i + 1)}
              text={option.text}
              disabled={solved}
              onSelect={() => pick(option.id)}
              feedback={isSelected ? <Markdown md={option.feedback} /> : undefined}
            />
          );
        })}
      </div>

      {solved && payload.explanation && (
        <FeedbackStrip
          tone="positive"
          label="The takeaway"
          md={payload.explanation}
          animate={!revisit}
        />
      )}
    </div>
  );
}
