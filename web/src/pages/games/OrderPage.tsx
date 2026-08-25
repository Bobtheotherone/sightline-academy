/* The walkaround, from memory (DESIGN-004 §Play): rebuild the T-CLOC ritual
 * tap by tap. The zones and their teaching copy come verbatim from the
 * walkaround lab's authored data — the game adds only the recall. The order
 * IS the lesson ("the ritual catches what a glance misses"), so the game is
 * pure retrieval practice; a wrong pick shakes, teaches nothing new, and
 * costs one miss.
 */
import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useSession } from "../../lib/session";
import { Button } from "../../components/Button";
import { FeedbackStrip } from "../../components/FeedbackStrip";
import { BlazeCheckDraw } from "../../activities/motion";
import { CleanRun } from "../../activities/streak";
import { WALKAROUND_ZONES } from "../../activities/lab_objective/walkaroundZones";
import { RangeHeader } from "./GamesPage";
import { loadBest, saveBest, type Best } from "./data";

/** The taught sequence — T, C, L, O, C. */
const SEQUENCE = ["tires", "controls", "lights", "oil", "chassis"].filter(
  (id) => id in WALKAROUND_ZONES,
);

function shuffled<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function OrderPage() {
  const { user } = useSession();
  const userId = user?.id ?? "anon";
  const total = SEQUENCE.length;

  const [deal, setDeal] = useState(0);
  // `deal` is the re-shuffle trigger: bumping it deals a fresh tray.
  const tray = useMemo(() => shuffled(SEQUENCE), [deal]);
  const [placed, setPlaced] = useState<string[]>([]);
  const [misses, setMisses] = useState(0);
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [best, setBest] = useState<Best | null>(() => loadBest(userId, "order:walkaround"));

  const done = placed.length === total;
  const nextId = SEQUENCE[placed.length];

  const pick = (id: string) => {
    if (done || placed.includes(id)) return;
    if (id === nextId) {
      const next = [...placed, id];
      setPlaced(next);
      if (next.length === total) {
        const score = Math.max(0, total - misses);
        setBest(
          saveBest(userId, "order:walkaround", {
            score,
            total,
            clean: misses === 0,
            at: new Date().toISOString(),
          }),
        );
      }
    } else {
      setMisses((m) => m + 1);
      setShakingId(id);
    }
  };

  const again = () => {
    setPlaced([]);
    setMisses(0);
    setShakingId(null);
    setDeal((d) => d + 1);
  };

  return (
    <div className="mx-auto w-full max-w-lesson px-6 py-10">
      <RangeHeader
        title="The walkaround, from memory"
        sub="Same five zones, same order, every time — that's what makes it a ritual. Tap them in sequence."
      />

      {/* The sequence being built. */}
      <ol className="mt-5 grid grid-cols-5 gap-2" aria-label="Your walkaround so far">
        {SEQUENCE.map((id, i) => {
          const zone = WALKAROUND_ZONES[id];
          const isPlaced = i < placed.length;
          const isNext = i === placed.length && !done;
          return (
            <li
              key={id}
              className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-sm border-2 px-1.5 py-2 text-center ${
                isPlaced
                  ? "ts-act-settle border-pine-300 bg-pine-100"
                  : isNext
                    ? "border-dashed border-pine-700 bg-pine-300/10"
                    : "border-dashed border-line-200 bg-moss-100/60"
              }`}
            >
              {isPlaced ? (
                <>
                  <span className="flex items-center gap-1 font-display text-lg font-bold text-pine-950">
                    <BlazeCheckDraw />
                    {zone.letter}
                  </span>
                  <span className="text-[11px] leading-tight text-ink-500">{zone.name}</span>
                </>
              ) : (
                <span className="font-mono text-sm text-ink-500">{i + 1}</span>
              )}
            </li>
          );
        })}
      </ol>

      {!done ? (
        <div className="mt-6">
          <p className="ts-eyebrow">The zones</p>
          <p className="mt-1 text-sm text-ink-500">
            {placed.length === 0
              ? "Where does the walkaround start?"
              : "What do you check next?"}
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {tray
              .filter((id) => !placed.includes(id))
              .map((id) => {
                const zone = WALKAROUND_ZONES[id];
                return (
                  <li
                    key={id}
                    className={shakingId === id ? "ts-act-shake" : ""}
                    onAnimationEnd={() => setShakingId((s) => (s === id ? null : s))}
                  >
                    <button
                      type="button"
                      onClick={() => pick(id)}
                      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border border-line-200 bg-paper-0 px-3.5 py-2 text-sm font-medium text-pine-950 transition-all duration-(--ts-dur-fast) hover:-translate-y-0.5 hover:border-pine-300 active:scale-[0.98]"
                    >
                      {zone.name}
                    </button>
                  </li>
                );
              })}
          </ul>
          {misses > 0 && (
            <p className="mt-4 text-sm text-ink-500" aria-live="polite">
              {misses === 1 ? "One miss" : `${misses} misses`} — the ritual runs the same
              order every time; that sameness is what catches things.
            </p>
          )}
          {best && (
            <p className="mt-2 font-mono text-xs text-ink-500">
              Best {best.score}/{best.total}
              {best.clean ? " · clean" : ""}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {misses === 0 && (
            <CleanRun
              label="The ritual, from memory"
              detail="All five zones in order, no misses — do it at the machine and it catches what a glance won't."
            />
          )}
          <FeedbackStrip
            tone="positive"
            label={misses === 0 ? "Walkaround complete" : `Walkaround complete — ${misses} ${misses === 1 ? "miss" : "misses"}`}
            md="Tires & wheels, Controls & cables, Lights & electrics, Oil & fuel, Chassis. The order is the point — a ritual catches what a glance misses."
          />
          <Button
            className="self-start"
            onClick={again}
            iconLeft={<RotateCcw className="size-4" strokeWidth={1.5} aria-hidden />}
          >
            Walk it again
          </Button>
        </div>
      )}
    </div>
  );
}
