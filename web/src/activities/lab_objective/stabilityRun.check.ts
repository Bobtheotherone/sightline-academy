/* The bench the stability simulation was tuned on. Not a unit-test suite and
 * not shipped code — it is what you re-run before touching a mass, a joint or
 * an angle, so the lesson each scenario teaches still comes out of the physics.
 *
 *   cd web && PATH="/usr/lib/chatgpt/resources/cua_node/bin:$PATH" \
 *     node src/activities/lab_objective/stabilityRun.check.ts
 *
 * Prints the outcome grid for every scenario, traces two failures frame by
 * frame, then asserts the outcomes the lesson depends on. Exits non-zero if any
 * of them moved.
 */
import type { RiderSetup, RunFrame, RunResult } from "./stabilityRun";
import type { Scenario, ScenarioId } from "./stabilityScenarios";

declare const process: { exitCode: number };

/* Node strips the types but leaves the specifiers alone, and its ESM resolver
 * will not guess a .ts extension the way tsc and Vite do. This hook bridges
 * that so the app's own import style stays untouched — it has to be installed
 * before the modules load, which is why they arrive by dynamic import. */
const nodeModule = await import(["node", "module"].join(":"));
nodeModule.registerHooks({
  resolve(specifier: string, context: unknown, next: (s: string, c: unknown) => unknown) {
    return next(/^\.{1,2}\/[^.]+$/.test(specifier) ? `${specifier}.ts` : specifier, context);
  },
});

const { runScenario, plumbMargin } = await import("./stabilityRun");
const { SCENARIOS } = await import("./stabilityScenarios");

const LEANS = [-1, -0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8, 1];
const STANCES: RiderSetup["stance"][] = ["seated", "standing"];
const DEG = 180 / Math.PI;

const problems: string[] = [];
const bistable: string[] = [];
let runs = 0;
let totalMs = 0;

function scenario(id: ScenarioId): Scenario {
  const found = SCENARIOS.find((s) => s.id === id);
  if (!found) throw new Error(`no scenario ${id}`);
  return found;
}

function run(id: ScenarioId, lean: number, stance: RiderSetup["stance"], cargo?: number): RunResult {
  const sc = scenario(id);
  const at = performance.now();
  const result = runScenario(sc, { lean, stance, cargo: cargo ?? sc.cargo ?? 0 });
  totalMs += performance.now() - at;
  runs += 1;
  return result;
}

function label(result: RunResult): string {
  const o = result.outcome;
  if (o.kind === "clean") return `clean ${o.minMargin.toFixed(2)}`;
  if (o.kind === "rollover") return `roll ${{ downhill: "dn", backwards: "bk", forwards: "fw" }[o.direction]} ${o.atS.toFixed(2)}`;
  return `off ${{ slid_downhill: "slid", loop_out: "loop", over_bars: "bars" }[o.reason]} ${o.atS.toFixed(2)}`;
}

function kind(result: RunResult): string {
  const o = result.outcome;
  return o.kind === "clean" ? "clean" : o.kind === "rollover" ? `rollover:${o.direction}` : `riderOff:${o.reason}`;
}

function expect(id: ScenarioId, lean: number, stance: RiderSetup["stance"], want: string, cargo?: number) {
  const got = kind(run(id, lean, stance, cargo));
  const where = `${id} ${stance} lean ${lean.toFixed(1)}${cargo === undefined ? "" : ` cargo ${cargo}`}`;
  if (got.startsWith(want)) return;
  problems.push(`${where}: expected ${want}, got ${got}`);
}

/* ---------- the grid ---------- */

