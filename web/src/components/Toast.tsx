import * as RadixToast from "@radix-ui/react-toast";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Info, AlertCircle, Award } from "lucide-react";
import { ProgressRing } from "./Progress";
import { useEntered } from "../activities/motion";

export type ToastVariant = "success" | "info" | "error" | "levelUp";

export interface ToastOptions {
  variant: ToastVariant;
  title: string;
  description?: string;
  /** Small print under the description, mono (e.g. incident id). */
  finePrint?: string;
}

interface ToastItem extends ToastOptions {
  key: number;
}

const ToastContext = createContext<{ toast: (opts: ToastOptions) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const VARIANT_STYLES: Record<
  ToastVariant,
  { bar: string; icon: ReactNode; duration: number }
> = {
  success: {
    bar: "bg-pine-700",
    icon: <CheckCircle2 className="size-5 text-pine-700" strokeWidth={1.5} />,
    duration: 4000,
  },
  info: {
    bar: "bg-sky-600",
    icon: <Info className="size-5 text-sky-600" strokeWidth={1.5} />,
    duration: 4000,
  },
  error: {
    bar: "bg-danger-600",
    icon: <AlertCircle className="size-5 text-danger-600" strokeWidth={1.5} />,
    duration: 6000,
  },
  levelUp: {
    bar: "bg-clay-500",
    icon: <Award className="size-6 text-clay-500" strokeWidth={1.5} />,
    duration: 5000,
  },
};

/**
 * The level-up emblem (DESIGN-004 ceremony 4): the ring draws closed from zero
 * on mount, and the emblem ticks over on spring as the ring lands.
 */
function LevelEmblem() {
  const drawn = useEntered();
  const ticked = useEntered(420);
  return (
    <ProgressRing value={drawn ? 100 : 0} size={40} strokeWidth={4} label="Level reached">
      <span
        className={`transition-transform duration-(--ts-dur-base) ease-(--ts-ease-spring) ${
          ticked ? "scale-100" : "scale-[0.85]"
        }`}
      >
        <Award className="size-4 text-clay-500" strokeWidth={2} aria-hidden />
      </span>
    </ProgressRing>
  );
}

function ToastRow({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const style = VARIANT_STYLES[item.variant];
  const big = item.variant === "levelUp";
  const entered = useEntered();
  return (
    <RadixToast.Root
      duration={style.duration}
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
      className={`relative overflow-hidden rounded-md border border-line-200 bg-paper-50 shadow-(--ts-shadow-3) transition-all data-[state=closed]:opacity-0 ${
        big
          ? "p-5 duration-(--ts-dur-slow) ease-(--ts-ease-spring)"
          : "p-4 duration-(--ts-dur-base) ease-(--ts-ease-out)"
      } ${entered ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"}`}
    >
      <span className={`absolute inset-y-0 left-0 w-[3px] ${style.bar}`} aria-hidden />
      <div className="flex items-start gap-3 pl-1.5">
        {big ? (
          <span className="mt-0.5 shrink-0">
            <LevelEmblem />
          </span>
        ) : (
          <span className="mt-0.5 shrink-0">{style.icon}</span>
        )}
        <div className="min-w-0">
          <RadixToast.Title
            className={`font-semibold text-pine-950 ${big ? "font-display text-lg" : "text-sm"}`}
          >
            {item.title}
          </RadixToast.Title>
          {item.description && (
            <RadixToast.Description className="mt-0.5 text-sm text-ink-500">
              {item.description}
            </RadixToast.Description>
          )}
          {item.finePrint && (
            <p className="mt-1 font-mono text-xs text-ink-500">{item.finePrint}</p>
          )}
        </div>
      </div>
    </RadixToast.Root>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((opts: ToastOptions) => {
    setItems((prev) => [...prev.slice(-3), { ...opts, key: Date.now() + Math.random() }]);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      <RadixToast.Provider swipeDirection="right">
        {children}
        {items.map((item) => (
          <ToastRow
            key={item.key}
            item={item}
            onDismiss={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}
          />
        ))}
        {/* Top-right, clear of the lesson player's sticky footer — a
         * bottom-right stack lands exactly on Continue/Finish (and the mobile
         * tab bar) and swallows their clicks for the toast's dwell time. */}
        <RadixToast.Viewport className="fixed top-20 right-4 z-50 flex w-[min(380px,calc(100vw-32px))] flex-col gap-2 outline-none" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}
