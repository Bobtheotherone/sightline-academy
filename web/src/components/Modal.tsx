import * as Dialog from "@radix-ui/react-dialog";
import { OctagonAlert, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { BlazeMarker } from "./BlazeMarker";
import { useOpenEnter } from "./overlayMotion";

/** Pine-tinted and blurred, never a flat neutral wash (DESIGN-001 §Depth). */
const scrimClass = (entered: boolean) =>
  `fixed inset-0 z-40 bg-pine-950/45 backdrop-blur-chrome transition-opacity duration-(--ts-dur-base) ease-(--ts-ease-out) ${
    entered ? "opacity-100" : "opacity-0"
  }`;

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

/** Mirrors Radix's open state for callers that leave the dialog uncontrolled. */
function useDialogOpen(open: boolean | undefined, onOpenChange?: (open: boolean) => void) {
  const [uncontrolled, setUncontrolled] = useState(false);
  const handleOpenChange = (next: boolean) => {
    setUncontrolled(next);
    onOpenChange?.(next);
  };
  return { isOpen: open ?? uncontrolled, handleOpenChange };
}

export type ModalTone = "default" | "danger";

/**
 * The house header mark: a tinted disc carrying the blaze, or the risk octagon
 * on a danger tint. A confirmation is the highest-stakes surface in the product
 * and the one where an untreated dialog is most obvious, so it is marked rather
 * than left as a centered white box.
 */
function ModalMark({ tone }: { tone: ModalTone }) {
  return tone === "danger" ? (
    <span
      aria-hidden
      className="grid size-9 shrink-0 place-items-center rounded-full bg-danger-100 text-danger-600"
    >
      <OctagonAlert className="size-5" strokeWidth={1.5} />
    </span>
  ) : (
    <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-pine-100">
      <BlazeMarker state="active" size="m" />
    </span>
  );
}

/** Centered dialog (Radix Dialog) — shadow-3, scale 0.96→1 + fade at base. */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  eyebrow,
  tone = "default",
  children,
  trigger,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  /** ALL-CAPS label over the title; defaults to the tone's own word. */
  eyebrow?: string;
  /** `danger` marks a destructive confirmation (DESIGN-005 §Destructive). */
  tone?: ModalTone;
  children: ReactNode;
  trigger?: ReactNode;
}) {
  const { isOpen, handleOpenChange } = useDialogOpen(open, onOpenChange);
  const entered = useOpenEnter(isOpen);
  const label = eyebrow ?? (tone === "danger" ? "This can't be undone" : "Confirm");
  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className={scrimClass(entered)} />
        <Dialog.Content
          className={`fixed top-1/2 left-1/2 z-50 w-[min(480px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-paper-50 shadow-(--ts-shadow-3) outline-none transition-all duration-(--ts-dur-base) ease-(--ts-ease-out) ${
            entered ? "scale-100 opacity-100" : "scale-[0.96] opacity-0"
          }`}
        >
          <div className="flex items-start gap-3.5 border-b border-line-200 px-6 pt-6 pb-5">
            <ModalMark tone={tone} />
            <div className="min-w-0 flex-1 pr-8">
              <p className={`ts-eyebrow ${tone === "danger" ? "text-danger-600!" : ""}`}>{label}</p>
              <Dialog.Title className="mt-1 font-display text-xl font-bold text-pine-950">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-2 text-sm text-ink-500">
                  {description}
                </Dialog.Description>
              )}
            </div>
          </div>
          <div className="px-6 py-5">{children}</div>
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
  onCloseAutoFocus,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  children: ReactNode;
  trigger?: ReactNode;
  width?: number;
  /** Controlled-open callers (no Dialog.Trigger) use this to return focus to
   * their opener on close, so keyboard users don't drop to <body> (QA-004). */
  onCloseAutoFocus?: (event: Event) => void;
}) {
  const { isOpen, handleOpenChange } = useDialogOpen(open, onOpenChange);
  const entered = useOpenEnter(isOpen);
  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className={scrimClass(entered)} />
        <Dialog.Content
          onCloseAutoFocus={onCloseAutoFocus}
          style={{ width: `min(${width}px, 100vw)` }}
          className={`fixed inset-y-0 right-0 z-50 flex flex-col border-l border-line-200 bg-paper-50 shadow-(--ts-shadow-3) outline-none transition-transform duration-(--ts-dur-slow) ease-(--ts-ease-out) ${
            entered ? "translate-x-0" : "translate-x-full"
          }`}
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
