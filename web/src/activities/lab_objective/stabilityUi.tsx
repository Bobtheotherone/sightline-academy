/* Shared parts for the stability lab. The slider row, margin meter and view
 * panel moved here out of StabilityLab.tsx so the scenario game and the
 * free-tilt sandbox draw from one set; the scenario card, stance toggle, run
 * progress bar, the "About this simulation" popover and the outcome copy
 * joined them. Three helpers read a simulated frame for both the lab and the
 * stage: marginOf, dominantSlope and the parked previewFrame. Nothing here
 * holds game state and nothing here decides a run.
 */
import type { CSSProperties, ReactNode } from "react";
import { Check, Info, Lock } from "lucide-react";
import { Popover } from "../../components/Popover";
import type { Stance } from "./stabilityModel";
/* The old scene is here for the free-tilt sandbox alone — the scenario game
 * draws on StabilityStage now. SceneView is the sandbox's one way in. */

/** The range input's track fill and thumb — brand tokens, no raw hex. */
export const RANGE_CSS = `
.ts-range { appearance: none; -webkit-appearance: none; height: 6px; border-radius: 999px; cursor: pointer;
  background: linear-gradient(to right, var(--ts-pine-700) var(--fill, 0%), var(--ts-line-200) var(--fill, 0%)); }
.ts-range:disabled { cursor: not-allowed; opacity: 0.55; }
.ts-range::-webkit-slider-thumb { appearance: none; -webkit-appearance: none; width: 22px; height: 22px;
  border-radius: 50%; background: var(--ts-paper-0); border: 2.5px solid var(--ts-pine-700);
  box-shadow: var(--ts-shadow-soft); }
.ts-range::-moz-range-thumb { width: 17px; height: 17px; border-radius: 50%; background: var(--ts-paper-0);
  border: 2.5px solid var(--ts-pine-700); box-shadow: var(--ts-shadow-soft); }
`;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** The free-tilt scene, dispatched by view — the sandbox's one entry point. */

/* ── Reading a run frame ─────────────────────────────────────────────────── */

/**
 * The one margin number the meter, the plumb overlay and the outcome copy all
 * read: how far the composite centre of gravity still is from the nearer
 * contact patch, as a fraction of the half-support. 1 is dead centre; 0 means
 * the plumb line has reached an edge and the machine is going over.
 */

/** The steepest degree in the profile — its sign says climb or descent. */

/* Preview geometry in metres, the figures the sprites are scaled to: wheelbase
 * 1.25, wheel radius 0.28, chassis body centre 0.48 above the ground. */

/**
 * The machine parked at the start line. The stage only ever draws a RunFrame,
 * so the setup preview has to be one: a still pose, with the plumb-line maths
 * the free-tilt sandbox uses putting the centre of gravity where this setup
 * would put it. The simulation's own frames replace all of it on Play.
 */

/* ── Panels and meters ───────────────────────────────────────────────────── */

export function ViewPanel({
  title,
  subtitle,
  angleLabel,
  margin,
  footnote,
  footerExtra,
  children,
}: {
  title: string;
  subtitle: string;
  angleLabel: string;
  margin: number;
  footnote?: string;
  /** Run progress, scrubber — anything that belongs under the meter. */
  footerExtra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={`${title} — ${subtitle}`}
      className="overflow-hidden rounded-md border border-line-200 bg-paper-0"
    >
      <header className="flex items-baseline justify-between gap-2 border-b border-line-200 px-4 py-2.5">
        <p className="text-sm font-semibold text-pine-950">
          {title} <span className="font-normal text-ink-500">— {subtitle}</span>
        </p>
        <p className="font-mono text-sm text-pine-700">{angleLabel}</p>
      </header>
      {children}
      <footer className="flex flex-col gap-3 border-t border-line-200 px-4 py-3">
        <MarginMeter margin={margin} />
        {footnote && <p className="font-mono text-xs text-ink-500">{footnote}</p>}
        {footerExtra}
      </footer>
    </section>
  );
}

