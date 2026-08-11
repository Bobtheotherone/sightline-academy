import * as RadixPopover from "@radix-ui/react-popover";
import { useState, type ReactNode } from "react";
import { useOpenEnter } from "./overlayMotion";

/** Styled Radix Popover — paper sheet, fade + 4px rise + scale 0.98→1 at fast. */
export function Popover({
  trigger,
  children,
  align = "end",
  sideOffset = 8,
  className = "",
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const entered = useOpenEnter(open);
  return (
    <RadixPopover.Root open={open} onOpenChange={setOpen}>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align={align}
          sideOffset={sideOffset}
          style={{ transformOrigin: "var(--radix-popover-content-transform-origin)" }}
          className={`z-50 rounded-md border border-line-200 bg-paper-50 p-2 shadow-(--ts-shadow-3) outline-none transition-all duration-(--ts-dur-fast) ease-(--ts-ease-out) ${
            entered
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-1 scale-[0.98] opacity-0"
          } ${className}`}
        >
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
