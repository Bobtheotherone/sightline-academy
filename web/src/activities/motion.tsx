/* Shared motion primitives (DESIGN-004 v2). Keyframes live in app.css — this
 * module owns the JS-driven half: the reduced-motion check, the product-wide
 * entrance `Reveal`, `CountUp`, and the activity micro-motion helpers.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

function prefersReduced(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(REDUCE_QUERY).matches
  );
}

/**
 * True when the OS asks for reduced motion. The CSS kill-switch only zeroes
 * durations — anything JS-driven must jump to its end state (DESIGN-004 §6).
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReduced);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(REDUCE_QUERY);
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * Fires once when the node reaches ~10% inside the viewport. Without an
 * observer (or with motion off) it reports visible immediately — content is
 * never gated behind an animation that cannot run.
 */
function useInView<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!enabled || inView) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver !== "function") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled, inView]);
  return [ref, inView] as const;
}

/**
 * The product-wide entrance (DESIGN-004 §Choreography): rise 12px + fade at
 * `slow`, 60ms per sibling via `index`, IntersectionObserver-driven below the
 * fold, once — never re-hidden. Reduced motion renders the end state on the
 * first paint. Transform and opacity only.
 */
export function Reveal({
  index = 0,
  delay,
  className = "",
  children,
}: {
  /** Sibling position — sets the 60ms stagger. */
  index?: number;
  /** Explicit delay in ms; overrides the index stagger. */
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>(!reduced);
  const shown = reduced || inView;
  return (
    <div
      ref={ref}
      style={reduced ? undefined : { transitionDelay: `${delay ?? index * 60}ms` }}
      className={`transition-[opacity,translate] duration-(--ts-dur-slow) ease-(--ts-ease-out) ${
        shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Numbers are a feature (DESIGN-001): mono, tabular, counting to `value` over
 * 600ms the first time it is revealed. Reduced motion prints the value. The
 * animating digits are hidden from assistive tech; the final value is not.
 */
export function CountUp({
  value,
  duration = 600,
  delay = 0,
  prefix = "",
  suffix = "",
  format,
  className = "",
}: {
  value: number;
  /** Count duration in ms (DESIGN-004 default: 600). */
  duration?: number;
  /** Start delay in ms — parents stagger siblings by 60ms steps. */
  delay?: number;
  prefix?: string;
  suffix?: string;
  /** Custom numeral rendering, e.g. thousands separators. */
  format?: (n: number) => string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLSpanElement>(!reduced);
  const [display, setDisplay] = useState(() => (prefersReduced() ? value : 0));

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    if (!inView) return;
    let raf = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * value));
      if (t < 1) raf = window.requestAnimationFrame(tick);
    };
    const timer = window.setTimeout(() => {
      raf = window.requestAnimationFrame(tick);
    }, delay);
    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(raf);
    };
  }, [reduced, inView, value, duration, delay]);

  const render = format ?? ((n: number) => String(n));
  return (
    <span ref={ref} className={`font-mono tabular-nums ${className}`}>
      <span aria-hidden>
        {prefix}
        {render(display)}
        {suffix}
      </span>
      <span className="sr-only">
        {prefix}
        {render(value)}
        {suffix}
      </span>
    </span>
  );
}

/**
 * No-op shim: the ts-act-* keyframes now live in app.css (DESIGN-004
 * §Performance — keyframes belong to the stylesheet, not to <style> tags).
 * ActivityHost still mounts this, so the export stays.
 */
export function ActivityMotionStyles() {
  return null;
}

/**
 * Mount-entrance hook: false on first paint, true one tick (+delay) later, so
 * transition utilities animate in. Reduced motion still resolves — the global
 * rule makes the transition instant.
 */
export function useEntered(delayMs = 0): boolean {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setEntered(true), Math.max(delayMs, 20));
    return () => window.clearTimeout(t);
  }, [delayMs]);
  return entered;
}

/** Fade + 8px rise on mount (the FeedbackStrip entrance, moment 1). */
export function RiseIn({
  delay = 0,
  className = "",
  children,
}: {
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const entered = useEntered(delay);
  return (
    <div
      className={`transition-all duration-(--ts-dur-base) ease-(--ts-ease-out) ${
        entered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/** Left-to-right unmask wipe (the prediction_reveal moment 4). */
export function Unmask({
  delay = 0,
  instant = false,
  className = "",
  children,
}: {
  delay?: number;
  /** Revisit mode: show without animating. */
  instant?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const entered = useEntered(delay);
  const open = instant || entered;
  return (
    <div
      style={{
        clipPath: open ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
        transition: instant
          ? "none"
          : "clip-path var(--ts-dur-base) var(--ts-ease-out)",
      }}
      className={className}
    >
      {children}
    </div>
  );
}

/**
 * The correct-drop check: blaze diamond with the check stroke drawing in over
 * 150ms (DESIGN-004 moment 1).
 */
export function BlazeCheckDraw({ className = "" }: { className?: string }) {
  return (
    <span
      className={`relative inline-grid size-5 shrink-0 place-items-center ${className}`}
      aria-hidden
    >
      <span className="size-3.5 rotate-45 rounded-[3px] bg-pine-700" />
      <svg viewBox="0 0 16 16" className="absolute size-3 text-paper-0">
        <path
          d="M3 8.5 6.5 12 13 5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ts-act-draw"
        />
      </svg>
    </span>
  );
}
