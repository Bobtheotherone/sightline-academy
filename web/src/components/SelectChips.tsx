import { useState } from "react";
import { BlazeMarker } from "./BlazeMarker";

export interface ChipOption {
  id: string;
  label: string;
}

interface BaseProps {
  options: ChipOption[];
  /** Accessible group label. */
  label: string;
  disabled?: boolean;
}

interface SingleProps extends BaseProps {
  multiple?: false;
  value: string | null;
  onChange: (id: string) => void;
}

interface MultiProps extends BaseProps {
  multiple: true;
  value: string[];
  onChange: (ids: string[]) => void;
}

export type SelectChipsProps = SingleProps | MultiProps;

/** Tappable pill group — journal options, reflection chips, reason chips. */
export function SelectChips(props: SelectChipsProps) {
  const { options, label, disabled } = props;
  const [settling, setSettling] = useState<string | null>(null);

  const isSelected = (id: string) =>
    props.multiple ? props.value.includes(id) : props.value === id;

  const toggle = (id: string) => {
    setSettling(id);
    if (props.multiple) {
      props.onChange(
        props.value.includes(id)
          ? props.value.filter((v) => v !== id)
          : [...props.value, id],
      );
    } else {
      props.onChange(id);
    }
  };

  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = isSelected(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => toggle(opt.id)}
            onAnimationEnd={() => setSettling((s) => (s === opt.id ? null : s))}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-(--ts-dur-fast) ease-(--ts-ease-out) active:scale-[0.97] active:duration-(--ts-dur-micro) disabled:pointer-events-none disabled:opacity-55 ${
              selected
                ? "border-pine-700 bg-pine-100 text-pine-950"
                : "border-line-200 bg-paper-50 text-pine-950 hover:border-pine-300 hover:bg-moss-100"
            } ${settling === opt.id && selected ? "ts-act-settle" : ""}`}
          >
            {selected && <BlazeMarker state="active" size="s" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
