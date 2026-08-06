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
import { BlazeMarker } from "./BlazeMarker";

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
        {items.map((item) => {
          const style = VARIANT_STYLES[item.variant];
          const big = item.variant === "levelUp";
          return (
            <RadixToast.Root
              key={item.key}
              duration={style.duration}
              onOpenChange={(open) => {
                if (!open) setItems((prev) => prev.filter((i) => i.key !== item.key));
              }}
              className={`relative overflow-hidden rounded-md border border-line-200 bg-paper-0 shadow-raised transition-all duration-(--ts-dur-base) ease-out data-[state=closed]:translate-x-4 data-[state=closed]:opacity-0 data-[state=open]:translate-x-0 data-[state=open]:opacity-100 ${
                big ? "p-5" : "p-4"
              }`}
            >
              <span className={`absolute inset-y-0 left-0 w-[3px] ${style.bar}`} aria-hidden />
              <div className="flex items-start gap-3 pl-1.5">
                {big ? (
                  <span className="relative mt-0.5 grid size-10 shrink-0 place-items-center">
                    <BlazeMarker state="active" size="l" />
                    <Award
                      className="absolute size-4 text-paper-0"
                      strokeWidth={2}
                      aria-hidden
                    />
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
        })}
        {/* Top-right, clear of the lesson player's sticky footer — a
         * bottom-right stack lands exactly on Continue/Finish (and the mobile
         * tab bar) and swallows their clicks for the toast's dwell time. */}
        <RadixToast.Viewport className="fixed top-20 right-4 z-50 flex w-[min(380px,calc(100vw-32px))] flex-col gap-2 outline-none" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}
