/* reflection renderer (SPEC-007 §10): a low-stakes think prompt. Calm and
 * spacious, explicitly "For you — not graded". One chip tap or a short line of
 * text completes; both are welcome together.
 */
import { useMemo, useState } from "react";
import { Feather } from "lucide-react";
import type { ActivityProps, ReflectionPayload, WrittenResponseValue } from "../types";
import { SelectChips } from "../../components/SelectChips";
import { Textarea } from "../../components/Textarea";
import { Markdown } from "../Markdown";

const MIN_TEXT = 3;

export default function ReflectionActivity({ step, evidence, onEvidence }: ActivityProps) {
  const payload = step.payload as ReflectionPayload;
  const prior = (evidence?.value ?? null) as WrittenResponseValue | null;
  const [chip, setChip] = useState<string | null>(prior?.chip ?? null);
  const [text, setText] = useState(prior?.text ?? "");

  const chipOptions = useMemo(
    () => (payload.chips ?? []).map((label) => ({ id: label, label })),
    [payload.chips],
  );

  const emit = (nextChip: string | null, nextText: string) => {
    const trimmed = nextText.trim();
    const value: WrittenResponseValue = {};
    if (nextChip) value.chip = nextChip;
    if (trimmed) value.text = nextText;
    onEvidence({
      kind: "written_response",
      value,
      complete: Boolean(nextChip) || trimmed.length >= MIN_TEXT,
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 py-6 text-center">
      <p className="inline-flex items-center gap-2 text-sm font-medium text-ink-500">
        <Feather className="size-4 text-sky-600" strokeWidth={1.5} aria-hidden />
        For you — not graded
      </p>

      <p className="text-lg leading-relaxed text-pine-950">
        <Markdown inline md={payload.prompt} />
      </p>

      {chipOptions.length > 0 && (
        <div className="flex justify-center">
          <SelectChips
            label="Pick the one that rings true"
            options={chipOptions}
            value={chip}
            onChange={(id) => {
              setChip(id);
              emit(id, text);
            }}
          />
        </div>
      )}

      {payload.allowText && (
        <div className="w-full text-left">
          {chipOptions.length > 0 && (
            <p className="mb-2 text-center text-sm text-ink-500">
              — or put it in your own words —
            </p>
          )}
          <Textarea
            label="Your thought"
            rows={3}
            value={text}
            placeholder="A sentence is plenty."
            onChange={(e) => {
              setText(e.target.value);
              emit(chip, e.target.value);
            }}
          />
        </div>
      )}
    </div>
  );
}
