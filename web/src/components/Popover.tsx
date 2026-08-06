import * as RadixPopover from "@radix-ui/react-popover";
import type { ReactNode } from "react";

/** Styled Radix Popover — paper surface, hairline border, raised shadow. */
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
  return (
    <RadixPopover.Root>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align={align}
          sideOffset={sideOffset}
          className={`z-50 rounded-md border border-line-200 bg-paper-0 p-2 shadow-raised outline-none transition-opacity duration-(--ts-dur-fast) data-[state=closed]:opacity-0 ${className}`}
        >
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
