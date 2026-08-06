import { forwardRef, useId, type ReactNode, type TextareaHTMLAttributes } from "react";
import { FieldShell } from "./Input";

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  label: string;
  hint?: ReactNode;
  error?: string;
  showCounter?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, showCounter, maxLength, value, rows = 4, className = "", ...rest },
  ref,
) {
  const id = useId();
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
        className={`w-full resize-y rounded-sm border bg-paper-0 px-3 py-2 text-base text-pine-950 placeholder:text-ink-500/70 transition-colors duration-(--ts-dur-fast) ${
          error
            ? "border-danger-600"
            : "border-line-200 hover:border-pine-300 focus:border-pine-700"
        } ${className}`}
        {...rest}
      />
    </FieldShell>
  );
});
