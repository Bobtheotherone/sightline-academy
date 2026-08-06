import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { BlazeMarker, type BlazeState } from "./BlazeMarker";

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

/** Lesson list row (DESIGN-002 §Learning): order blaze, title, minutes, status. */
export function LessonRow({
  order,
  title,
  minutes,
  status,
  to,
  className = "",
}: {
  order: number;
  title: string;
  minutes: number;
  status: LessonRowStatus;
  /** Link target; omitted or locked renders a static row. */
  to?: string;
  className?: string;
}) {
  const interactive = Boolean(to) && status !== "locked";
  const body = (
    <div
      className={`flex items-center gap-4 rounded-sm border border-line-200 bg-paper-0 px-4 py-3.5 ${
        interactive
          ? "transition-all duration-150 ease-in-out hover:-translate-y-0.5 hover:border-pine-300"
          : status === "locked"
            ? "opacity-60"
            : ""
      } ${className}`}
    >
      <span className="flex shrink-0 items-center gap-2.5">
        <BlazeMarker state={BLAZE[status]} size="m" label={STATUS_TEXT[status]} />
        <span className="font-mono text-xs font-medium text-ink-500">
          {String(order).padStart(2, "0")}
        </span>
      </span>
      <span className="min-w-0 flex-1 truncate text-base font-medium text-pine-950">{title}</span>
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