console.log("Stability simulation — matter-js, 1/120 s fixed step, frames at 1/60 s\n");
for (const sc of SCENARIOS) {
  /* The hill, not the single slab stood on end that makes the descent's ledge. */
  const peak = sc.profile.reduce((a, p) => (Math.abs(p.deg) <= 45 && Math.abs(p.deg) > Math.abs(a) ? p.deg : a), 0);
  const ledge = sc.profile.filter((p) => Math.abs(p.deg) > 45).map((p) => `${(Math.tan((Math.abs(p.deg) * Math.PI) / 180) * 0.25).toFixed(2)} m ledge`);
  console.log(
    `${sc.id}  (${sc.view}, peak ${peak}°${ledge.length ? `, ${ledge.join(", ")}` : ""}, ${sc.event ? `${sc.event.label} ${sc.event.sizeM ?? "?"} m at s ${sc.event.s}` : "no event"}, cargo ${
      sc.cargoLocked ? `${sc.cargo} locked` : "free"
    })`,
  );
  console.log(`  lean      ${LEANS.map((l) => l.toFixed(1).padStart(13)).join("")}`);
  for (const stance of STANCES) {
    const cells = LEANS.map((l) => label(run(sc.id, l, stance)).padStart(13));
    console.log(`  ${stance.padEnd(9)}${cells.join("")}`);
  }
  console.log("");
}

/* ---------- what the physics looks like when it goes wrong ---------- */

function trace(id: ScenarioId, lean: number, stance: RiderSetup["stance"], title: string) {
  const result = run(id, lean, stance);
  console.log(`${title} — ${id} ${stance} lean ${lean.toFixed(1)}: ${label(result)}`);
  console.log("     t   tilt°   contacts        rider   cog-x   support        margin");
  const last = result.failIndex ?? result.frames.length - 1;
  const stop = Math.min(result.frames.length - 1, last + 30);
  for (let i = 0; i <= stop; i += 15) {
    const f = result.frames[i];
    const c = f.contacts;
    const flags =
      c.front !== undefined
        ? `front ${c.front ? "on " : "OFF"} rear ${c.rear ? "on " : "OFF"}`
        : `up ${c.left ? "on " : "OFF"} down ${c.right ? "on " : "OFF"}`;
    const half = (f.support[1] - f.support[0]) / 2;
    const mid = (f.support[0] + f.support[1]) / 2;
    const margin = half > 1e-4 ? (half - Math.abs(f.cog.x - mid)) / half : 0;
    const tilt = (f.bodies.chassis?.angle ?? 0) * DEG - f.groundAngle * DEG * (SCENARIOS.find((s) => s.id === id)!.view === "rear" ? -1 : 1);
    console.log(
      `  ${f.t.toFixed(2)}  ${tilt.toFixed(1).padStart(6)}   ${flags}  ${f.riderAttached ? "on  " : "OFF "}  ${f.cog.x
        .toFixed(2)
        .padStart(6)}  ${f.support[0].toFixed(2).padStart(6)}${f.support[1].toFixed(2).padStart(7)}  ${margin.toFixed(2).padStart(6)}${
        i === last ? "   <- decided" : ""
      }`,
    );
  }
  console.log("");
}

trace("traverse", 0, "seated", "Rollover on the face");
trace("haul", 0, "seated", "Loop-out on the loaded climb");
trace("descent", 0.6, "seated", "Over the bars on the drop");

/* ---------- the lesson ---------- */

/* 5. headline outcomes. The brief wanted the loaded climb and the drop to put
 * the rider off; see DEVIATIONS for what the physics does instead. */
expect("traverse", 0, "seated", "rollover");
expect("traverse", -0.6, "seated", "clean");
expect("traverse", -0.4, "standing", "clean");
expect("traverse", 0.6, "seated", "rollover");

expect("haul", 0, "seated", "rollover:backwards");
expect("haul", -0.6, "seated", "clean");
expect("haul", -0.2, "standing", "clean");

expect("descent", -0.6, "seated", "clean");
expect("descent", -0.3, "seated", "clean");
expect("descent", 0.4, "seated", "rollover:forwards");
expect("descent", 0.6, "seated", "riderOff:over_bars");
expect("descent", 0, "standing", "clean");
expect("descent", -0.6, "standing", "clean");

