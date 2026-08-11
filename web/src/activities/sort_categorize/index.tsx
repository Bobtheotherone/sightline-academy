/* sort_categorize renderer (SPEC-007 §4): classify items into labeled zones.
 * Drag AND tap-to-assign (tap an item, then tap a category). Wrong drop:
 * gentle shake, item returns to the tray, its explanation teaches in a
 * FeedbackStrip. Correct drop: settle scale + blaze check draw (DESIGN-004
 * moment 1). "n of m sorted" progress; complete when all placed correctly.
 *
 * Item icons (VISUAL_ASSETS C-070…C-095) lead the label in both the tray and
 * the placed state, mapped by step+item id in src/assets/slotmap.ts. They are
 * decorative — the label carries the meaning — so alt="" and aria-hidden, and
 * they are never recoloured by selection or drag: the danger/caution accents
 * inside the art are doing the sort's own teaching work.
 */
import { useMemo, useState, type DragEvent } from "react";
import { GripVertical } from "lucide-react";
import type { ActivityProps, ClassificationValue, SortCategorizePayload } from "../types";
import { FeedbackStrip } from "../../components/FeedbackStrip";
import { Markdown } from "../Markdown";
import { BlazeCheckDraw } from "../motion";
import { sortItemIconUrl } from "../../assets/slotmap";

