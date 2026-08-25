import type { ReactNode } from "react";
import { Lightbulb, AlertTriangle, BookOpen, OctagonAlert } from "lucide-react";
import { SlotArt } from "./SlotArt";

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

/** Semantic callout: 3px left bar over a low-intensity tinted ground (DESIGN-002 v2).
 * A callout registered with a vignette (VISUAL_ASSETS §7.3 C-020…C-037) carries
 * it as a plate — a right column at the reading measure, full width beneath the
 * words on mobile. The plate's alt carries the vignette's teaching description,
 * so it is a figure, not decoration. */
export function CalloutCard({
  kind,
  title,
  art,
  children,
  className = "",
}: {
  kind: CalloutKind;
  title: string;
  /** Illustration slot for this callout's vignette, when one is produced. */
  art?: string;
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
      <div className="flex flex-col gap-4 pl-1 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Icon className={`mt-0.5 size-5 shrink-0 ${k.text}`} strokeWidth={1.5} aria-hidden />
          <div className="min-w-0">
            <p className="font-semibold text-pine-950">{title}</p>
            <div className="mt-1 text-sm text-ink-500 [&_strong]:text-pine-950">{children}</div>
          </div>
        </div>
        {art && (
          /* 288px, not 176 (owner directive 2026-08-16): the lesson stage is
              capped at 760px, so this card's inner width is ~668px at every
              screen size and the plate cannot grow by taking more viewport.
              At 176 the detailed vignettes — C-020's five factor panels most of
              all — were unreadable. 288 is the most this column can take before
              the paragraph drops under a ~360px measure and starts to cramp;
              beyond it the plate has to move below the words, which doubles the
              card's height and makes an aside outweigh the step it annotates.
              `sizes` must track this width or the browser picks the 400w rung
              and the plate renders soft on a 2x display. */
          <SlotArt slot={art} ratio="5 / 3" sizes="(min-width: 640px) 288px, 100vw" className="w-full shrink-0 sm:w-72" />
        )}
      </div>
    </aside>
  );
}