export function MarginMeter({ margin }: { margin: number }) {
  const pct = Math.round(clamp01(margin) * 100);
  const over = margin <= 0.005;
  const status = over
    ? { word: "Over the edge", bar: "bg-danger-600", text: "text-danger-600" }
    : margin < 0.15
      ? { word: "Critical", bar: "bg-danger-600", text: "text-danger-600" }
      : margin < 0.4
        ? { word: "Thinning", bar: "bg-sun-400", text: "text-pine-950" }
        : { word: "Solid", bar: "bg-pine-700", text: "text-pine-950" };
  return (
    <div aria-label={`Stability margin ${pct} percent — ${status.word}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-ink-500">Stability margin</span>
        <span className={`font-mono text-xs font-medium ${status.text}`}>
          {pct}% · {status.word}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line-200">
        {/* No transition: the bar is driven frame by frame during a run, and a
         * 150ms ease would lag the machine it is describing. */}
        <div className={`h-full rounded-full ${status.bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** How far along the run you are, with the trail event marked where it sits. */
export function RunProgress({
  s,
  event,
}: {
  s: number;
  event?: { s: number; label: string } | null;
}) {
  const pct = clamp01(s) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-ink-500">Along the run</span>
        <span className="font-mono text-xs text-ink-500">{Math.round(pct)}%</span>
      </div>
      <div className="relative mt-1.5 h-2 rounded-full bg-line-200">
        <div
          className="h-full rounded-full bg-pine-700"
          style={{ width: `${pct}%` }}
          aria-hidden
        />
        {event && (
          <span
            aria-hidden
            className="absolute top-1/2 h-3.5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-clay-500"
            style={{ left: `${clamp01(event.s) * 100}%` }}
          />
        )}
      </div>
      {event && (
        <p className="mt-1.5 font-mono text-xs text-ink-500">
          <span className="text-clay-500">|</span> {event.label}
        </p>
      )}
    </div>
  );
}

/* ── Controls ────────────────────────────────────────────────────────────── */

export function SliderRow({
  id,
  label,
  min,
  max,
  step,
  value,
  onChange,
  format,
  disabled = false,
  hint,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
  disabled?: boolean;
  /** One short line under the track — what the ends mean, or why it is locked. */
  hint?: string;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-pine-950">
          {label}
        </label>
        <span className="font-mono text-sm text-pine-700">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={format(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="ts-range mt-2.5 w-full"
        style={{ "--fill": `${fill}%` } as CSSProperties}
      />
      {hint && (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-ink-500">
          {disabled && <Lock className="mt-0.5 size-3 shrink-0" strokeWidth={2} aria-hidden />}
          {hint}
        </p>
      )}
    </div>
  );
}

export function StanceToggle({
  value,
  onChange,
}: {
  value: Stance;
  onChange: (v: Stance) => void;
}) {
  const options: { id: Stance; label: string }[] = [
    { id: "seated", label: "Seated" },
    { id: "standing", label: "Standing" },
  ];
  return (
    <div>
      <p id="stab-stance-label" className="text-sm font-medium text-pine-950">
        Stance
      </p>
      <div
        role="group"
        aria-labelledby="stab-stance-label"
        className="mt-2.5 grid grid-cols-2 gap-1 rounded-sm border border-line-200 bg-paper-0 p-1"
      >
        {options.map((opt) => {
          const on = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(opt.id)}
              className={`min-h-11 cursor-pointer rounded-sm px-2 text-sm font-medium transition-all duration-(--ts-dur-fast) ease-(--ts-ease-out) active:scale-[0.98] ${
                on ? "bg-pine-700 text-paper-0" : "text-pine-950 hover:bg-moss-100"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-ink-500">
        {value === "standing"
          ? "You ride the pegs — your weight drops and moves further."
          : "You ride the seat — your weight sits high and stays where it is."}
      </p>
    </div>
  );
}

/* ── Scenario rail card ──────────────────────────────────────────────────── */

export function ScenarioCard({
  title,
  eyebrow,
  view,
  selected,
  cleared,
  onSelect,
}: {
  title: string;
  eyebrow: string;
  view: "rear" | "side";
  selected: boolean;
  cleared: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex min-h-11 w-full cursor-pointer flex-col items-start gap-1 rounded-md border px-3.5 py-3 text-left transition-all duration-(--ts-dur-fast) ease-(--ts-ease-out) active:scale-[0.99] ${
        selected
          ? "border-pine-700 bg-pine-100"
          : "border-line-200 bg-paper-0 hover:-translate-y-0.5 hover:border-pine-300"
      }`}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="ts-eyebrow">{eyebrow}</span>
        {cleared && (
          <>
            <Check className="size-4 shrink-0 text-pine-700" strokeWidth={2.5} aria-hidden />
            <span className="sr-only">Cleared</span>
          </>
        )}
      </span>
      <span className="text-sm font-semibold text-pine-950">{title}</span>
      <span className="font-mono text-xs text-ink-500">
        {view === "rear" ? "rear view" : "side view"}
      </span>
    </button>
  );
}

/* ── Copy helpers ────────────────────────────────────────────────────────── */

/**
 * Lean words that are true for the view you are looking at. Negative lean is
 * always into the hill; what that looks like changes — screen-left in the rear
 * view, forward on a climb, back on a descent.
 */
export function leanWords(view: "rear" | "side", slopeSign: number, v: number): string {
  if (v === 0) return "centered";
  const n = Math.abs(v);
  if (view === "rear") return v < 0 ? `${n}% into the hill` : `${n}% downhill`;
  if (slopeSign < 0) return v < 0 ? `${n}% back, into the hill` : `${n}% forward, downhill`;
  return v < 0 ? `${n}% forward, into the hill` : `${n}% back, downhill`;
}

/** What the lean slider's two ends do, for the view in front of you. */
export function leanHint(view: "rear" | "side", slopeSign: number): string {
  if (view === "rear") return "Left of center hangs you up the hill; right hangs you downhill.";
  if (slopeSign < 0) return "Left of center moves you back off the bars; right sends you over them.";
  return "Left of center moves you forward over the bars; right sits you back.";
}

export function AboutSimulation() {
  return (
    <Popover
      align="end"
      className="w-80 p-4"
      trigger={
        <button
          type="button"
          className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-sm px-2 text-sm font-medium text-pine-700 transition-colors duration-(--ts-dur-fast) hover:bg-pine-300/25"
        >
          <Info className="size-4" strokeWidth={1.5} aria-hidden />
          About this simulation
        </button>
      }
    >
      <p className="text-sm font-semibold text-pine-950">About this simulation</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">
        The numbers here are illustrative. What they show you honestly is the shape of the problem:
        where your weight sits, and how close its plumb line runs to the tires holding you up. Real
        limits move with the machine, the tires and their pressure, the surface, moisture, and
        momentum — and they move in the unfavorable direction. Clearing a run here does not mean
        you clear that ground outside. Steep and off-camber riding is learned in person, on ground
        an instructor has picked for you.
      </p>
    </Popover>
  );
}




/** Outcome banner content: the scenario's plain-language why, plus one fact. */
