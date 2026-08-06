import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

const overlayClass =
  "fixed inset-0 z-40 bg-pine-950/40 transition-opacity duration-(--ts-dur-base) data-[state=closed]:opacity-0 data-[state=open]:opacity-100";

function CloseButton() {
  return (
    <Dialog.Close asChild>
      <button
        type="button"
        aria-label="Close"
        className="absolute top-4 right-4 grid size-9 place-items-center rounded-sm text-ink-500 transition-colors duration-(--ts-dur-fast) hover:bg-moss-100 hover:text-pine-950"
      >
        <X className="size-5" strokeWidth={1.5} aria-hidden />
      </button>
    </Dialog.Close>
  );
}

/** Centered dialog (Radix Dialog) — radius-lg panel, raised shadow. */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  trigger?: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className={overlayClass} />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(480px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line-200 bg-paper-0 p-6 shadow-raised outline-none transition-all duration-(--ts-dur-base) ease-out data-[state=closed]:scale-95 data-[state=closed]:opacity-0 data-[state=open]:scale-100 data-[state=open]:opacity-100">
          <Dialog.Title className="pr-10 font-display text-xl font-bold text-pine-950">
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description className="mt-2 text-sm text-ink-500">
              {description}
            </Dialog.Description>
          )}
          <div className="mt-5">{children}</div>
          <CloseButton />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Right-hand slide-over (Radix Dialog) — hosts Ranger on lesson pages. */
export function SlideOver({
  open,
  onOpenChange,
  title,
  children,
  trigger,
  width = 440,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  children: ReactNode;
  trigger?: ReactNode;
  width?: number;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className={overlayClass} />
        <Dialog.Content
          style={{ width: `min(${width}px, 100vw)` }}
          className="fixed inset-y-0 right-0 z-50 flex flex-col border-l border-line-200 bg-paper-0 shadow-raised outline-none transition-transform duration-(--ts-dur-slow) ease-out data-[state=closed]:translate-x-full data-[state=open]:translate-x-0"
        >
          <header className="relative border-b border-line-200 px-6 py-4">
            <Dialog.Title className="pr-10 font-display text-lg font-bold text-pine-950">
              {title}
            </Dialog.Title>
            <CloseButton />
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
