import { type ReactNode } from "react";
import { Check, Info, AlertTriangle, OctagonAlert } from "lucide-react";
import { Markdown } from "../activities/Markdown";
import { useEntered } from "../activities/motion";

export type FeedbackTone = "positive" | "info" | "caution" | "risk";

const TONE: Record<
  FeedbackTone,
  { icon: typeof Check; bar: string; iconColor: string; defaultLabel: string }
> = {
  positive: {
    icon: Check,
    bar: "bg-pine-700",
    iconColor: "text-pine-700",
    defaultLabel: "Good line",
  },
  info: { icon: Info, bar: "bg-sky-600", iconColor: "text-sky-600", defaultLabel: "Worth knowing" },
  caution: {
    icon: AlertTriangle,
    bar: "bg-sun-400",
    iconColor: "text-sun-400",
    defaultLabel: "Not quite",
  },
  risk: {
    icon: OctagonAlert,
    bar: "bg-danger-600",
    iconColor: "text-danger-600",
    defaultLabel: "Risky line",
  },
};

/**
 * The reusable right/not-quite/explanation strip activities share (DESIGN-002):
 * semantic color bar + icon + markdown body. Enters with the 8px rise + fade
 * (DESIGN-004 moment 1).
 */
export function FeedbackStrip({
  tone,
  label,
  md,
  children,
  animate = true,
  className = "",
}: {
  tone: FeedbackTone;
  /** Short heading; omit for the tone's default. Pass null to hide. */
  label?: string | null;
  /** Authored markdown body (payloads deliver these verbatim). */
  md?: string;
  children?: ReactNode;
  /** Set false in revisit contexts to skip the entrance motion. */
  animate?: boolean;
  className?: string;
}) {
  const t = TONE[tone];
  const Icon = t.icon;
  const entered = useEntered();
  const shown = !animate || entered;
  return (
    <aside
      role="status"
      className={`relative overflow-hidden rounded-sm border border-line-200 bg-paper-0 py-3 pl-4 pr-4 transition-all duration-(--ts-dur-base) ease-(--ts-ease-out) ${
        shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      } ${className}`}
    >
      <span className={`absolute inset-y-0 left-0 w-[3px] ${t.bar}`} aria-hidden />
      <div className="flex items-start gap-2.5 pl-1">
        <Icon className={`mt-0.5 size-4 shrink-0 ${t.iconColor}`} strokeWidth={2} aria-hidden />
        <div className="min-w-0 text-sm text-pine-950">
          {label !== null && (
            <p className="font-semibold">{label ?? t.defaultLabel}</p>
          )}
          {md && <Markdown md={md} className={label !== null ? "mt-0.5" : ""} />}
          {children}
        </div>
      </div>
    </aside>
  );
}