function shuffled<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function SortCategorizeActivity({ step, evidence, onEvidence }: ActivityProps) {
  const payload = step.payload as SortCategorizePayload;
  const prior = (evidence?.value ?? null) as ClassificationValue | null;

  const [placements, setPlacements] = useState<Record<string, string>>(
    () => prior?.placements ?? {},
  );
  /** True when the step was already complete on mount (revisit mode). */
  const [revisit] = useState(Boolean(evidence?.complete));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wrong, setWrong] = useState<{ itemId: string; n: number } | null>(null);
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [justPlacedId, setJustPlacedId] = useState<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);

  const trayOrder = useMemo(
    () => (payload.shuffle ? shuffled(payload.items) : payload.items).map((i) => i.id),
    [payload],
  );

  const itemById = (id: string) => payload.items.find((i) => i.id === id);
  const trayItems = trayOrder.filter((id) => !(id in placements));
  const sortedCount = Object.keys(placements).length;
  const allSorted = sortedCount === payload.items.length;
  const wrongItem = wrong ? itemById(wrong.itemId) : undefined;

  const attempt = (itemId: string, categoryId: string) => {
    const item = itemById(itemId);
    if (!item || itemId in placements) return;
    setSelectedId(null);
    setDragOverZone(null);
    if (item.categoryId === categoryId) {
      const next = { ...placements, [itemId]: categoryId };
      setPlacements(next);
      setJustPlacedId(itemId);
      setWrong(null);
      onEvidence({
        kind: "classification",
        value: { placements: next },
        complete: Object.keys(next).length === payload.items.length,
      });
    } else {
      setWrong((w) => ({ itemId, n: (w?.n ?? 0) + 1 }));
      setShakingId(itemId);
    }
  };

  const onDrop = (e: DragEvent, categoryId: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("text/plain");
    if (itemId) attempt(itemId, categoryId);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-sm text-ink-500" aria-live="polite">
        {sortedCount} of {payload.items.length} sorted
      </p>

      {/* Category zones */}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))`,
        }}
      >
        {payload.categories.map((category) => {
          const placedHere = payload.items.filter((i) => placements[i.id] === category.id);
          const targetable = Boolean(selectedId);
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => selectedId && attempt(selectedId, category.id)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverZone(category.id);
              }}
              onDragLeave={() => setDragOverZone((z) => (z === category.id ? null : z))}
              onDrop={(e) => onDrop(e, category.id)}
              aria-label={
                targetable
                  ? `Place "${itemById(selectedId ?? "")?.label ?? "item"}" in ${category.label}`
                  : category.label
              }
              className={`flex min-h-28 cursor-pointer flex-col rounded-md border-2 border-dashed p-3 text-left transition-colors duration-(--ts-dur-fast) sm:min-h-36 ${
                dragOverZone === category.id || targetable
                  ? "border-pine-700 bg-pine-300/10"
                  : "border-line-200 bg-moss-100/60"
              }`}
            >
              <span className="text-sm font-semibold text-pine-950">{category.label}</span>
              {category.hint && <span className="mt-0.5 text-xs text-ink-500">{category.hint}</span>}
              {/* An empty column is a drop target, not a void: the blaze
               * outline sits in the space the first card will land in. */}
              {placedHere.length === 0 && (
                <span className="mt-2.5 flex flex-1 flex-col items-center justify-center gap-2 py-1">
                  <span
                    aria-hidden
                    className={`size-5 rotate-45 rounded-[4px] border-2 border-dashed transition-colors duration-(--ts-dur-fast) ${
                      dragOverZone === category.id || targetable
                        ? "border-pine-700"
                        : "border-line-200"
                    }`}
                  />
                  <span className="text-xs font-medium text-ink-500">
                    {targetable ? "Drop it here" : "Drop here"}
                  </span>
                </span>
              )}
              <span className="mt-2.5 flex flex-col gap-1.5 empty:mt-0">
                {placedHere.map((item) => {
                  const icon = sortItemIconUrl(step.id, item.id);
                  return (
                    <span
                      key={item.id}
                      className={`flex items-center gap-2 rounded-sm border border-pine-300 bg-paper-0 px-2.5 py-1.5 text-sm text-pine-950 ${
                        justPlacedId === item.id ? "ts-act-settle" : ""
                      }`}
                    >
                      <BlazeCheckDraw />
                      {/* One step down from the tray's 40px: the placed chip
                       * is a summary line inside a narrow column, and it
                       * already carries the settled check. */}
                      {icon && <img src={icon} alt="" aria-hidden className="size-8 shrink-0" />}
                      <span className="min-w-0">{item.label}</span>
                    </span>
                  );
                })}
              </span>
            </button>
          );
        })}
      </div>

      {/* Teaching moment for a wrong drop — explanation, not penalty. */}
      {wrongItem && (
        <FeedbackStrip
          key={`wrong-${wrong?.n}`}
          tone="caution"
          label={`Not where "${wrongItem.label}" lives`}
        >
          <Markdown md={wrongItem.explanation} />
        </FeedbackStrip>
      )}

      {allSorted ? (
        <FeedbackStrip
          tone="positive"
          label="All sorted"
          animate={!revisit}
          md="Every card is where it belongs. The columns above are the logic worth keeping — give them one more read before you continue."
        />
      ) : (
        <div>
          <p className="ts-eyebrow">Item tray</p>
          <p className="mt-1 text-sm text-ink-500">
            {selectedId
              ? "Now tap the column where it belongs."
              : "Drag an item to a column — or tap it, then tap its column."}
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {trayItems.map((id) => {
              const item = itemById(id);
              if (!item) return null;
              const isSelected = selectedId === id;
              const icon = sortItemIconUrl(step.id, id);
              return (
                <li key={id} className={shakingId === id ? "ts-act-shake" : ""} onAnimationEnd={() => setShakingId((s) => (s === id ? null : s))}>
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", id);
                      setSelectedId(null);
                    }}
                    onClick={() => setSelectedId(isSelected ? null : id)}
                    aria-pressed={isSelected}
                    className={`flex min-h-11 cursor-grab items-center gap-2 rounded-sm border px-3 py-2 text-sm font-medium text-pine-950 transition-all duration-(--ts-dur-fast) active:scale-[0.98] ${
                      isSelected
                        ? "border-pine-700 bg-pine-300/15"
                        : "border-line-200 bg-paper-0 hover:-translate-y-0.5 hover:border-pine-300"
                    }`}
                  >
                    <GripVertical className="size-4 shrink-0 text-ink-500/60" strokeWidth={1.5} aria-hidden />
                    {icon && (
                      <img src={icon} alt="" aria-hidden className="size-10 shrink-0 select-none" draggable={false} />
                    )}
                    {/* text-left: a <button> centres its text by UA default,
                     * which only showed once icons made the cards wide enough
                     * to wrap at phone widths. */}
                    <span className="min-w-0 text-left">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
