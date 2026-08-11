import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { BlazeMarker, type BlazeState } from "./BlazeMarker";
import { lessonCardUrl } from "../assets/slotmap";

export type LessonRowStatus = "locked" | "todo" | "active" | "done";

const STATUS_TEXT: Record<LessonRowStatus, string> = {
  locked: "Locked",
  todo: "Not started",
  active: "In progress",
  done: "Complete",
};

const BLAZE: Record<LessonRowStatus, BlazeState> = {
  locked: "locked",
  todo: "todo",
  active: "active",
  done: "done",
};

/**
 * Lesson list row (DESIGN-002 §Learning): order blaze, card art, title, minutes,
 * status.
 *
 * Locked rows are muted by surface and ink, never by a wrapper opacity: a
 * blanket fade dragged the title and meta under 4.5:1, and a locked row is
 * still how the module previews itself. The recessed moss-50 ground, the
 * grayscale thumbnail and the lock blaze carry the state instead.
 *
 * The card art (VISUAL_ASSETS B-001…B-022) is decorative — `alt=""`, aria-hidden
 * — because the title sitting beside it says the same thing in words, and the
 * row is already a link with an accessible name. It sits after the blaze so the
 * ordered-list anchor keeps one fixed column.
 *
 * It hides below `md:` rather than `sm:` because that is where the measurement
 * put the line: at 640 px the art leaves the title 241 px and the longest
 * lesson name ("Crossings, Passengers & Loads") starts to ellipsize, which it
 * does not do today; at 768 px the title still has 369 px and every name fits.
 * Below `md:` the row therefore renders exactly as it did before the art.
 */
export function LessonRow({
  order,
  title,
  minutes,
  status,
  lessonId,
  to,
  animateBlaze = false,
  className = "",
}: {
  order: number;
  title: string;
  minutes: number;
  status: LessonRowStatus;
  /** Lesson id (e.g. "m2-l3-walkaround"); resolves the card art. */
  lessonId?: string;
  /** Link target; omitted or locked renders a static row. */
  to?: string;
  /** Draw the completed row's blaze check on mount (just-finished contexts). */
  animateBlaze?: boolean;
  className?: string;
}) {
  const interactive = Boolean(to) && status !== "locked";
  const locked = status === "locked";
  const art = lessonId ? lessonCardUrl(lessonId) : undefined;
  const body = (
    <div
      className={`flex items-center gap-4 rounded-sm border border-line-200 px-4 py-3.5 shadow-1 ${
        locked ? "bg-moss-50" : "bg-paper-0"
      } ${
        interactive
          ? "transition-all duration-(--ts-dur-fast) ease-(--ts-ease-out) hover:-translate-y-[3px] hover:border-pine-300 hover:shadow-2"
          : ""
      } ${className}`}
    >
      <span className="flex shrink-0 items-center gap-2.5">
        <BlazeMarker
          state={BLAZE[status]}
          size="m"
          current={status === "active"}
          animateOnMount={animateBlaze}
          label={STATUS_TEXT[status]}
        />
        <span className="font-mono text-xs font-medium text-ink-500">
          {String(order).padStart(2, "0")}
        </span>
      </span>
      {art && (
        <img
          src={art}
          alt=""
          aria-hidden
          width={320}
          height={180}
          loading="lazy"
          decoding="async"
          className={`hidden h-auto w-24 shrink-0 rounded-sm border border-line-200 bg-paper-0 md:block ${
            locked ? "opacity-70 grayscale" : ""
          }`}
        />
      )}
      <span
        className={`min-w-0 flex-1 truncate text-base font-medium ${
          locked ? "text-ink-500" : "text-pine-950"
        }`}
      >
        {title}
      </span>
      <span className="hidden shrink-0 items-center gap-1.5 text-sm text-ink-500 sm:inline-flex">
        <Clock className="size-4" strokeWidth={1.5} aria-hidden />
        {minutes} min
      </span>
      <span
        className={`shrink-0 text-xs font-medium ${
          status === "done" ? "text-pine-700" : status === "active" ? "text-clay-500" : "text-ink-500"
        }`}
      >
        {STATUS_TEXT[status]}
      </span>
    </div>
  );

  if (interactive && to) {
    return (
      <Link to={to} className="block rounded-sm">
        {body}
      </Link>
    );
  }
  return body;
}
