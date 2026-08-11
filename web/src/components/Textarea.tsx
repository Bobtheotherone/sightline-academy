import { forwardRef, useId, type ReactNode, type TextareaHTMLAttributes } from "react";
import { FieldShell, useErrorShake } from "./Input";

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  label: string;
  hint?: ReactNode;
  error?: string;
  showCounter?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, showCounter, maxLength, value, rows = 4, className = "", style, ...rest },
  ref,
) {
  const id = useId();
  const shake = useErrorShake(Boolean(error));
  const counter =
    showCounter && maxLength
      ? { value: String(value ?? "").length, max: maxLength }
      : undefined;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} counter={counter}>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        onAnimationEnd={shake.onAnimationEnd}
        /* `field-sizing: content` grows the field with the answer — and sizes an
         * EMPTY one to one line, which kills `rows` and makes a "one or two
         * sentences" prompt look like a single-line Input. The floor restates
         * what `rows` means (rows line boxes + py-2 + the hairline) so the empty
         * affordance survives; growth past it still comes from the content. */
        style={{ minHeight: `calc(${rows} * 1lh + 1rem + 2px)`, ...style }}
        className={`w-full resize-none field-sizing-content rounded-sm border bg-paper-50 px-3 py-2 text-base text-pine-950 placeholder:text-ink-500/70 transition-colors duration-(--ts-dur-fast) ease-(--ts-ease-out) ${
          error
            ? "border-danger-600"
            : "border-line-200 hover:border-pine-300 focus:border-pine-700"
        } ${shake.className} ${className}`}
        {...rest}
      />
    </FieldShell>
  );
});
