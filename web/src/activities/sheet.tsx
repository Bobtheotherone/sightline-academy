/* BottomSheet — the shared mobile detail surface for activity renderers
 * (SPEC-007 §6 hotspot panel, §11 lab cards). Renders only below lg; desktop
 * layouts place the same content in an in-grid side panel instead. Slide-up
 * entrance per DESIGN-004 (reduced motion collapses it via the global rule).
 */
import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { useEntered } from "./motion";

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the sheet dialog. */
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return <SheetBody title={title} onClose={onClose}>{children}</SheetBody>;
}

function SheetBody({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const entered = useEntered();
  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-pine-950/40 transition-opacity duration-(--ts-dur-base) ${
          entered ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed inset-x-0 bottom-0 z-50 max-h-[75dvh] overflow-y-auto rounded-t-lg border-t border-line-200 bg-paper-0 shadow-raised transition-transform duration-(--ts-dur-base) ease-(--ts-ease-out) ${
          entered ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-line-200 bg-paper-0 px-5 py-3">
          <span aria-hidden className="mx-auto h-1 w-10 shrink-0 rounded-full bg-line-200" />
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-sm text-ink-500 transition-colors duration-(--ts-dur-fast) hover:bg-moss-100 hover:text-pine-950"
          >
            <X className="size-5" strokeWidth={1.5} aria-hidden />
          </button>
        </div>
        <div className="px-5 pb-6 pt-4">{children}</div>
      </div>
    </div>
  );
}
