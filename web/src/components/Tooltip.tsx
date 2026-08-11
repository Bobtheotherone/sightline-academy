import * as RadixTooltip from "@radix-ui/react-tooltip";
import { useState, type ReactNode } from "react";
import { useOpenEnter } from "./overlayMotion";

/** App-wide provider — mount once in providers. */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return <RadixTooltip.Provider delayDuration={300}>{children}</RadixTooltip.Provider>;
}

/** Styled Radix Tooltip — dark pine chip, fade + 4px rise at fast. */
export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) {
  const [open, setOpen] = useState(false);
  const entered = useOpenEnter(open);
  return (
    <RadixTooltip.Root open={open} onOpenChange={setOpen}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          className={`z-50 rounded-sm bg-pine-950 px-2.5 py-1.5 text-xs font-medium text-paper-0 shadow-(--ts-shadow-2) transition-all duration-(--ts-dur-fast) ease-(--ts-ease-out) ${
            entered ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
          }`}
        >
          {content}
          <RadixTooltip.Arrow className="fill-pine-950" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
