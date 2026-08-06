import { useMemo } from "react";
import type { SectionId } from "../lib/api";
import { BlazeMarker, type BlazeState } from "./BlazeMarker";

export const SECTION_LABELS: Record<SectionId, string> = {
  briefing: "Briefing",
  learn: "Learn",
  try: "Try",
  debrief: "Debrief",
  journal: "Journal",
  checkpoint: "Checkpoint",
};

export interface StepRailStep {
  id: string;
  title: string;
  section: SectionId;
}

interface SectionGroup {
  section: SectionId;
  steps: { step: StepRailStep; index: number }[];
}

/**
 * The lesson progress rail (DESIGN-002): section-grouped BlazeMarker dots with
 * the six-arc labels, current highlight, click-completed-to-revisit. Collapses
 * to a top bar below lg (DESIGN-003 §Responsive).
 */
export function StepRail({
  steps,
  currentId,
  completedIds,
  onSelect,
  className = "",
}: {
  steps: StepRailStep[];
  currentId: string;
  completedIds: ReadonlySet<string>;
  /** Called for the current step or a completed step (revisit). */
  onSelect?: (stepId: string) => void;
  className?: string;
}) {
  const groups = useMemo(() => {
    const out: SectionGroup[] = [];
    steps.forEach((step, index) => {
      const last = out[out.length - 1];
      if (last && last.section === step.section) last.steps.push({ step, index });
      else out.push({ section: step.section, steps: [{ step, index }] });
    });
    return out;
  }, [steps]);

  const currentIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === currentId),
  );
  const current = steps[currentIndex];

  const stateOf = (step: StepRailStep): BlazeState =>
    step.id === currentId ? "active" : completedIds.has(step.id) ? "done" : "todo";
  const reachable = (step: StepRailStep) =>
    step.id === currentId || completedIds.has(step.id);

  return (
    <nav aria-label="Lesson steps" className={className}>
      {/* Desktop: vertical, section-grouped */}
      <ol className="hidden flex-col gap-5 lg:flex">
        {groups.map((group, gi) => (
          <li key={`${group.section}-${gi}`}>
            <p className="ts-eyebrow">{SECTION_LABELS[group.section]}</p>
            <ol className="mt-2 flex flex-col gap-1">
              {group.steps.map(({ step }) => {
                const state = stateOf(step);
                const canGo = reachable(step) && Boolean(onSelect);
                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      disabled={!canGo}
                      onClick={() => onSelect?.(step.id)}
                      aria-current={step.id === currentId ? "step" : undefined}
                      className={`flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-left text-sm transition-colors duration-(--ts-dur-fast) ${
                        step.id === currentId
                          ? "bg-pine-300/20 font-medium text-pine-950"
                          : canGo
                            ? "text-ink-500 hover:bg-moss-100 hover:text-pine-950"
                            : "text-ink-500/60"
                      }`}
                    >
                      <BlazeMarker state={state} size="s" />
                      <span className="min-w-0 truncate">{step.title}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>

      {/* Mobile: collapsed top bar */}
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <div className="min-w-0">
          <p className="ts-eyebrow">{current ? SECTION_LABELS[current.section] : "Lesson"}</p>
          <p className="text-sm font-medium text-pine-950">
            Step {currentIndex + 1} of {steps.length}
          </p>
        </div>
        <ol className="flex shrink-0 items-center gap-1.5">
          {steps.map((step) => {
            const canGo = reachable(step) && Boolean(onSelect);
            return (
              <li key={step.id}>
                <button
                  type="button"
                  disabled={!canGo}
                  onClick={() => onSelect?.(step.id)}
                  aria-current={step.id === currentId ? "step" : undefined}
                  aria-label={`${step.title}${completedIds.has(step.id) ? " (completed)" : step.id === currentId ? " (current)" : ""}`}
                  className="grid size-6 place-items-center rounded-sm"
                >
                  <BlazeMarker state={stateOf(step)} size="s" />
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
