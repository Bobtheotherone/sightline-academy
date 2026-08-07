import { useEffect, useRef } from "react";
import type { SectionId } from "../lib/api";
import { Button } from "./Button";
import { useEntered } from "../activities/motion";
import { Glyph } from "./Glyph";
import { SECTION_GLYPHS, SECTION_LABELS } from "./StepRail";

/** One-line purpose per section (SPEC-006 §Section transitions). */
const SECTION_PURPOSE: Record<SectionId, string> = {
  briefing: "Set the scene before the work starts.",
  learn: "The ideas, laid out plainly.",
  try: "Put it to work — choices are safe here.",
  debrief: "Step back and make it yours.",
  journal: "Write it into your field journal.",
  checkpoint: "Show yourself it stuck.",
};

const DRIFT = `
@keyframes ts-interstitial-drift {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-48px, -32px, 0); }
}
.ts-interstitial-drift { animation: ts-interstitial-drift 1800ms var(--ts-ease-out) forwards; }
`;

/**
 * The Learn→Try etc. transition moment (DESIGN-004 moment 2): contour lines
 * translate slowly behind the section title fade (320ms), then auto-continue.
 * Skippable by click, Escape, or the Skip button; reduced-motion collapses the
 * drift via the global rule.
 */
export function SectionInterstitial({
  section,
  purpose,
  onDone,
  dwellMs = 1800,
}: {
  section: SectionId;
  /** Override the default one-line purpose. */
  purpose?: string;
  onDone: () => void;
  dwellMs?: number;
}) {
  const entered = useEntered();
  const doneRef = useRef(false);
  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    const t = window.setTimeout(() => finishRef.current(), dwellMs);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") finishRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [dwellMs]);

  return (
    <div
      role="status"
      aria-label={`Next section: ${SECTION_LABELS[section]}`}
      onClick={finish}
      className="fixed inset-0 z-50 grid cursor-pointer place-items-center overflow-hidden bg-moss-100"
    >
      <style>{DRIFT}</style>
      <div className="ts-contour ts-interstitial-drift absolute -inset-16" aria-hidden />
      <div
        className={`relative flex flex-col items-center px-6 text-center transition-all duration-(--ts-dur-slow) ease-(--ts-ease-out) ${
          entered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        {/* The section's own arc mark (B-055…B-060) inside a clay ring: this
         * moment gets ONE mark, and the section glyph is more specific than a
         * generic blaze. The ring keeps the clay accent the blaze carried.
         * Inside the entered container, so it shares the 320ms fade and the
         * global reduced-motion collapse. */}
        <span className="grid size-16 place-items-center rounded-full border border-clay-500/35 bg-paper-0/70 text-pine-950">
          <Glyph name={SECTION_GLYPHS[section]} size={36} />
        </span>
        <h2 className="mt-5 font-display text-3xl font-bold text-pine-950">
          {SECTION_LABELS[section]}
        </h2>
        <p className="mt-2 text-lg text-ink-500">{purpose ?? SECTION_PURPOSE[section]}</p>
        <Button
          variant="ghost"
          size="s"
          className="mt-8"
          onClick={(e) => {
            e.stopPropagation();
            finish();
          }}
        >
          Skip
        </Button>
      </div>
    </div>
  );
}
