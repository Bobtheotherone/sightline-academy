import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff, Check, Minus } from "lucide-react";
import { FieldShell, inputClass } from "./Input";
import { isCommonPassword } from "../lib/commonPasswords";

function Requirement({ met, children }: { met: boolean; children: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 ${met ? "text-pine-700" : "text-ink-500"}`}
    >
      {met ? (
        <Check className="size-3.5" strokeWidth={2} aria-hidden />
      ) : (
        <Minus className="size-3.5" strokeWidth={2} aria-hidden />
      )}
      {children}
      <span className="sr-only">{met ? "— met" : "— not yet"}</span>
    </span>
  );
}

export interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> {
  label: string;
  error?: string;
  /** Live strength hint per SPEC-005: length ≥10 + not-a-common-password. */
  showStrength?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ label, error, showStrength, value, className = "", ...rest }, ref) {
    const id = useId();
    const [visible, setVisible] = useState(false);
    const text = String(value ?? "");
    const longEnough = text.length >= 10;
    const notCommon = text.length > 0 && !isCommonPassword(text);

    const hint = showStrength ? (
      <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Requirement met={longEnough}>10+ characters</Requirement>
        <Requirement met={longEnough && notCommon}>Not a common password</Requirement>
      </span>
    ) : undefined;

    return (
      <FieldShell id={id} label={label} hint={hint} error={error}>
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={visible ? "text" : "password"}
            value={value}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            className={`${inputClass(Boolean(error))} pr-11 ${className}`}
            {...rest}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-sm text-ink-500 transition-colors duration-(--ts-dur-fast) hover:text-pine-700"
          >
            {visible ? (
              <EyeOff className="size-5" strokeWidth={1.5} aria-hidden />
            ) : (
              <Eye className="size-5" strokeWidth={1.5} aria-hidden />
            )}
          </button>
        </div>
      </FieldShell>
    );
  },
);
