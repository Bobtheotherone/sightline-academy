/* journal_builder renderer (SPEC-007 §9): a field notebook page, not a form.
 * Text fields carry a live minLength affordance, option fields are tappable
 * cards, prefillFrom values arrive via the host's prefill map (marked "pulled
 * from" and fully editable), and the ArtifactPreview builds live alongside.
 * Evidence journal_artifact completes when every field is filled and minimum
 * lengths are met; the host page's PUT also upserts the artifact.
 */
import { useMemo, useState } from "react";
import { CornerDownRight, Link2 } from "lucide-react";
import type {
  ActivityProps,
  JournalArtifactValue,
  JournalBuilderPayload,
  JournalField,
  JournalFieldValue,
} from "../types";
import { ArtifactPreview } from "../../components/ArtifactPreview";
import { SelectChips } from "../../components/SelectChips";
import { Textarea } from "../../components/Textarea";
import { BlazeMarker } from "../../components/BlazeMarker";
import { ARTIFACT_FACTS } from "../../lib/modules";

function fieldComplete(field: JournalField, value: JournalFieldValue | undefined): boolean {
  if (value === undefined) return false;
  if (field.options) {
    return Array.isArray(value) ? value.length > 0 : value.trim().length > 0;
  }
  const text = Array.isArray(value) ? value.join(" ") : value;
  const min = field.minLength ?? 1;
  return text.trim().length >= min;
}

export default function JournalBuilderActivity({
  step,
  evidence,
  onEvidence,
  prefill,
}: ActivityProps) {
  const payload = step.payload as JournalBuilderPayload;
  const prior = (evidence?.value ?? null) as JournalArtifactValue | null;

  const [values, setValues] = useState<Record<string, JournalFieldValue>>(() => {
    const out: Record<string, JournalFieldValue> = {};
    for (const field of payload.fields) {
      const stored = prior?.fields?.[field.id];
      const prefilled = field.prefillFrom ? prefill?.[field.id] : undefined;
      out[field.id] = stored ?? prefilled ?? (field.multi ? [] : "");
    }
    return out;
  });

  const allComplete = payload.fields.every((f) => fieldComplete(f, values[f.id]));

  const setField = (field: JournalField, value: JournalFieldValue) => {
    const next = { ...values, [field.id]: value };
    setValues(next);
    onEvidence({
      kind: "journal_artifact",
      value: { fields: next },
      complete: payload.fields.every((f) => fieldComplete(f, next[f.id])),
    });
  };

  const artifactName = ARTIFACT_FACTS[payload.artifactType]?.name ?? payload.artifactType;
  const previewEntries = useMemo(
    () =>
      payload.fields.map((f) => ({
        id: f.id,
        label: f.label,
        value: values[f.id] ?? "",
      })),
    [payload.fields, values],
  );

  return (
    <div className="flex flex-col gap-6">
      <p className="text-base text-pine-950">{payload.intro}</p>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
        {/* Inputs */}
        <div className="flex flex-col gap-6">
          {payload.fields.map((field) => {
            const value = values[field.id];
            const done = fieldComplete(field, value);
            const prefilledHere =
              field.prefillFrom && prefill?.[field.id] !== undefined;
            return (
              <div key={field.id} className="flex flex-col gap-2">
                {prefilledHere && field.prefillFrom && (
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-600">
                    <CornerDownRight className="size-3.5" strokeWidth={2} aria-hidden />
                    Pulled from your{" "}
                    {ARTIFACT_FACTS[field.prefillFrom.artifactType]?.name ??
                      field.prefillFrom.artifactType}{" "}
                    — edit freely
                  </p>
                )}
                {field.options ? (
                  <fieldset>
                    <legend className="text-sm font-medium text-pine-950">{field.label}</legend>
                    <p className="mt-0.5 text-sm text-ink-500">{field.prompt}</p>
                    <div className="mt-2.5">
                      {field.multi ? (
                        <SelectChips
                          multiple
                          label={field.label}
                          options={field.options.map((o) => ({ id: o, label: o }))}
                          value={Array.isArray(value) ? value : value ? [value] : []}
                          onChange={(ids) => setField(field, ids)}
                        />
                      ) : (
                        <SelectChips
                          label={field.label}
                          options={field.options.map((o) => ({ id: o, label: o }))}
                          value={Array.isArray(value) ? (value[0] ?? null) : value || null}
                          onChange={(id) => setField(field, id)}
                        />
                      )}
                    </div>
                  </fieldset>
                ) : (
                  <Textarea
                    label={field.label}
                    rows={3}
                    value={Array.isArray(value) ? value.join(", ") : (value ?? "")}
                    onChange={(e) => setField(field, e.target.value)}
                    hint={
                      <span className="flex flex-wrap items-baseline justify-between gap-2">
                        <span>{field.prompt}</span>
                        {field.minLength && (
                          <MinLengthAffordance
                            length={
                              (Array.isArray(value) ? value.join(", ") : (value ?? "")).trim()
                                .length
                            }
                            min={field.minLength}
                            met={done}
                          />
                        )}
                      </span>
                    }
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-6">
          <ArtifactPreview
            eyebrow={`Field journal — ${artifactName}`}
            title={payload.title}
            entries={previewEntries}
            status={allComplete ? "complete" : "draft"}
          />
          <p className="mt-3 flex items-start gap-2 text-sm italic text-ink-500">
            <Link2 className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} aria-hidden />
            <span>{payload.connection}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/** Live minLength affordance: counter while short, blaze check once met. */
function MinLengthAffordance({
  length,
  min,
  met,
}: {
  length: number;
  min: number;
  met: boolean;
}) {
  if (met) {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs text-pine-700">
        <BlazeMarker state="done" size="s" />
        Enough detail
      </span>
    );
  }
  return (
    <span className="font-mono text-xs text-ink-500">
      {length}/{min} — keep going
    </span>
  );
}
