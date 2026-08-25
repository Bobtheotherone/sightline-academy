export interface ArtifactPreviewEntry {
  id: string;
  label: string;
  value: string | string[];
}

/**
 * Live-building artifact preview inside journal_builder (DESIGN-002 §Journal):
 * notebook-ruled paper, artifact eyebrow, title, entries appearing as the
 * learner writes, status stitch. Values sit on 32px rules (leading-8 matches
 * the .ts-ruled line spacing).
 */
export function ArtifactPreview({
  eyebrow,
  title,
  entries,
  status = "draft",
  className = "",
}: {
  /** e.g. "Field journal — Risk profile". */
  eyebrow: string;
  title: string;
  entries: ArtifactPreviewEntry[];
  status?: "draft" | "complete";
  className?: string;
}) {
  return (
    <aside
      aria-label={`Artifact preview: ${title}`}
      className={`overflow-hidden rounded-md border border-line-200 bg-paper-0 shadow-1 ${className}`}
    >
      <div className="flex items-center justify-between gap-3 px-5 py-3">
        <p className="ts-eyebrow">{eyebrow}</p>
        <span
          className={`rounded-full border px-2.5 py-0.5 font-mono text-xs ${
            status === "complete"
              ? "border-pine-700 bg-pine-700 text-paper-0"
              : "border-dashed border-ink-500/50 text-ink-500"
          }`}
        >
          {status === "complete" ? "Complete" : "Draft"}
        </span>
      </div>
      {/* Rules shifted +6px so baselines sit ON the lines. Label and value are
       * both leading-8 and the gaps are whole rules, so the block height stays
       * a multiple of 32px and pb-5 closes the sheet before the next rule would
       * be drawn — no empty ruled band trails the last entry. */}
      <div className="ts-ruled px-5 pb-5 pt-3">
        <h3 className="font-display text-xl font-bold leading-8 text-pine-950">{title}</h3>
        <dl className="mt-8 flex flex-col gap-8">
          {entries.map((entry) => {
            const filled = Array.isArray(entry.value)
              ? entry.value.length > 0
              : entry.value.trim().length > 0;
            return (
              <div key={entry.id}>
                <dt className="ts-eyebrow leading-8">{entry.label}</dt>
                {filled ? (
                  Array.isArray(entry.value) ? (
                    <dd className="text-base leading-8 text-pine-950">
                      {entry.value.join(" · ")}
                    </dd>
                  ) : (
                    <dd className="whitespace-pre-wrap text-base leading-8 text-pine-950">
                      {entry.value}
                    </dd>
                  )
                ) : (
                  <dd className="text-base italic leading-8 text-ink-500/60">
                    Waiting for your entry
                  </dd>
                )}
              </div>
            );
          })}
        </dl>
      </div>
    </aside>
  );
}
