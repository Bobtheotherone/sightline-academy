import { Link } from "react-router-dom";
import type { ArtifactStatus } from "../lib/api";
import { Card } from "./Card";

/** "Mar 3" style short date for card metadata. */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** The draft/complete stitch chip shared by journal surfaces (DESIGN-002). */
export function StatusStitch({ status }: { status: ArtifactStatus }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 font-mono text-xs ${
        status === "complete"
          ? "border-pine-700 bg-pine-700 text-paper-0"
          : "border-dashed border-ink-500/50 text-ink-500"
      }`}
    >
      {status === "complete" ? "Complete" : "Draft"}
    </span>
  );
}

/**
 * JournalCard (DESIGN-002 §Journal): notebook-textured card — ruled paper,
 * artifact type eyebrow, title, an excerpt in the learner's own words,
 * updated time, and the status stitch.
 */
export function JournalCard({
  to,
  eyebrow,
  title,
  excerpt,
  status,
  updatedAt,
  className = "",
}: {
  to: string;
  /** Artifact type name, e.g. "Risk profile". */
  eyebrow: string;
  title: string;
  /** First filled field, quoted from the learner's entry. */
  excerpt?: string;
  status: ArtifactStatus;
  updatedAt: string;
  className?: string;
}) {
  return (
    <Link to={to} className={`block break-inside-avoid rounded-md ${className}`}>
      <Card interactive padding="none" className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line-200 px-5 py-2.5">
          <p className="ts-eyebrow">{eyebrow}</p>
          <StatusStitch status={status} />
        </div>
        {/* Rules shifted +6px so text baselines sit ON the lines, not through them */}
        <div className="ts-ruled px-5 pb-5 pt-3" style={{ backgroundPosition: "0 6px" }}>
          <h2 className="font-display text-lg font-bold leading-8 text-pine-950">{title}</h2>
          {excerpt && (
            <p className="mt-1 line-clamp-3 text-sm leading-8 text-ink-500">{excerpt}</p>
          )}
          <p className="mt-3 font-mono text-xs leading-8 text-ink-500">
            Updated {shortDate(updatedAt)}
          </p>
        </div>
      </Card>
    </Link>
  );
}
