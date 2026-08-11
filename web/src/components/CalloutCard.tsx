import type { ReactNode } from "react";
import { Lightbulb, AlertTriangle, BookOpen, OctagonAlert } from "lucide-react";

export type CalloutKind = "tip" | "caution" | "story" | "risk";

const KIND: Record<
  CalloutKind,
  { bar: string; ground: string; text: string; icon: typeof Lightbulb; role: string }
> = {
  tip: {
    bar: "bg-pine-700",
    ground: "bg-pine-100",
    text: "text-pine-700",
    icon: Lightbulb,
    role: "Tip",
  },
  caution: {
    bar: "bg-sun-400",
    ground: "bg-sun-100",
    text: "text-sun-400",
    icon: AlertTriangle,
    role: "Caution",
  },
  story: {
    bar: "bg-sky-600",
    ground: "bg-sky-100",
    text: "text-sky-600",
    icon: BookOpen,
    role: "Field story",
  },
  risk: {
    bar: "bg-danger-600",
    ground: "bg-danger-100",
    text: "text-danger-600",
    icon: OctagonAlert,
    role: "Risk",
  },
};

/** Semantic callout: 3px left bar over a low-intensity tinted ground (DESIGN-002 v2). */
export function CalloutCard({
  kind,
  title,
  children,
  className = "",
}: {
  kind: CalloutKind;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const k = KIND[kind];
  const Icon = k.icon;
  return (
    <aside
      className={`relative overflow-hidden rounded-md ${k.ground} p-5 ${className}`}
      aria-label={`${k.role}: ${title}`}
    >
      <span className={`absolute inset-y-0 left-0 w-[3px] ${k.bar}`} aria-hidden />
      <div className="flex items-start gap-3 pl-1">
        <Icon className={`mt-0.5 size-5 shrink-0 ${k.text}`} strokeWidth={1.5} aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold text-pine-950">{title}</p>
          <div className="mt-1 text-sm text-ink-500 [&_strong]:text-pine-950">{children}</div>
        </div>
      </div>
    </aside>
  );
}
