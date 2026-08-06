import * as RadixTooltip from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

/** App-wide provider — mount once in providers. */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return <RadixTooltip.Provider delayDuration={300}>{children}</RadixTooltip.Provider>;
}

/** Styled Radix Tooltip — dark pine chip, small type. */
export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          className="z-50 rounded-sm bg-pine-950 px-2.5 py-1.5 text-xs font-medium text-paper-0 shadow-soft"
        >
          {content}
          <RadixTooltip.Arrow className="fill-pine-950" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
