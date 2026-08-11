import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { AlertCircle } from "lucide-react";

/** Shared field chrome: label, hint, error, char counter (DESIGN-002). */
export function FieldShell({
  id,
  label,
  hint,
  error,
  counter,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  counter?: { value: number; max: number };
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-pine-950">
          {label}
        </label>
        {counter && (
          <span
            className={`font-mono text-xs ${counter.value > counter.max ? "text-danger-600" : "text-ink-500"}`}
          >
            {counter.value}/{counter.max}
          </span>
        )}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-sm text-danger-600">
          <AlertCircle className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <div id={`${id}-hint`} className="text-sm text-ink-500">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export const inputClass = (hasError: boolean) =>
  `h-10 w-full rounded-sm border bg-paper-50 px-3 text-base text-pine-950 placeholder:text-ink-500/70 transition-colors duration-(--ts-dur-fast) ease-(--ts-ease-out) ${
    hasError
      ? "border-danger-600"
      : "border-line-200 hover:border-pine-300 focus:border-pine-700"
  }`;

/**
 * Error shake (DESIGN-004): ±4px, once, when a field goes from valid to invalid
 * — i.e. on submit-with-error, never while typing into an already-bad field.
 */
export function useErrorShake(hasError: boolean) {
  const [shaking, setShaking] = useState(false);
  const prev = useRef(hasError);
  useEffect(() => {
    if (hasError && !prev.current) setShaking(true);
    prev.current = hasError;
  }, [hasError]);
  return {
    className: shaking ? "ts-act-shake" : "",
    onAnimationEnd: () => setShaking(false),
  };
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  hint?: ReactNode;
  error?: string;
  showCounter?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, showCounter, maxLength, value, className = "", ...rest },
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
      <input
        ref={ref}
        id={id}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        onAnimationEnd={shake.onAnimationEnd}
        className={`${inputClass(Boolean(error))} ${shake.className} ${className}`}
        {...rest}
      />
    </FieldShell>
  );
});
