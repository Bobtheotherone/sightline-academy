import { forwardRef, type CSSProperties, type HTMLAttributes } from "react";

export interface ContourPanelProps extends HTMLAttributes<HTMLDivElement> {
  /** `light` = moss-100 contour (tokens.css .ts-contour); `dark` = --ts-grad-panel with paper-0 type. */
  variant?: "light" | "dark";
  /** Mounts the ambient drifting contour layer (80s loop, spans 120% of the panel). */
  drift?: boolean;
  /** Places one radial glow behind the children. */
  glow?: "clay" | "sun";
  /** Placement utilities for the glow layer; default is a bloom off the top-right. */
  glowClassName?: string;
}

/**
 * Section/hero wrapper laying the contour SVG motif behind children (DESIGN-002).
 * The motif rides its own layer at `-z-10` inside the panel's stacking context so
 * the dark variant can carry the panel gradient on the element itself, and so the
 * drifting layer can overhang the panel without covering content.
 */
export const ContourPanel = forwardRef<HTMLDivElement, ContourPanelProps>(
  function ContourPanel(
    { variant = "light", drift = false, glow, glowClassName = "", className = "", style, children, ...rest },
    ref,
  ) {
    const dark = variant === "dark";
    // Light panels keep the motif on the element itself unless it has to drift,
    // so a plain light panel stays byte-identical to v1 (no new stacking context).
    const layered = dark || drift;
    const staged = layered || Boolean(glow);
    const panelStyle: CSSProperties = dark
      ? { backgroundImage: "var(--ts-grad-panel)", ...style }
      : { ...style };

    return (
      <div
        ref={ref}
        className={`${staged ? "relative isolate" : ""} ${drift ? "overflow-hidden" : ""} ${
          dark
            ? "bg-pine-950 text-paper-0"
            : layered
              ? "bg-moss-100 text-pine-950"
              : "ts-contour text-pine-950"
        } ${className}`}
        style={panelStyle}
        {...rest}
      >
        {layered && (
          <span
            aria-hidden
            // Inline transparent beats the unlayered .ts-contour* background-color,
            // leaving only the lines over the panel gradient.
            style={{ backgroundColor: "transparent" }}
            className={`pointer-events-none absolute -z-10 ${
              drift ? "-inset-[10%] ts-contour-drift" : "inset-0"
            } ${dark ? "ts-contour-dark" : "ts-contour"}`}
          />
        )}
        {glow && (
          <span
            aria-hidden
            style={{ backgroundImage: `var(--ts-glow-${glow})` }}
            className={`pointer-events-none absolute -z-10 ${
              glowClassName || "-top-[20%] -right-[10%] size-[70%]"
            }`}
          />
        )}
        {children}
      </div>
    );
  },
);
