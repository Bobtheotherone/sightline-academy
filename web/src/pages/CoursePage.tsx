import { Link } from "react-router-dom";
import { Clock, Lock } from "lucide-react";
import { ContourPanel } from "../components/ContourPanel";
import { Card } from "../components/Card";
import { BlazeMarker } from "../components/BlazeMarker";
import { ProgressRing } from "../components/Progress";
import { MODULE_FACTS } from "../lib/modules";

/**
 * Course map (DESIGN-003): the trail-map motif full page — winding contour
 * path, six waypoints. First-run composition: Module 1 open, the rest locked
 * with unlock hints; per-user progress arrives with the course API.
 */
export default function CoursePage() {
  return (
    <ContourPanel variant="light" className="flex-1">
      <div className="mx-auto w-full max-w-page px-6 py-10 lg:px-12">
        <p className="ts-eyebrow">Course map</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold">The trail</h1>
        <p className="mt-2 max-w-xl text-ink-500">
          Six waypoints between here and your certificate. Finish a module to blaze the path to the
          next one.
        </p>

        <ol className="relative mt-12 flex flex-col gap-8 pb-8 lg:gap-2">
          <span
            className="absolute top-8 bottom-8 left-[9px] w-0.5 bg-pine-300/60 lg:left-1/2"
            aria-hidden
          />
          {MODULE_FACTS.map((mod, i) => {
            const unlocked = i === 0;
            const previous = i > 0 ? MODULE_FACTS[i - 1] : null;
            const card = (
              <Card
                interactive={unlocked}
                padding="m"
                className={unlocked ? "" : "opacity-80"}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="ts-eyebrow">Module {mod.order}</p>
                    <h2 className="mt-1 font-display text-xl font-bold">{mod.title}</h2>
                    <p className="mt-1.5 text-sm text-ink-500">{mod.tagline}</p>
                  </div>
                  {unlocked ? (
                    <ProgressRing value={0} size={48} strokeWidth={4} label={`${mod.title}: not started`}>
                      <span className="font-mono text-xs">0%</span>
                    </ProgressRing>
                  ) : (
                    <span className="grid size-12 shrink-0 place-items-center rounded-full border border-line-200 bg-moss-100">
                      <Lock className="size-4 text-ink-500" strokeWidth={1.5} aria-hidden />
                    </span>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line-200 pt-3">
                  <span className="flex items-center gap-1.5 font-mono text-xs text-ink-500">
                    <Clock className="size-3.5" strokeWidth={1.5} aria-hidden />
                    {mod.minutes} min
                  </span>
                  {unlocked ? (
                    <span className="text-sm font-medium text-pine-700">Start this module</span>
                  ) : (
                    <span className="text-xs text-ink-500">
                      Complete {previous?.title} to unlock
                    </span>
                  )}
                </div>
              </Card>
            );
            return (
              <li
                key={mod.id}
                className={`relative pl-10 lg:w-[calc(50%-32px)] lg:pl-0 ${
                  i % 2 === 0 ? "lg:self-start" : "lg:self-end"
                }`}
              >
                <span
                  className={`absolute top-8 left-0 lg:left-auto ${
                    i % 2 === 0 ? "lg:-right-[41px]" : "lg:-left-[41px]"
                  }`}
                >
                  <BlazeMarker
                    state={unlocked ? "active" : "locked"}
                    size="l"
                    label={unlocked ? `Module ${mod.order}: open` : `Module ${mod.order}: locked`}
                  />
                </span>
                <Link
                  to={`/course/${mod.id}`}
                  className="block rounded-md outline-offset-4"
                  aria-label={
                    unlocked
                      ? `Open Module ${mod.order}: ${mod.title}`
                      : `Module ${mod.order}: ${mod.title} (locked)`
                  }
                >
                  {card}
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </ContourPanel>
  );
}
