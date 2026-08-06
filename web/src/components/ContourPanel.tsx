import { forwardRef, type HTMLAttributes } from "react";

export interface ContourPanelProps extends HTMLAttributes<HTMLDivElement> {
  /** `light` = moss-100 contour (tokens.css .ts-contour); `dark` = pine-950 hero with paper-0 type. */
  variant?: "light" | "dark";
}

/** Section/hero wrapper laying the contour SVG motif behind children (DESIGN-002). */
export const ContourPanel = forwardRef<HTMLDivElement, ContourPanelProps>(
  function ContourPanel({ variant = "light", className = "", children, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={`${variant === "dark" ? "ts-contour-dark text-paper-0" : "ts-contour text-pine-950"} ${className}`}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