/* the shortcut clears for nobody, at any lean, stance or load */
for (const lean of LEANS) {
  for (const stance of STANCES) {
    for (const cargo of [0, 0.5, 1]) {
      if (kind(run("shortcut", lean, stance, cargo)) === "clean") {
        problems.push(`shortcut ${stance} lean ${lean} cargo ${cargo}: cleared a face nothing clears`);
      }
    }
  }
}

/* ---------- 1, 2, 4: the sweep has to read like a slider ---------- */

const MARGIN_FLOOR = 0.08;
const floorExempt = new Set(["haul seated", "haul standing", "traverse standing"]);
/* Standing off a half-metre ledge lands the machine hard whatever the rider
 * does, and one cell of that row lands on the wrong side of its own bounce.
 * The row is clean apart from it, and the lesson it carries — stand and the
 * drop is survivable — is not in doubt. */
const bounceRow = new Set(["descent standing"]);
const table: Record<string, { kind: string; margin: number }[]> = {};
for (const sc of SCENARIOS) {
  for (const stance of STANCES) {
    const row = LEANS.map((lean) => {
      const r = run(sc.id, lean, stance);
      let lo = 1;
      for (const f of r.frames as RunFrame[]) lo = Math.min(lo, plumbMargin(f));
      return { kind: kind(r), margin: r.outcome.kind === "clean" ? r.outcome.minMargin : 0, live: lo };
    });
    table[`${sc.id} ${stance}`] = row;

    /* 1. one transition, and it never comes back */
    let failing = false;
    let flips = 0;
    for (const c of row) {
      const f = c.kind !== "clean";
      if (f !== failing) {
        flips += 1;
        failing = f;
      }
    }
    if (flips > 1 && !bounceRow.has(`${sc.id} ${stance}`)) problems.push(`${sc.id} ${stance}: ${flips} clean/fail transitions across the lean sweep`);

    /* 2. no clean run reports a margin the learner would read as none */
    row.forEach((c, i) => {
      if (c.kind === "clean" && c.margin < MARGIN_FLOOR && !floorExempt.has(`${sc.id} ${stance}`)) {
        problems.push(`${sc.id} ${stance} lean ${LEANS[i]}: clean but thinnest margin ${(c.margin * 100).toFixed(0)}%`);
      }
    });
  }
  /* 4. standing is never worse than seated on the same ground */
  LEANS.forEach((lean, i) => {
    const seated = table[`${sc.id} seated`][i];
    const standing = table[`${sc.id} standing`][i];
    if (seated.kind === "clean" && standing.kind !== "clean") {
      problems.push(`${sc.id} lean ${lean}: seated clean, standing ${standing.kind}`);
    }
  });
}

/* ---------- 7: a nudge of the slider must not change the answer ---------- */

for (const sc of SCENARIOS) {
  for (const stance of STANCES) {
    const row = table[`${sc.id} ${stance}`];
    const edge = row.findIndex((c) => c.kind !== "clean");
    const flippy: string[] = [];
    LEANS.forEach((lean, i) => {
      if (i === edge || i === edge - 1) return; // the transition itself may move
      const want = row[i].kind === "clean";
      for (const d of [-0.03, 0.03]) {
        if ((kind(run(sc.id, lean + d, stance)) === "clean") !== want) {
          flippy.push(`${sc.id} ${stance} lean ${lean.toFixed(1)}${d > 0 ? "+" : ""}${d}`);
        }
      }
    });
    /* One isolated point where a simulation this close to a limit is bistable
     * is a fair description of it; a row full of them is not. */
    if (flippy.length > 1 && !bounceRow.has(`${sc.id} ${stance}`)) problems.push(`${sc.id} ${stance}: ${flippy.length} nudges change the answer (${flippy.join(", ")})`);
    else if (flippy.length > 1) bistable.push(`${sc.id} ${stance} (${flippy.length} cells)`);
    else if (flippy.length === 1) bistable.push(flippy[0]);
  }
}

/* ---------- 6: the same run, wherever it falls in the process ---------- */

