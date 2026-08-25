/* WalkaroundLab (SPEC-007 §11, Module 2) — the change detector.
 *
 * The lesson says a walkaround "isn't really a mechanical inspection — it's a
 * change detector", so the lab asks the question a walkaround actually asks.
 * Each T-CLOC zone shows the machine twice — yesterday beside today — and the
 * learner has to put a finger on what moved: click the fault in today's plate.
 * Landing on it opens the card that says what it is and why it bites.
 *
 * This replaced a place-the-labels-on-a-diagram lab. That version repeated the
 * hotspot activity from m2-l1-s2 fifteen minutes earlier, its second stage
 * re-read the keylist the learner had just been shown in m2-l3-s1, and it
 * pinned zones like Chassis — "the look-over", a whole-machine sweep — to
 * single points on a top-down drawing, teaching a spatial model that isn't true
 * to T-CLOC. Neither of the two skills the lesson names (notice a change, judge
 * what it means) was exercised anywhere; the journal step asked for both.
 *
 * The plates sit SIDE BY SIDE rather than flipping in place. A flip makes
 * differences pop, but it needs pixel-perfect registration, and these plates
 * are separately drawn — every line lands a pixel or two apart. Side by side
 * that is invisible; flipping, it would shimmer and the learner would "find"
 * changes that are only drawing noise.
 *
 * Only today's plate takes clicks. Yesterday's is the reference and is inert —
 * making both live would invite clicking the good plate to "find" the fault
 * there, which is the wrong mental move.
 */
import { useState, type MouseEvent } from "react";
import { Button } from "../../components/Button";
import { BlazeMarker } from "../../components/BlazeMarker";
import { FeedbackStrip } from "../../components/FeedbackStrip";
import { SlotArt } from "../../components/SlotArt";
import { Modal } from "../../components/Modal";
import type { LabComponentProps } from "./index";
import {
  WALKAROUND_ZONES,
  ZONE_ORDER,
  type Call,
  type WalkaroundZone,
} from "./walkaroundZones";

/** A miss the learner left on the plate, so a near-miss reads as a near-miss. */
interface Mark {
  x: number;
  y: number;
  n: number;
}

