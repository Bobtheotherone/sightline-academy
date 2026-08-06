import { forwardRef, type HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Hover lift 2px + border darken, 150ms (DESIGN-002). */
  interactive?: boolean;
  padding?: "none" | "s" | "m" | "l";
}

const PAD = { none: "", s: "p-4", m: "p-6", l: "p-8" } as const;

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { interactive = false, padding = "m", className = "", children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`rounded-md border border-line-200 bg-paper-0 ${PAD[padding]} ${
        interactive
          ? "transition-all duration-150 ease-in-out hover:-translate-y-0.5 hover:border-pine-300"
          : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
});
