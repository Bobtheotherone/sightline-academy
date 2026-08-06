/* StabilityLab (SPEC-007 §11, Module 4) — showcase piece. Rear and side SVG
 * views of an ATV on a tiltable ground plane; sliders for slope, rider lean,
 * and rear cargo drive a simple 2D CoG model (stabilityModel.ts). Each view
 * draws the combined CoG plumb line against its support polygon and reports a
 * margin meter; the three objectives auto-detect from the slider sweeps. An
 * "About this model" popover owns the concept-model framing.
 */
import { useEffect, useState, type CSSProperties } from "react";
import { Info } from "lucide-react";
import { Popover } from "../../components/Popover";
import { computeRear, computeSide } from "./stabilityModel";
import { RearView, SideView } from "./StabilityScene";
import type { LabComponentProps } from "./index";

const RANGE_CSS = `
.ts-range { appearance: none; -webkit-appearance: none; height: 6px; border-radius: 999px; cursor: pointer;
  background: linear-gradient(to right, var(--ts-pine-700) var(--fill, 0%), var(--ts-line-200) var(--fill, 0%)); }
.ts-range::-webkit-slider-thumb { appearance: none; -webkit-appearance: none; width: 22px; height: 22px;
  border-radius: 50%; background: var(--ts-paper-0); border: 2.5px solid var(--ts-pine-700);
  box-shadow: var(--ts-shadow-soft); }
.ts-range::-moz-range-thumb { width: 17px; height: 17px; border-radius: 50%; background: var(--ts-paper-0);
  border: 2.5px solid var(--ts-pine-700); box-shadow: var(--ts-shadow-soft); }
`;

export function StabilityLab({ met, meet, revisit }: LabComponentProps) {
  const [slope, setSlope] = useState(0);
  const [lean, setLean] = useState(0);
  const [cargo, setCargo] = useState(0);
  const [edgeAngle, setEdgeAngle] = useState<number | null>(null);
  const [leanRestored, setLeanRestored] = useState(false);

  const leanFrac = lean / 100;
  const cargoFrac = cargo / 100;
  const rear = computeRear(slope, leanFrac, cargoFrac);
  const side = computeSide(slope, leanFrac, cargoFrac);
  const sideNoCargo = computeSide(slope, leanFrac, 0);

  /* Objective auto-detection (idempotent; `meet` ignores repeats). */
  useEffect(() => {
    if (!met.has("find_edge")) {
      if (leanFrac >= -0.3 && slope > 0 && rear.margin <= 0.005) {
        setEdgeAngle(slope);
        meet("find_edge");
      }
      return;
    }
    if (!met.has("lean_recovery")) {
      const fullUphill = leanFrac <= -0.85;
      const atOrPastEdge = edgeAngle === null || slope >= edgeAngle - 0.55;
      if (!leanRestored && fullUphill && atOrPastEdge && rear.margin > 0.04) {
        setLeanRestored(true);
      } else if (leanRestored && fullUphill && rear.margin <= 0.005) {
        meet("lean_recovery");
      }
    }
    if (
      !met.has("cargo_effect") &&
      cargoFrac >= 0.5 &&
      slope >= 10 &&
      sideNoCargo.margin - side.margin >= 0.06
    ) {
      meet("cargo_effect");
    }
    // Slider values drive detection; met/meet stay current because a met
    // change always follows a slider change within the same commit.
  }, [slope, lean, cargo]);

  return (
    <div className="flex flex-col gap-4">
      <style>{RANGE_CSS}</style>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-500">
          One ground control tilts both views — the rear view reads it as side-slope, the side view
          as grade.
        </p>
        <Popover
          align="end"
          className="w-80 p-4"
          trigger={
            <button
              type="button"
              className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-sm px-2 text-sm font-medium text-pine-700 transition-colors duration-(--ts-dur-fast) hover:bg-pine-300/25"
            >
              <Info className="size-4" strokeWidth={1.5} aria-hidden />
              About this model
            </button>
          }
        >
          <p className="text-sm font-semibold text-pine-950">
            A concept model — not an operating guide
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            This lab teaches the <em>shape</em> of the stability envelope: how slope, rider
            position, and load walk the center of gravity toward the support edge. The numbers are
            illustrative. Real limits vary by machine, load, tire pressure, surface, and momentum —
            always in the unfavorable direction — so respect for the real envelope means choosing
            different ground when you're not sure. Hands-on courses teach slope technique in
            person.
          </p>
        </Popover>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ViewPanel
          title="Rear view"
          subtitle="side-slope"
          angleLabel={`${slope.toFixed(1)}°`}
          margin={rear.margin}
          footnote={
            edgeAngle !== null
              ? `Edge found at ${edgeAngle.toFixed(1)}° — note how early that is.`
              : revisit
                ? "Objectives already met — sweep freely."
                : undefined
          }
        >
          <RearView slope={slope} lean={leanFrac} cargo={cargoFrac} phys={rear} />
        </ViewPanel>
        <ViewPanel
          title="Side view"
          subtitle="uphill grade"
          angleLabel={`${slope.toFixed(1)}°`}
          margin={side.margin}
          footnote={
            cargoFrac > 0.02
              ? `Cargo is costing ${Math.max(0, Math.round((sideNoCargo.margin - side.margin) * 100))} points of margin at this grade.`
              : undefined
          }
        >
          <SideView slope={slope} lean={leanFrac} cargo={cargoFrac} phys={side} />
        </ViewPanel>
      </div>

      <div
        className="grid gap-x-6 gap-y-4 rounded-md border border-line-200 bg-moss-100/60 p-4 sm:grid-cols-3"
        role="group"
        aria-label="Lab controls"
      >
        <SliderRow
          id="stab-slope"
          label="Ground slope"
          min={0}
          max={35}
          step={0.5}
          value={slope}
          onChange={setSlope}
          format={(v) => `${v.toFixed(1)}°`}
        />
        <SliderRow
          id="stab-lean"
          label="Rider lean"
          min={-100}
          max={100}
          step={5}
          value={lean}
          onChange={setLean}
          format={(v) =>
            v === 0 ? "centered" : v < 0 ? `${-v}% uphill` : `${v}% downhill`
          }
        />
        <SliderRow
          id="stab-cargo"
          label="Rear cargo"
          min={0}
          max={100}
          step={5}
          value={cargo}
          onChange={setCargo}
          format={(v) => (v === 0 ? "none" : `${v}% load`)}
        />
      </div>
    </div>
  );
}

/* ── Pieces ──────────────────────────────────────────────────────────────── */

function ViewPanel({
  title,
  subtitle,
  angleLabel,
  margin,
  footnote,
  children,
}: {
  title: string;
  subtitle: string;
  angleLabel: string;
  margin: number;
  footnote?: string;
  children: React.ReactNode;
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
      <footer className="border-t border-line-200 px-4 py-3">
        <MarginMeter margin={margin} />
        {footnote && <p className="mt-2 font-mono text-xs text-ink-500">{footnote}</p>}
      </footer>
    </section>
  );
}

function MarginMeter({ margin }: { margin: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, margin)) * 100);
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
        <div
          className={`h-full rounded-full transition-all duration-(--ts-dur-fast) ${status.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SliderRow({
  id,
  label,
  min,
  max,
  step,
  value,
  onChange,
  format,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
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
        aria-valuetext={format(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="ts-range mt-2.5 w-full"
        style={{ "--fill": `${fill}%` } as CSSProperties}
      />
    </div>
  );
}
