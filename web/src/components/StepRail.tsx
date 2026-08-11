import { useMemo } from "react";
import type { SectionId } from "../lib/api";
import { BlazeMarker, type BlazeState } from "./BlazeMarker";
import { Glyph } from "./Glyph";

/** Section arc mark per section (VISUAL_ASSETS B-055…B-060). */
export const SECTION_GLYPHS: Record<SectionId, string> = {
  briefing: "section-briefing",
  learn: "section-learn",
  try: "section-try",
  debrief: "section-debrief",
  journal: "section-journal",
  checkpoint: "section-checkpoint",
};

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

/** Heading tone per group state — the glyph inherits it via currentColor. */
const GROUP_TONE: Record<BlazeState, string> = {
  active: "text-pine-950",
  done: "text-pine-700",
  todo: "text-ink-500",
  locked: "text-ink-500",
};

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

  /** How far the spine has filled: completed steps over the group's length. */
  const groupFill = (group: SectionGroup) => {
    const done = group.steps.filter(({ step }) => completedIds.has(step.id)).length;
    return (done / group.steps.length) * 100;
  };

  /** A group is where you are, behind you, or still ahead. */
  const groupState = (group: SectionGroup): BlazeState =>
    group.steps.some(({ step }) => step.id === currentId)
      ? "active"
      : group.steps.every(({ step }) => completedIds.has(step.id))
        ? "done"
        : "todo";

  return (
    <nav aria-label="Lesson steps" className={className}>
      {/* Desktop: vertical, section-grouped */}
      <ol className="hidden flex-col gap-5 lg:flex">
        {groups.map((group, gi) => (
          <li key={`${group.section}-${gi}`}>
            {/* The section mark tints with the group's state off currentColor. */}
            <p
              className={`ts-eyebrow flex items-center gap-1.5 ${
                GROUP_TONE[groupState(group)]
              }`}
            >
              <Glyph name={SECTION_GLYPHS[group.section]} size={16} />
              {SECTION_LABELS[group.section]}
            </p>
            {/* The section spine: a hairline through the blaze column whose
             * filled portion grows as the group's steps complete. */}
            <div className="relative mt-2">
              <span
                aria-hidden
                className="absolute top-2 bottom-2 left-[13px] w-0.5 -translate-x-1/2 rounded-full bg-line-200"
              >
                <span
                  className="block w-full rounded-full bg-pine-700 transition-[height] duration-(--ts-dur-slow) ease-(--ts-ease-out)"
                  style={{ height: `${groupFill(group)}%` }}
                />
              </span>
              <ol className="relative flex flex-col gap-1">
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
                        <BlazeMarker
                          state={state}
                          size="s"
                          current={step.id === currentId}
                        />
                        <span className="min-w-0 truncate">{step.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          </li>
        ))}
      </ol>

      {/* Mobile: collapsed top bar */}
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <div className="min-w-0">
          <p className="ts-eyebrow flex items-center gap-1.5 text-pine-950">
            {current && <Glyph name={SECTION_GLYPHS[current.section]} size={16} />}
            {current ? SECTION_LABELS[current.section] : "Lesson"}
          </p>
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
                  <BlazeMarker
                    state={stateOf(step)}
                    size="s"
                    current={step.id === currentId}
                  />
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
