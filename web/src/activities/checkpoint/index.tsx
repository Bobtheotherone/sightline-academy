/* checkpoint renderer (SPEC-007 §12): lesson-ending assessment wrapper with
 * the distinct "Checkpoint" banner framing around the inner renderer. Wave 1
 * ships mode "multiple_choice"; "structured_response" mode gets its component
 * in Wave 2 and shows the designed unavailable state until then. Evidence is
 * re-kinded to checkpoint_response; passCopy/reviseCopy surface by result.
 */
import { useMemo, useState } from "react";
import { Flag } from "lucide-react";
import type { StepOut } from "../../lib/api";
import type { ActivityProps, CheckpointPayload, EvidenceDraft } from "../types";
import { FeedbackStrip } from "../../components/FeedbackStrip";
import { ActivityUnavailable } from "../ActivityHost";
import MultipleChoiceActivity from "../multiple_choice";

export default function CheckpointActivity({ step, evidence, onEvidence }: ActivityProps) {
  const payload = step.payload as CheckpointPayload;
  const [lastAttemptBest, setLastAttemptBest] = useState<boolean | null>(
    evidence ? Boolean(evidence.complete) : null,
  );
  const [revisit] = useState(Boolean(evidence?.complete));

  /* The inner renderer sees a step carrying the inner payload; its evidence
   * value shape is unchanged, only the kind differs. */
  const innerStep = useMemo<StepOut>(
    () => ({ ...step, renderer: payload.mode, payload: payload.inner }),
    [step, payload],
  );

  const handleInnerEvidence = (draft: EvidenceDraft) => {
    setLastAttemptBest(draft.complete);
    onEvidence({ kind: "checkpoint_response", value: draft.value, complete: draft.complete });
  };

  return (
    <div className="overflow-hidden rounded-md border border-line-200">
      <div className="ts-contour-dark flex items-center gap-3.5 px-5 py-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-paper-0/10">
          <Flag className="size-4.5 text-sun-400" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-sun-400">
            Checkpoint
          </p>
          <p className="mt-0.5 text-sm text-paper-0/80">
            Show yourself it stuck — retries are part of the trail.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 bg-paper-0 p-5">
        {payload.mode === "multiple_choice" ? (
          <MultipleChoiceActivity
            step={innerStep}
            evidence={evidence}
            onEvidence={handleInnerEvidence}
          />
        ) : (
          <ActivityUnavailable renderer={payload.mode} />
        )}

        {lastAttemptBest === true && (
          <FeedbackStrip
            tone="positive"
            label="Checkpoint cleared"
            md={payload.passCopy}
            animate={!revisit}
          />
        )}
        {lastAttemptBest === false && (
          <FeedbackStrip tone="caution" label="Take another look" md={payload.reviseCopy} />
        )}
      </div>
    </div>
  );
}
