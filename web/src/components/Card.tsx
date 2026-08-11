import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Hover lift −3px + shadow-2 + interior art zoom 1.03 (DESIGN-002 v2). */
  interactive?: boolean;
  /** Hairline border — optional in v2, kept where it carries meaning (tables, data sheets). */
  bordered?: boolean;
  padding?: "none" | "s" | "m" | "l";
}

const PAD = { none: "", s: "p-4", m: "p-6", l: "p-8" } as const;

const INTERACTIVE =
  "group transition-all duration-(--ts-dur-base) ease-(--ts-ease-out) hover:-translate-y-[3px] hover:shadow-(--ts-shadow-2) [&_img]:transition-transform [&_img]:duration-(--ts-dur-slow) [&_img]:ease-(--ts-ease-out) hover:[&_img]:scale-[1.03]";

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { interactive = false, bordered = false, padding = "m", className = "", children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`rounded-md bg-paper-50 shadow-(--ts-shadow-1) ${bordered ? "border border-line-200" : ""} ${
        PAD[padding]
      } ${interactive ? INTERACTIVE : ""} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
});

/** Media row of a composed card — clips the interior art so hover zoom stays inside. */
export function CardMedia({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={`overflow-hidden ${className}`}>{children}</div>;
}

/** Body row — the text column between media and actions. */
export function CardBody({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={`flex min-w-0 flex-col gap-2 ${className}`}>{children}</div>;
}

/** Action row — pinned to the card's baseline so siblings in a grid line up. */
export function CardActions({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`mt-auto flex flex-wrap items-center gap-3 pt-4 ${className}`}>
      {children}
    </div>
  );
}
