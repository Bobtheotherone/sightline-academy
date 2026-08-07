import { Link } from "react-router-dom";
import type { ArtifactStatus, ArtifactType } from "../lib/api";
import { slotIconUrl } from "../assets/slotmap";
import { Card } from "./Card";

/**
 * B-030 … B-035 · journal artifact covers, keyed by `ArtifactOut.artifactType`.
 * The slot is the type with underscores hyphenated (`ride_plan` →
 * `artifact-ride-plan`), tabulated rather than string-munged so the six
 * produced slots are literal in the source: the manifest stays the sole
 * authority on which covers exist, and the asset lint can see this wiring
 * (§10.4 resolves `family-${…}` template slots for the glyph prefixes only,
 * and `artifact-` is not one of them).
 */
const ARTIFACT_COVER_SLOT: Record<ArtifactType, string> = {
  risk_profile: "artifact-risk-profile",
  inspection_log: "artifact-inspection-log",
  gear_card: "artifact-gear-card",
  hazard_brief: "artifact-hazard-brief",
  readiness_plan: "artifact-readiness-plan",
  ride_plan: "artifact-ride-plan",
};

/**
 * Bundled URL for an artifact's cover plate, or undefined when it has no
 * produced art — the journal surfaces then draw exactly what they drew before
 * the covers landed, with no empty frame.
 */
export function artifactCoverUrl(artifactType: string): string | undefined {
  return slotIconUrl(ARTIFACT_COVER_SLOT[artifactType as ArtifactType]);
}

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
  artifactType,
  eyebrow,
  title,
  excerpt,
  status,
  updatedAt,
  className = "",
}: {
  to: string;
  /** Artifact type id, e.g. "ride_plan" — selects the B-030…B-035 cover. */
  artifactType?: string;
  /** Artifact type name, e.g. "Risk profile". */
  eyebrow: string;
  title: string;
  /** First filled field, quoted from the learner's entry. */
  excerpt?: string;
  status: ArtifactStatus;
  updatedAt: string;
  className?: string;
}) {
  const cover = artifactType ? artifactCoverUrl(artifactType) : undefined;
  return (
    <Link to={to} className={`block break-inside-avoid rounded-md ${className}`}>
      <Card interactive padding="none" className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line-200 px-5 py-2.5">
          <p className="ts-eyebrow">{eyebrow}</p>
          <StatusStitch status={status} />
        </div>
        {/* Rules shifted +6px so text baselines sit ON the lines, not through them */}
        <div className="ts-ruled px-5 pb-5 pt-3" style={{ backgroundPosition: "0 6px" }}>
          {/* The cover is a plate laid ON the page, not part of the text
           * column: a flex sibling, so the rules under the entry keep their
           * 32px rhythm and every baseline stays on its line. Decorative —
           * the eyebrow and title name the artifact already. */}
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg font-bold leading-8 text-pine-950">{title}</h2>
              {excerpt && (
                <p className="mt-1 line-clamp-3 text-sm leading-8 text-ink-500">{excerpt}</p>
              )}
              <p className="mt-3 font-mono text-xs leading-8 text-ink-500">
                Updated {shortDate(updatedAt)}
              </p>
            </div>
            {cover && (
              <img
                src={cover}
                alt=""
                aria-hidden
                className="mt-1 w-24 shrink-0 rounded-sm border border-line-200 bg-paper-0 sm:w-32"
              />
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
