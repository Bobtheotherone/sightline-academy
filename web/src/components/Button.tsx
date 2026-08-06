import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent";
export type ButtonSize = "s" | "m" | "l";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-pine-700 text-paper-0 border border-pine-700 hover:brightness-95 active:scale-[0.98]",
  secondary:
    "bg-paper-0 text-pine-700 border border-pine-700 hover:bg-moss-100 active:scale-[0.98]",
  ghost:
    "bg-transparent text-pine-700 border border-transparent hover:bg-pine-300/25 active:scale-[0.98]",
  danger:
    "bg-danger-600 text-paper-0 border border-danger-600 hover:brightness-95 active:scale-[0.98]",
  accent:
    "bg-clay-500 text-paper-0 border border-clay-500 hover:brightness-95 active:scale-[0.98]",
};

const SIZE: Record<ButtonSize, string> = {
  s: "h-8 px-3 text-sm gap-1.5",
  m: "h-10 px-4 text-sm gap-2",
  l: "h-12 px-6 text-base gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "m",
    loading = false,
    iconLeft,
    iconRight,
    className = "",
    children,
    disabled,
    type,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-sm font-medium transition-all duration-(--ts-dur-fast) ease-in-out disabled:pointer-events-none disabled:opacity-55 ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />
      ) : (
        iconLeft
      )}
      {children}
      {iconRight}
    </button>
  );
});

export interface LinkButtonProps {
  to: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Button-styled internal link — same visual system, real anchor semantics. */
export function LinkButton({
  to,
  variant = "primary",
  size = "m",
  iconLeft,
  iconRight,
  className = "",
  children,
}: LinkButtonProps) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center rounded-sm font-medium transition-all duration-(--ts-dur-fast) ease-in-out ${VARIANT[variant]} ${SIZE[size]} ${className}`}
    >
      {iconLeft}
      {children}
      {iconRight}
    </Link>
  );
}
