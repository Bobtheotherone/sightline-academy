/* match renderer (SPEC-007 §5): two-column tap-to-connect with drawn SVG
 * connector lines. A wrong pairing flashes danger, clears, and teaches with
 * the term's explanation; solved pairs lock with a settled pine connector.
 *
 * Term icons (VISUAL_ASSETS C-100…C-110) sit on the LEFT column only — the
 * left column is the thing, the right is what it does, and art on both sides
 * would compete with the connector. Mapped by step+pair id in
 * src/assets/slotmap.ts; decorative, so alt="" and aria-hidden.
 */
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ActivityProps, MatchPayload, MatchesValue } from "../types";
import { FeedbackStrip } from "../../components/FeedbackStrip";
import { BlazeMarker } from "../../components/BlazeMarker";
import { Markdown } from "../Markdown";
import { matchPairIconUrl } from "../../assets/slotmap";

function shuffled<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface Anchor {
  x: number;
  y: number;
}

export default function MatchActivity({ step, evidence, onEvidence }: ActivityProps) {
  const payload = step.payload as MatchPayload;
  const prior = (evidence?.value ?? null) as MatchesValue | null;

  const [solved, setSolved] = useState<Record<string, true>>(() => ({
    ...(prior?.matches ?? {}),
  }));
  const [revisit] = useState(Boolean(evidence?.complete));
  const [leftSel, setLeftSel] = useState<string | null>(null);
  const [rightSel, setRightSel] = useState<string | null>(null);
  const [miss, setMiss] = useState<{ leftId: string; rightId: string; n: number } | null>(null);
  /** True while the wrong pairing is flashing; the explanation outlives it. */
  const [flashing, setFlashing] = useState(false);
  const [anchors, setAnchors] = useState<Record<string, Anchor>>({});

  const leftOrder = useMemo(() => payload.pairs.map((p) => p.id), [payload]);
  const rightOrder = useMemo(
    () => (payload.shuffle ? shuffled(payload.pairs) : payload.pairs).map((p) => p.id),
    [payload],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLElement>());
  const setNodeRef = (key: string) => (el: HTMLElement | null) => {
    if (el) nodeRefs.current.set(key, el);
    else nodeRefs.current.delete(key);
  };

  const pairById = (id: string) => payload.pairs.find((p) => p.id === id);
  const solvedCount = Object.keys(solved).length;
  const allSolved = solvedCount === payload.pairs.length;
  const missPair = miss ? pairById(miss.leftId) : undefined;

  /* Measure connector anchor points (inner edges of the two columns). */
  const measure = () => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const next: Record<string, Anchor> = {};
    nodeRefs.current.forEach((el, key) => {
      const r = el.getBoundingClientRect();
      const isLeft = key.startsWith("L:");
      next[key] = {
        x: (isLeft ? r.right : r.left) - cRect.left,
        y: r.top + r.height / 2 - cRect.top,
      };
    });
    setAnchors(next);
  };

  useLayoutEffect(measure, [solvedCount, miss?.n, payload]);
  useEffect(() => {
    // measure only touches refs and a stable setter, so mount-once is safe.
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  /* Clear the danger flash shortly after it draws; the strip stays. */
  useEffect(() => {
    if (!flashing) return;
    const t = window.setTimeout(() => setFlashing(false), 650);
    return () => window.clearTimeout(t);
  }, [flashing, miss?.n]);

  const tryConnect = (leftId: string | null, rightId: string | null) => {
    if (!leftId || !rightId) return;
    if (leftId === rightId) {
      const next = { ...solved, [leftId]: true as const };
      setSolved(next);
      setLeftSel(null);
      setRightSel(null);
      setMiss(null);
      onEvidence({
        kind: "matches",
        value: { matches: next },
        complete: Object.keys(next).length === payload.pairs.length,
      });
    } else {
      setMiss((m) => ({ leftId, rightId, n: (m?.n ?? 0) + 1 }));
      setFlashing(true);
      setLeftSel(null);
      setRightSel(null);
    }
  };

  const pickLeft = (id: string) => {
    if (solved[id]) return;
    const next = leftSel === id ? null : id;
    setLeftSel(next);
    tryConnect(next, rightSel);
  };
  const pickRight = (id: string) => {
    if (solved[id]) return;
    const next = rightSel === id ? null : id;
    setRightSel(next);
    tryConnect(leftSel, next);
  };

  const connector = (fromKey: string, toKey: string) => {
    const a = anchors[fromKey];
    const b = anchors[toKey];
    if (!a || !b) return null;
    const dx = Math.max((b.x - a.x) / 2, 24);
    return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
  };

  const rowClass = (kind: "solved" | "selected" | "missed" | "idle") =>
    `flex min-h-11 w-full items-center gap-2.5 rounded-sm border px-3 py-2.5 text-left text-sm text-pine-950 transition-all duration-(--ts-dur-fast) ${
      kind === "solved"
        ? "border-pine-300 bg-pine-300/15"
        : kind === "selected"
          ? "border-pine-700 bg-pine-300/10"
          : kind === "missed"
            ? "border-danger-600 bg-danger-600/5"
            : "border-line-200 bg-paper-0 hover:border-pine-300 hover:bg-moss-100 active:scale-[0.99]"
    }`;

  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-sm text-ink-500" aria-live="polite">
        {solvedCount} of {payload.pairs.length} matched
      </p>

      <div ref={containerRef} className="relative">
        {/* Connector lines */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {Object.keys(solved).map((pairId) => {
            const d = connector(`L:${pairId}`, `R:${pairId}`);
            return d ? (
              <path
                key={pairId}
                d={d}
                fill="none"
                stroke="var(--ts-pine-700)"
                strokeWidth={2}
                strokeLinecap="round"
              />
            ) : null;
          })}
          {miss && flashing && (
            (() => {
              const d = connector(`L:${miss.leftId}`, `R:${miss.rightId}`);
              return d ? (
                <path
                  d={d}
                  fill="none"
                  stroke="var(--ts-danger-600)"
                  strokeWidth={2}
                  strokeDasharray="6 5"
                  strokeLinecap="round"
                />
              ) : null;
            })()
          )}
        </svg>

        {/* minmax(0,…) on both content columns: a bare 1fr floors at
         * min-content, so a wide term row (icon + long word) used to steal
         * width from the description column at phone widths. */}
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(40px,72px)_minmax(0,1fr)] items-start">
          {/* Left column: terms */}
          <ol className="flex flex-col gap-2" aria-label="Terms">
            {leftOrder.map((id) => {
              const pair = pairById(id);
              if (!pair) return null;
              const kind = solved[id]
                ? "solved"
                : leftSel === id
                  ? "selected"
                  : flashing && miss?.leftId === id
                    ? "missed"
                    : "idle";
              const icon = matchPairIconUrl(step.id, id);
              return (
                <li key={id}>
                  <button
                    ref={setNodeRef(`L:${id}`)}
                    type="button"
                    disabled={Boolean(solved[id])}
                    aria-pressed={leftSel === id}
                    onClick={() => pickLeft(id)}
                    className={rowClass(kind)}
                  >
                    {solved[id] ? (
                      <BlazeMarker state="done" size="s" />
                    ) : (
                      <BlazeMarker state={leftSel === id ? "active" : "todo"} size="s" />
                    )}
                    {/* Two columns share the width here, so under sm the term
                     * cell is ~128px — an icon would leave the term itself
                     * ~40px and shove the description column into one-word
                     * lines. Decorative art yields to the words. */}
                    {icon && (
                      <img src={icon} alt="" aria-hidden className="hidden size-10 shrink-0 sm:block" />
                    )}
                    <span className="min-w-0 flex-1 font-medium">{pair.left}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div aria-hidden />

          {/* Right column: what it does */}
          <ol className="flex flex-col gap-2" aria-label="Descriptions">
            {rightOrder.map((id) => {
              const pair = pairById(id);
              if (!pair) return null;
              const kind = solved[id]
                ? "solved"
                : rightSel === id
                  ? "selected"
                  : flashing && miss?.rightId === id
                    ? "missed"
                    : "idle";
              return (
                <li key={id}>
                  <button
                    ref={setNodeRef(`R:${id}`)}
                    type="button"
                    disabled={Boolean(solved[id])}
                    aria-pressed={rightSel === id}
                    onClick={() => pickRight(id)}
                    className={rowClass(kind)}
                  >
                    <span className="min-w-0 flex-1">{pair.right}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {missPair && miss && miss.n > 0 && (
        <FeedbackStrip
          key={`miss-${miss.n}`}
          tone="caution"
          label={`Not the job of "${missPair.left}"`}
        >
          {missPair.explanation ? (
            <Markdown md={missPair.explanation} />
          ) : (
            <p>Those two don't belong together — try the term with a different description.</p>
          )}
        </FeedbackStrip>
      )}

      {allSolved ? (
        <FeedbackStrip
          tone="positive"
          label="All matched"
          animate={!revisit}
          md="Every pair found its partner. Give the connected set one last read — it's the mental model the next step builds on."
        />
      ) : (
        <p className="text-sm text-ink-500">
          Tap a term, then tap the description it belongs with. Wrong guesses teach — try freely.
        </p>
      )}
    </div>
  );
}