export function WalkaroundLab({ met, meet, revisit }: LabComponentProps) {
  const zones = ZONE_ORDER.map((id) => WALKAROUND_ZONES[id]).filter(Boolean);
  const already = met.has("find_all");

  const [found, setFound] = useState<Set<string>>(
    () => new Set(already ? zones.map((z) => z.id) : []),
  );
  const [calls, setCalls] = useState<Record<string, Call>>(() => {
    if (!met.has("call_all")) return {};
    const seed: Record<string, Call> = {};
    zones.forEach((z) => (seed[z.id] = z.call));
    return seed;
  });
  const [index, setIndex] = useState(0);
  const [marks, setMarks] = useState<Record<string, Mark[]>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [callMiss, setCallMiss] = useState<{ zoneId: string; n: number } | null>(null);

  const zone = zones[Math.min(index, zones.length - 1)];
  const zoneFound = found.has(zone.id);
  const misses = marks[zone.id] ?? [];
  const allFound = found.size === zones.length;
  const allCalled = zones.every((z) => calls[z.id]);

  const hit = (z: WalkaroundZone, x: number, y: number) =>
    z.spots.some((s) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);

  const clickPlate = (e: MouseEvent<HTMLButtonElement>) => {
    if (zoneFound) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    if (hit(zone, x, y)) {
      const next = new Set(found);
      next.add(zone.id);
      setFound(next);
      setOpen(zone.id);
      if (next.size === zones.length) meet("find_all");
    } else {
      setMarks((m) => ({
        ...m,
        [zone.id]: [...(m[zone.id] ?? []), { x, y, n: (m[zone.id]?.length ?? 0) + 1 }],
      }));
    }
  };

  const makeCall = (z: WalkaroundZone, call: Call) => {
    if (calls[z.id]) return;
    if (call !== z.call) {
      setCallMiss((m) => ({ zoneId: z.id, n: (m?.n ?? 0) + 1 }));
      return;
    }
    setCallMiss(null);
    const next = { ...calls, [z.id]: call };
    setCalls(next);
    if (zones.every((f) => next[f.id])) meet("call_all");
  };

  const sheetZone = open ? WALKAROUND_ZONES[open] : undefined;

  return (
    <div className="flex flex-col gap-4">
      {/* ---- progress rail ---- */}
      <ol className="flex flex-wrap items-center gap-1.5" aria-label="T-CLOC zones">
        {zones.map((z, i) => {
          const done = found.has(z.id);
          const here = i === index && !allFound;
          return (
            <li key={z.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                className={`flex min-h-8 items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs transition-all duration-(--ts-dur-fast) ${
                  here
                    ? "border-pine-700 bg-pine-300/15 font-medium text-pine-950"
                    : done
                      ? "border-pine-300 bg-pine-300/10 text-pine-950 hover:border-pine-700"
                      : "border-line-200 bg-paper-0 text-ink-500 hover:border-pine-300"
                }`}
              >
                <BlazeMarker state={done ? "done" : here ? "active" : "todo"} size="s" />
                <span className="font-mono font-semibold">{z.letter}</span>
                <span className="hidden sm:inline">{z.name}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <section className="flex flex-col gap-3" aria-label={`Zone: ${zone.name}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="text-base font-semibold text-pine-950">
            {zone.letter} — {zone.name}
          </h4>
          <p className="font-mono text-xs text-ink-500" aria-live="polite">
            {found.size} of {zones.length} found
          </p>
        </div>
        <p className="text-sm text-ink-500">{zone.looking}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Yesterday — the reference, deliberately inert. */}
          <figure className="flex flex-col gap-1.5">
            <figcaption className="ts-eyebrow text-ink-500">Yesterday</figcaption>
            <SlotArt slot={zone.okSlot} ratio="4 / 3" sizes="(min-width: 640px) 40vw, 90vw" />
          </figure>

          {/* Today — the live plate. */}
          <figure className="flex flex-col gap-1.5">
            <figcaption className="ts-eyebrow text-ink-500">Today</figcaption>
            <button
              type="button"
              onClick={clickPlate}
              disabled={zoneFound}
              aria-label={
                zoneFound
                  ? `Today's ${zone.name} plate — fault found`
                  : `Today's ${zone.name} plate — click the fault`
              }
              className={`relative block w-full rounded-md text-left ${
                zoneFound ? "cursor-default" : "cursor-crosshair"
              }`}
            >
              <SlotArt slot={zone.badSlot} ratio="4 / 3" sizes="(min-width: 640px) 40vw, 90vw" />

              {/* Misses stay on the plate: a near miss should read as near. */}
              {!zoneFound &&
                misses.map((m) => (
                  <span
                    key={m.n}
                    aria-hidden
                    className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-danger-600/70"
                    style={{ left: `${m.x}%`, top: `${m.y}%` }}
                  />
                ))}

              {/* Found: ring the fault so the learner sees what they got. */}
              {zoneFound &&
                zone.spots.map((s, i) => (
                  <span
                    key={i}
                    aria-hidden
                    className="pointer-events-none absolute rounded-sm border-2 border-clay-500 bg-clay-500/10"
                    style={{
                      left: `${s.x}%`,
                      top: `${s.y}%`,
                      width: `${s.w}%`,
                      height: `${s.h}%`,
                    }}
                  />
                ))}
            </button>
          </figure>
        </div>

        {!zoneFound && (
          <>
            <p className="text-sm text-pine-950">
              Compare the two, then <span className="font-medium">click the problem</span> in
              today's plate.
            </p>
            {misses.length >= 2 && (
              <FeedbackStrip key={`h-${misses.length}`} tone="caution" label="Not there yet">
                <p>{zone.hint}</p>
              </FeedbackStrip>
            )}
          </>
        )}

        {zoneFound && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="s" variant="secondary" onClick={() => setOpen(zone.id)}>
              Read it again
            </Button>
            {index < zones.length - 1 && (
              <Button size="s" onClick={() => setIndex((i) => i + 1)}>
                Next zone
              </Button>
            )}
          </div>
        )}
      </section>

      {/* ---- the call, once every fault is on the table ---- */}
      {allFound && (
        <section className="flex flex-col gap-3" aria-label="Make the call">
          <h4 className="text-base font-semibold text-pine-950">
            Four faults — now the call
          </h4>
          <p className="text-sm text-ink-500">
            Nothing you turn up on a walkaround is "ignore it". Each one either gets sorted
            before you ride, or it ends the ride.
          </p>
          <ol className="flex flex-col gap-3">
            {zones.map((z) => {
              const call = calls[z.id];
              return (
                <li
                  key={z.id}
                  className="rounded-md border border-line-200 bg-paper-0 px-4 py-3.5"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-sm font-semibold text-pine-950">
                      {z.letter}
                    </span>
                    <span className="text-sm font-medium text-pine-950">{z.faultName}</span>
                  </div>
                  {!call ? (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <Button size="s" variant="secondary" onClick={() => makeCall(z, "sort")}>
                        Sort it before you ride
                      </Button>
                      <Button size="s" variant="secondary" onClick={() => makeCall(z, "stop")}>
                        Ride's off
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-start gap-2.5">
                      <BlazeMarker state="done" size="s" className="mt-0.5" />
                      <p className="text-sm text-pine-950">{z.callWhy}</p>
                    </div>
                  )}
                  {callMiss && callMiss.zoneId === z.id && !call && (
                    <div className="mt-2.5">
                      <FeedbackStrip key={`cm-${callMiss.n}`} tone="caution" label="Not that one">
                        <p>
                          {z.call === "stop"
                            ? "This one is not a trailhead fix. Ask what you actually know about it."
                            : "This is fixable where you stand — think about what it would take to put right before you ride."}
                        </p>
                      </FeedbackStrip>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          {allCalled && (
            <FeedbackStrip
              tone="positive"
              label="Every fault called"
              animate={!revisit}
              md="Some of these you can put right where you stand; one of them ends the ride. Telling those apart is the judgement this lesson is really teaching — and it is exactly what your journal asks for next."
            />
          )}
        </section>
      )}

      {/* ---- the card ----
       * The house Modal (Radix) rather than BottomSheet: BottomSheet is
       * `lg:hidden` by design — it is the mobile half of a pair whose desktop
       * half is an in-grid side panel — so on a desktop viewport the card
       * simply never appeared. Modal portals to the body, which also sidesteps
       * StageStep's `translate`, a non-none value that would otherwise make a
       * fixed overlay resolve against the step card instead of the viewport. */}
      <Modal
        open={Boolean(sheetZone)}
        onOpenChange={(o) => !o && setOpen(null)}
        eyebrow={sheetZone ? `${sheetZone.letter} — ${sheetZone.name}` : ""}
        title={sheetZone ? sheetZone.faultName : ""}
      >
        {sheetZone && (
          <div className="flex flex-col gap-3">
            <div>
              <p className="ts-eyebrow text-ink-500">What you found</p>
              <p className="mt-1 text-sm text-pine-950">{sheetZone.faultIs}</p>
            </div>
            <div>
              <p className="ts-eyebrow text-ink-500">Why it bites</p>
              <p className="mt-1 text-sm text-pine-950">{sheetZone.hazard}</p>
            </div>
            <div>
              <Button size="s" onClick={() => setOpen(null)}>
                Got it
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
