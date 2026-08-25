/* The play layer's shared state (DESIGN-004 §Play): a lesson-scoped "sharp
 * streak" of consecutive FIRST-TRY successes across discrete challenges — a
 * checkpoint answered right first try, a sort card placed clean, a pair
 * matched clean, a cue spotted unaided. Accuracy only, never time (the XP law:
 * "never from speed"), and a miss resets the chain quietly — no shame UI.
 * Exploratory guesses (hotspot hunt misses) are scanning, not answers, so
 * renderers simply don't report them. Purely presentational: XP stays
 * server-authoritative and this state never leaves the client.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Sparkles } from "lucide-react";
import { useReducedMotion } from "./motion";
import { slotIconUrl } from "../assets/slotmap";

/** Chain lengths that earn a settle moment. Display caps at the last one. */
const MILESTONES = [3, 5, 8];
const CHAIN_CAP = 8;

interface StreakApi {
  streak: number;
  best: number;
  report: (firstTrySuccess: boolean) => void;
}

const noop = () => undefined;
const StreakContext = createContext<StreakApi>({ streak: 0, best: 0, report: noop });

/** Mount once per lesson (key by lessonId so a new trail starts fresh). */
export function StreakProvider({ children }: { children: ReactNode }) {
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const report = useCallback((ok: boolean) => {
    setStreak((s) => {
      const next = ok ? s + 1 : 0;
      if (ok) setBest((b) => Math.max(b, next));
      return next;
    });
  }, []);
  const value = useMemo(() => ({ streak, best, report }), [streak, best, report]);
  return <StreakContext.Provider value={value}>{children}</StreakContext.Provider>;
}

/** Safe anywhere: outside a provider it reports into the void. */
export function useStreak(): StreakApi {
  return useContext(StreakContext);
}

/**
 * The chain itself — mini blazes that grow with the streak. Hidden below two
 * (one right answer is expected, not an event), settles at each milestone,
 * and announces milestones politely for screen readers. Lives in the lesson
 * footer's center cell beside the step counter.
 */
export function StreakChain({ className = "" }: { className?: string }) {
  const { streak } = useStreak();
  if (streak < 2) return null;
  const shown = Math.min(streak, CHAIN_CAP);
  const milestone = MILESTONES.includes(streak);
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${milestone ? "ts-act-settle" : ""} ${className}`}
      aria-live="polite"
      aria-label={`Sharp streak: ${streak} first-try answers in a row`}
    >
      <span aria-hidden className="inline-flex items-center gap-1">
        {Array.from({ length: shown }, (_, i) => (
          <span
            key={i}
            className={`size-1.5 rotate-45 rounded-[2px] ${
              milestone ? "bg-clay-500" : "bg-pine-700"
            }`}
          />
        ))}
      </span>
      <span
        aria-hidden
        className={`font-mono text-xs ${milestone ? "font-medium text-clay-500" : "text-ink-500"}`}
      >
        ×{streak}
      </span>
    </span>
  );
}

/**
 * The clean-run ceremony (DESIGN-004 §Ceremonies): shown once when an activity
 * finishes with zero misses in this session. Badge-gold ground and the badge
 * tier's single shine sweep — earned, calm, no particles. Reduced motion gets
 * the settled card with no sweep travel (global rule collapses it).
 */
export function CleanRun({
  label = "Clean run",
  detail = "Every answer landed first try.",
  artSlot = "moment-clean-run",
}: {
  label?: string;
  detail?: string;
  /** Ceremony art (G-series moment); the sparkles square stands in when unproduced. */
  artSlot?: string;
}) {
  const reduced = useReducedMotion();
  const [sweep, setSweep] = useState<"idle" | "run" | "done">(reduced ? "done" : "idle");
  const started = useRef(false);
  useEffect(() => {
    if (reduced || started.current) return;
    started.current = true;
    const frame = requestAnimationFrame(() => setSweep("run"));
    const end = window.setTimeout(() => setSweep("done"), 800);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(end);
    };
  }, [reduced]);
  const artUrl = slotIconUrl(artSlot);
  return (
    <div className="ts-act-settle relative overflow-hidden rounded-sm border border-sun-400/60 bg-sun-100 px-4 py-3">
      <div className="flex items-center gap-3">
        {artUrl ? (
          /* Decorative — the banner's words carry the moment (BadgeMedal's rule). */
          <span className="w-20 shrink-0 overflow-hidden rounded-sm" aria-hidden>
            <img src={artUrl} alt="" decoding="async" className="aspect-[3/2] w-full object-cover" />
          </span>
        ) : (
          <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-sun-400/25">
            <Sparkles className="size-4 text-pine-950" strokeWidth={1.5} aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-pine-950">{label}</p>
          <p className="text-xs text-ink-500">{detail}</p>
        </div>
        <span className="ml-auto shrink-0 font-mono text-xs text-ink-500">0 misses</span>
      </div>
      {sweep !== "done" && (
        <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <span
            className={`absolute inset-y-0 w-1/3 -skew-x-12 bg-linear-to-r from-transparent via-paper-0/70 to-transparent transition-transform duration-(--ts-dur-epic) ease-(--ts-ease-in-out) ${
              sweep === "run" ? "translate-x-[420%]" : "-translate-x-[160%]"
            }`}
          />
        </span>
      )}
    </div>
  );
}