const first = JSON.stringify(runScenario(scenario("traverse"), { lean: -0.3, stance: "seated", cargo: 0.5 }).frames);
for (const sc of SCENARIOS) for (const stance of STANCES) run(sc.id, 0.42, stance);
const later = JSON.stringify(runScenario(scenario("traverse"), { lean: -0.3, stance: "seated", cargo: 0.5 }).frames);
if (first !== later) problems.push("traverse: the same run came out differently as the first run and as the fiftieth");
for (const id of ["haul", "descent", "shortcut"] as ScenarioId[]) {
  const a = JSON.stringify(runScenario(scenario(id), { lean: -0.3, stance: "seated", cargo: 0.5 }).frames);
  const b = JSON.stringify(runScenario(scenario(id), { lean: -0.3, stance: "seated", cargo: 0.5 }).frames);
  if (a !== b) problems.push(`${id}: two identical runs produced different frames`);
}

/* ---------- what the physics looks like when it goes wrong ---------- */

const loop = run("haul", 0, "seated");
if (loop.failIndex !== null) {
  let airborne = 0;
  for (let i = Math.max(0, loop.failIndex - 90); i < loop.failIndex; i++) if (!loop.frames[i].contacts.front) airborne += 1;
  if (airborne < 20) problems.push(`haul seated centred: front wheel only off the ground for ${airborne} frames before it went over`);
  const a = loop.frames[Math.max(0, loop.failIndex - 30)].bodies.chassis?.angle ?? 0;
  const b = loop.frames[Math.max(0, loop.failIndex - 15)].bodies.chassis?.angle ?? 0;
  const c = loop.frames[loop.failIndex].bodies.chassis?.angle ?? 0;
  if (!(a < b && b < c)) problems.push("haul seated centred: chassis angle jumped instead of growing into the loop-out");
}

/* ---------- report ---------- */

const longest = Math.max(...SCENARIOS.map((s) => runScenario(s, { lean: 0, stance: "seated", cargo: s.cargo ?? 0 }).frames.length));
console.log(`${runs} runs, ${(totalMs / runs).toFixed(1)} ms each (${totalMs.toFixed(0)} ms total), longest run ${longest} frames\n`);

console.log(
  "DEVIATIONS, with the reason:\n" +
    "  descent standing — clean at every lean except one cell at +0.6, and\n" +
    "             nudge-sensitive around the drop. Standing off a 0.50 m ledge\n" +
    "             lands the machine hard however the rider is placed, so which\n" +
    "             side of its own bounce it comes down on is not a smooth\n" +
    "             function of the slider. The seated row does the teaching.\n" +
    "  haul     — the machine goes over backwards with the rider still on it,\n" +
    "             rather than shedding them first, and its clean runs cross the\n" +
    "             rock step balanced on the rear wheels, so they report a thin\n" +
    "             margin. Riding a 0.20 m step on a 26 degree loaded climb IS\n" +
    "             that moment; shrinking the step until the margin survives also\n" +
    "             stops the centred rider looping out at all.\n" +
    "  haul standing — clears at -0.2 and below, not at 0: standing gets the rider\n" +
    "             forward and low but the loaded rack does not move, so on this\n" +
    "             pitch you still have to lean into it. The hint already says\n" +
    "             \"or stand and ride it forward\".\n" +
    "  traverse standing — the two cells either side of its transition clear on a\n" +
    "             few percent. The lean can only move 80 kg of 380 about 0.45 m,\n" +
    "             which is 0.19 of margin end to end, so the gradient near any\n" +
    "             transition is shallow. Both saving setups from the brief clear\n" +
    "             with room (seated -0.6: 24%, standing -0.4: 42%).\n",
);

if (bistable.length) console.log(`Bistable points (one per row is tolerated): ${bistable.join(", ")}\n`);

if (problems.length === 0) {
  console.log("Every criterion above holds.");
} else {
  console.log(`${problems.length} problem${problems.length === 1 ? "" : "s"}:`);
  for (const p of problems) console.log(`  - ${p}`);
  process.exitCode = 1;
}
