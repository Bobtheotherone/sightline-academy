/* lab_objective renderer (SPEC-007 §11): the two bespoke interactive labs —
 * the product's showcase screens. This file owns the shared frame: objective
 * checklist that ticks live, lab_result evidence (complete when every
 * objective is met), and the debrief. The labs themselves are self-contained
 * SVG components: WalkaroundLab (Module 2) and StabilityLab (Module 4).
 */
import { useState } from "react";
import type { ActivityProps, LabObjectivePayload, LabResultValue } from "../types";
import { BlazeMarker } from "../../components/BlazeMarker";
import { FeedbackStrip } from "../../components/FeedbackStrip";
import { ActivityUnavailable } from "../ActivityHost";
import { WalkaroundLab } from "./WalkaroundLab";
import { StabilityLab } from "./StabilityLab";

/** Contract between this frame and the two lab components. */
export interface LabComponentProps {
  payload: LabObjectivePayload;
  /** Objective ids already met (restored from evidence on revisit). */
  met: ReadonlySet<string>;
  /** Report an objective as met — idempotent, unknown ids ignored. */
  meet: (id: string) => void;
  revisit: boolean;
}

export default function LabObjectiveActivity({ step, evidence, onEvidence }: ActivityProps) {
  const payload = step.payload as LabObjectivePayload;
  const prior = (evidence?.value ?? null) as LabResultValue | null;

  const objectiveIds = payload.objectives.map((o) => o.id);
  const [met, setMet] = useState<ReadonlySet<string>>(
    () => new Set((prior?.objectivesMet ?? []).filter((id) => objectiveIds.includes(id))),
  );
  const [revisit] = useState(Boolean(evidence?.complete));
  const allMet = objectiveIds.every((id) => met.has(id));

  const meet = (id: string) => {
    if (met.has(id) || !objectiveIds.includes(id)) return;
    const next = new Set(met);
    next.add(id);
    setMet(next);
    onEvidence({
      kind: "lab_result",
      value: { objectivesMet: objectiveIds.filter((o) => next.has(o)) },
      complete: objectiveIds.every((o) => next.has(o)),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-label="Lab objectives"
        className="rounded-md border border-line-200 bg-moss-100/60 px-4 py-3.5"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="ts-eyebrow">Lab objectives</p>
          <p className="font-mono text-xs text-ink-500" aria-live="polite">
            {met.size} of {objectiveIds.length} met
          </p>
        </div>
        <ol className="mt-2.5 flex flex-col gap-2">
          {payload.objectives.map((objective) => {
            const done = met.has(objective.id);
            return (
              <li
                key={objective.id}
                className={`flex items-start gap-2.5 text-sm ${done ? "ts-act-settle" : ""}`}
              >
                <BlazeMarker
                  state={done ? "done" : "todo"}
                  size="m"
                  className="mt-1"
                  label={done ? "Objective met" : "Objective not met yet"}
                />
                <span className={done ? "font-medium text-pine-950" : "text-ink-500"}>
                  {objective.text}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {payload.lab === "walkaround" ? (
        <WalkaroundLab payload={payload} met={met} meet={meet} revisit={revisit} />
      ) : payload.lab === "stability_explorer" ? (
        <StabilityLab payload={payload} met={met} meet={meet} revisit={revisit} />
      ) : (
        <ActivityUnavailable renderer={`lab:${payload.lab}`} />
      )}

      {allMet && (
        <FeedbackStrip
          tone="positive"
          label="Lab complete — the debrief"
          md={payload.debrief}
          animate={!revisit}
        />
      )}
    </div>
  );
}
