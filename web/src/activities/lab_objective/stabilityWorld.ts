/* The rigid-body world the stability lab rides on (SPEC-007 §11, take two).
 *
 * Nothing here is scripted. A run builds a matter-js world — terrain, machine,
 * rider, load — steps it at a fixed 1/120 s and reports what the bodies did.
 * Wheel lift, loop-outs, rollovers and the rider parting company with the seat
 * are consequences of mass, gravity, contact and a joint giving way.
 *
 * UNITS. Everything crossing the module boundary is metres, seconds, radians,
 * y UP. Inside the engine one unit is one CENTIMETRE and mass is on its own
 * scale (see U and KG): matter-js is not scale invariant — its slop, resting
 * thresholds and friction clamp are lengths and impulses tuned for bodies of
 * roughly 50-500 units and a few units of mass. Put a 1.5-unit, 300-unit-mass
 * machine in it and it behaves like a machine made of jelly on ice. Converted,
 * the same engine is in the range it was written for and gravity is 9.81 m/s².
 *
 * FRAMES. World x runs in the direction of travel. Side view: x = 0 starts the
 * run, y = 0 is the terrain surface there, the machine drives +x (the plate
 * faces left, so the renderer mirrors it). Rear view: x = 0 is the track
 * centre, y = 0 the ground under it, and the hill falls toward +x — so
 * wheelRight / contacts.right is the DOWNHILL wheel. Angles are CCW positive.
 *
 * MACHINE FRAME. Local coordinates here are (x forward, h = height above the
 * ground line) with the origin at the axle midpoint. The anchors are the same
 * sprite anchors the stage draws from (stageSprites.tsx SIDE_ANCHOR /
 * REAR_ANCHOR), shifted onto that origin, so a body pose and a plate anchor
 * always land on the same point.
 */
import Matter from "matter-js";
import type { BodyId, BodyPose, RiderSetup } from "./stabilityRun";
import type { Scenario, TrailEvent } from "./stabilityScenarios";

const { Bodies, Body, Composite, Constraint, Engine, Vector, Vertices } = Matter;

/* matter-js hands out body ids from a module-level counter and seeds its own
 * random from a module-level seed. Both survive between runs, so the same
 * scenario stepped as the first run of a page and as the two-hundredth would
 * build its bodies with different ids, pair its collisions in a different
 * order, and accumulate its floating point in a different order — enough to
 * change the ending of a run that is anywhere near a limit. Every run starts
 * from the same global state instead. */
const matterGlobals = (Matter as unknown as { Common: { _nextId: number; _seed: number } }).Common;
function resetMatter() {
  matterGlobals._nextId = 0;
  matterGlobals._seed = 0;
}

/* matter's own typings are behind its runtime on these. */
const rotateAbout = Body.rotate as unknown as (b: Matter.Body, rad: number, about: Matter.Vector) => void;
type Anchored = Matter.Constraint & { pointA: Matter.Vector; angleA: number };
type Kinematic = Matter.Body & { positionPrev: Matter.Vector; anglePrev: number };

/* ---------- scale ---------- */

export const U = 100; // engine length units per metre
const KG = 0.03; // engine mass units per kilogram
export const STEP_MS = 1000 / 120;
const STEP_S = 1 / 120;
const GRAVITY = 9.81;
/** matter's accumulated contact impulse -> newtons. */
const NEWTONS = 1 / (U * STEP_S * STEP_S * KG);
const toForce = (n: number) => n * U * 1e-6 * KG;
const toTorque = (nm: number) => nm * U * U * 1e-6 * KG;
const setKg = (b: Matter.Body, kg: number) => Body.setMass(b, kg * KG);
const setSpin = (b: Matter.Body, kgm2: number) => Body.setInertia(b, kgm2 * U * U * KG);
const radPerSec = (b: Matter.Body) => Body.getAngularVelocity(b) * 60;
const metresPerSec = (b: Matter.Body) => {
  const v = Body.getVelocity(b);
  return { x: (v.x * 60) / U, y: (v.y * 60) / U };
};

/* ---------- the run ---------- */

export const RUN_LENGTH_M = 18; // side view, metres of trail (stageTerrain RUN_LENGTH)
export const REAR_SPAN_S = 6; // rear view, seconds of tilt profile
const REAR_HALF_WIDTH = 8; // metres of cross-section either side
const TERRAIN_BACK = 3;
const TERRAIN_PAST = 4;
const SEGMENT = 0.25; // stageTerrain STEP: one slab
const TERRAIN_DEEP = 1.6;

/* ---------- the machine: 300 kg with wheels, rider 80, full load 45 ---------- */

const MACHINE_KG = 300;
const WHEEL_KG = 14;
const RIDER_KG = 80;
const CARGO_KG = 45;
/** 123 px of the side plate at 545 px = 1.25 m. */
export const WHEEL_R = (123 * 1.25) / 545;
const WHEEL_I = 3; // kg m², wheel plus the driveline it turns
export const WHEELBASE = 1.25;
const MACHINE_COG = { x: -0.23, h: 0.494 }; // set up to carry a load: 0.40 m ahead of the rear axle
const PITCH_I = 100; // kg m² about the machine CoG
const ROLL_I = 62;
const HULL_KG = 182;
const BALLAST_KG = 90; // engine and driveline, low and behind the middle

/** Side plate anchors, machine-frame metres (x forward, h above the ground). */
const SEAT = { x: -0.1709, h: 0.7821 };
const GRIP = { x: 0.2649, h: 1.0115 };
const PEG = { x: -0.0333, h: 0.2913 };
const RACK = { x: -0.7901, h: 0.8349 };
/** bodies.chassis is reported here: the side plate's own body-centre anchor. */
const SIDE_CHASSIS_H = 0.4794;

/** Rear plate anchors. The two plates were painted at different proportions —
 * the rear one carries its seat higher — and the rider has to sit on the seat
 * that gets drawn, so the rear view takes its anchors from the rear plate. */
export const TRACK_HALF = 0.4577; // contact patch centres
const TYRE_HALF_W = 0.0923; // to the outside of the tyre: 1.10 m outside to outside
const TYRE_SHOULDER = 0.03; // radius the tyre rolls onto when it leans
export const TYRE_PATCH_HALF = TYRE_HALF_W - TYRE_SHOULDER;
const REAR_SEAT_H = 0.9776;
const REAR_GRIP_H = 1.1202;
const REAR_PEG_H = 0.3152;
const REAR_RACK_H = 0.9273;
const REAR_CHASSIS_H = 0.5333;

/* ---------- rider ---------- */

/* Where the rider's weight goes in and how far above it their own mass sits.
 * Seated, it goes in at the seat with the body stacked upright above it.
 * Standing, it goes in at the pegs and the body is crouched over them in the
 * attack position, which puts the rider's centre of mass LOWER than sitting up
 * — that, plus the legs taking the jolts, is what standing buys. */
const HIP_LEVER = { seated: 0.35, standing: 0.75 };
/** Standing on a drop, the rider's weight goes in at the pegs but their body
 * does not sit over them — they are back over the rack, which is the whole
 * reason for getting off the seat. Climbing, the pegs are already forward of
 * the seat and there is nothing to add. */
const STAND_BACK_ON_DROPS = 0.06;
const LEAN_REACH_SIDE = { seated: 0.16, standing: 0.4 };
const LEAN_REACH_REAR = { seated: 0.18, standing: 0.28 };
/* Leaning is mostly the body, not the backside: the hips slide a little way
 * across the seat (LEAN_REACH) and the torso goes a long way further over
 * (TORSO_LEAN, about the hips or the pegs). That is what lets a committed lean
 * be worth a real slice of margin without spending the whole seat. */
const TORSO_LEAN = { seated: 0.9, standing: 0.46 }; // radians at full lean
const HIP_STIFFNESS = 0.0026; // the spring rate below, at six constraint iterations
const HIP_K = 14200; // N/m of seat joint
const HIP_SAG = (RIDER_KG * GRAVITY) / HIP_K; // the rider settles this far into it
const HIP_DAMPING = 0.09;
const HAND_STIFFNESS = 0.0009; // ≈ 4.9 kN/m of arm
const HAND_K = 4900;
const ARM_N = 300; // what a rider's arms hold them back with
/* Sliding forward the bars stop being a handhold: that is the whole meaning of
 * going over them. Across the machine the arms brace either way. */
const ARM_PUSH = 100;
const HAND_DAMPING = 0.06;
/* A seat carries the rider's weight; what a rider runs out of is grip across
 * it, and grip is friction — it is worth what the rider is still pressed into
 * the seat with. As the machine leans, the weight along the seat grows and the
 * weight into it shrinks, so past about 40 degrees off vertical the rider
 * starts to slide however hard they hold. What decides whether they get away
 * with it is how much seat is left on that side, which is what leaning downhill
 * spends. */
const RIDER_MU = 0.85; // seat, boots and knees against the tank
const GRIP_BASE = 120; // N a rider holds with their legs alone, weightless
const GRIP_STAND = 1.6; // on the pegs, braced, riding the jolt instead of taking it
/* Metres the hips can travel from the middle of the seat before the rider is
 * off it. Across the machine it is the same either way; along it, the tank and
 * the console stop you going forward long before the back of the seat stops you
 * going backwards, which is why a loaded climb puts riders off the back. */
const SEAT_EDGE = { seated: 0.26, standing: 0.74 };
const SEAT_BACK = { seated: 0.24, standing: 0.74 };
const SEAT_FRONT = { seated: 0.22, standing: 0.74 };
/* A seat pushes; it does not pull. Once the machine has rotated out from under
 * the rider there is nothing holding them on but their legs, and that lasts
 * about as long as it takes to say so. */
const LIFT_S = 0.3;
/** ...but only once the machine has turned this far away from the ground it is
 * standing on, so that the seat is not coming back under them. A jump off a
 * lip is not the same as a machine going over. */
const LIFT_ANGLE = 0.6;
/** No rider holds their torso further than this off vertical — past it they
 * stop following the machine and start staying upright, which is what levers
 * them off the seat when the machine keeps going. */
const TORSO_UPRIGHT = 0.79; // radians
/* How much of the machine's own angle the rider's body takes on. Seated you go
 * with it. Standing, the legs absorb the angle and the body stays much closer
 * to upright — which is why a standing rider on a pitch is not fighting their
 * own weight the way a seated one is. */
const POSTURE_FOLLOW = { seated: 0.6, standing: 0.35 };
const POSTURE_KP = 2000; // N m per radian
const POSTURE_KD = 130;
const POSTURE_MAX = 260; // N m — what a rider's core can actually hold

/* ---------- drive ---------- */

/* Ground speed the rider holds. Nobody drops into a 30 degree pitch at the
 * speed they take a climb, and the difference is most of what makes a descent
 * survivable, so the governor asks for less of it going down. */
const DRIVE_V = 3.6; // m/s climbing or on the level
const DRIVE_V_DOWN = 2.2;
const MOTOR_MAX = 900; // N m at each wheel, low range
const TYRE_MU = 1.2;
const TYRE_K = 3000; // N per m/s of slip
const LOAD_SMOOTH = 0.3;

/* ---------- ground and events ---------- */

/* Dirt, not ice — but the slop stays at matter's default half millimetre.
 * Its friction clamp scales with how deep a contact is allowed to sit, and
 * opening the slop up grips the patch so hard that a machine past its tipping
 * point cannot roll off it. */
const GROUND: Matter.IBodyDefinition = { friction: 1, frictionStatic: 3, slop: 0.05, restitution: 0 };
/** Feature footprints, matched to what stageTerrain.tsx draws on the surface. */
const ROCK_W = 1.0; // metres of trail the rock step takes up
const WASHOUT_W = 0.8;
const WASHOUT_LIP = 0.86; // how much of it is the fall, the rest is the bank
const EVENT_RAMP_S = 0.25; // how long the ground takes to give way
const EVENT_NEAR = 1; // side view: metres either side that count as "in it"

type Contactish = { normalImpulse: number };
type Pairish = {
  isActive: boolean;
  bodyA: Matter.Body;
  bodyB: Matter.Body;
  contacts: Contactish[];
  contactCount: number;
};

export interface WorldSample {
  bodies: Partial<Record<BodyId, BodyPose>>;
  groundAngle: number;
  riderAttached: boolean;
  contacts: { front?: boolean; rear?: boolean; left?: boolean; right?: boolean };
  cog: { x: number; y: number };
  support: [number, number];
  eventActive: boolean;
  s: number;
  /** Chassis angle relative to the ground it is on, radians, CCW positive. */
  tilt: number;
  /** Machine-frame x of the hips when the seat let go. */
  breakX: number;
  atEnd: boolean;
}

export interface World {
  step(): void;
  sample(): WorldSample;
  readonly time: number;
  readonly stepIndex: number;
  readonly brokeAt: number | null;
  /** Metre extents of the ground, for the camera clamp. */
  readonly extent: { x0: number; x1: number; y0: number; y1: number };
}

/* ---------- profile ---------- */

export function profileDeg(scenario: Scenario, s: number): number {
  const p = scenario.profile;
  const at = Math.min(1, Math.max(0, s));
  for (let i = 1; i < p.length; i++) {
    if (at <= p[i].s) {
      const span = p[i].s - p[i - 1].s || 1;
      return p[i - 1].deg + (p[i].deg - p[i - 1].deg) * ((at - p[i - 1].s) / span);
    }
  }
  return p[p.length - 1].deg;
}

/** Metres of feature: rut and washout depth, rock height above the surface. */
function eventSize(event: TrailEvent): number {
  if (event.sizeM !== undefined) return event.sizeM;
  return Math.tan((event.impulseDeg * Math.PI) / 180) * TRACK_HALF * 2;
}

/* ---------- builders ---------- */

/** A polygon placed exactly where its vertices say, in engine units. */
function shape(verts: Matter.Vector[], options: Matter.IBodyDefinition): Matter.Body {
  const c = Vertices.centre(verts);
  return Bodies.fromVertices(c.x, c.y, [verts], options, false);
}

/** An axis-aligned part in machine-frame metres, given its mass. */
function box(cx: number, ch: number, w: number, h: number, kg: number): Matter.Body {
  const b = Bodies.rectangle(cx * U, (WHEEL_R - ch) * U, w * U, h * U);
  setKg(b, kg);
  return b;
}

/** A run of ground under a surface polyline, as one static body. */
function slabs(top: { x: number; y: number }[], options: Matter.IBodyDefinition) {
  const parts: Matter.Body[] = [];
  for (let i = 1; i < top.length; i++) {
    const a = top[i - 1];
    const b = top[i];
    if (b.x - a.x < 1e-6) continue;
    parts.push(
      shape(
        [
          { x: a.x * U, y: -a.y * U },
          { x: b.x * U, y: -b.y * U },
          { x: b.x * U, y: -b.y * U + TERRAIN_DEEP * U },
          { x: a.x * U, y: -a.y * U + TERRAIN_DEEP * U },
        ],
        { isStatic: true },
      ),
    );
  }
  const body = Body.create({ ...options, parts, isStatic: true });
  return { body, centre: { x: body.position.x, y: body.position.y } };
}

const smooth = (k: number) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));

/* ---------- the world ---------- */

export function createWorld(scenario: Scenario, setup: RiderSetup): World {
  resetMatter();
  const engine = Engine.create();
  engine.gravity.y = 1;
  engine.gravity.scale = (GRAVITY * U) / 1e6;
  engine.positionIterations = 10;
  engine.velocityIterations = 8;
  engine.constraintIterations = 6;
  engine.enableSleeping = false;

  const rearView = scenario.view === "rear";
  const stance = setup.stance;
  const lean = Math.max(-1, Math.min(1, setup.lean));
  const cargoUnit = Math.max(0, Math.min(1, scenario.cargoLocked ? (scenario.cargo ?? 0) : setup.cargo));
  const cargoKg = CARGO_KG * cargoUnit;
  const filter = () => ({ group: -7, category: 1, mask: 0xffffffff });

  /* Anchors for whichever plate is on screen. */
  const seatAt = { x: rearView ? 0 : SEAT.x, h: rearView ? REAR_SEAT_H : SEAT.h };
  const gripAt = { x: rearView ? 0 : GRIP.x, h: rearView ? REAR_GRIP_H : GRIP.h };
  const pegAt = { x: rearView ? 0 : PEG.x, h: rearView ? REAR_PEG_H : PEG.h };
  const rackAt = { x: rearView ? 0 : RACK.x, h: rearView ? REAR_RACK_H : RACK.h };
  const chassisAt = { x: rearView ? 0 : PEG.x, h: rearView ? REAR_CHASSIS_H : SIDE_CHASSIS_H };

  /* --- machine parts, built in the machine frame --- */
  const hull = rearView
    ? shape(
        [
          { x: -0.32 * U, y: (WHEEL_R - 1.0) * U },
          { x: 0.32 * U, y: (WHEEL_R - 1.0) * U },
          { x: 0.27 * U, y: (WHEEL_R - 0.2) * U },
          { x: -0.27 * U, y: (WHEEL_R - 0.2) * U },
        ],
        {},
      )
    : box(0, 0.575, 1.5, 0.55, HULL_KG);
  if (rearView) setKg(hull, HULL_KG);

  /* Seen from behind a tyre is not a disc, it is a section: a flat patch on the
   * ground and a shoulder it rolls onto when the machine leans. As a disc it
   * rolls away downhill instead of going over, and its tipping edge sits under
   * the tyre centre instead of out at the patch. */
  const mkWheel = (x: number) => {
    const w = rearView
      ? Bodies.rectangle(x * U, 0, 2 * TYRE_HALF_W * U, 2 * WHEEL_R * U, {
          chamfer: { radius: TYRE_SHOULDER * U },
        })
      : Bodies.polygon(x * U, 0, 32, WHEEL_R * U, {});
    setKg(w, WHEEL_KG);
    setSpin(w, WHEEL_I);
    return w;
  };
  const wheelA = mkWheel(rearView ? -TRACK_HALF : WHEELBASE / 2); // front / uphill
  const wheelB = mkWheel(rearView ? TRACK_HALF : -WHEELBASE / 2); // rear / downhill

  /* The case the stage draws: same size, same lift off the rack. */
  const caseSize = rearView ? { w: 0.66, h: 0.28 } : { w: 0.5, h: 0.3 };
  const caseH = caseSize.h * (0.55 + 0.45 * cargoUnit);
  const cargo =
    cargoKg > 0.01 ? box(rackAt.x, rackAt.h + caseH / 2 + 0.012, caseSize.w, caseH, cargoKg) : null;

  /* Ballast is the engine mass, placed so the whole machine's centre of gravity
   * lands where a utility quad's really is: low, and 0.55 m ahead of the rear
   * axle. Solved rather than guessed, so it stays put if the hull changes. */
  const hullCog = { x: hull.position.x / U, h: WHEEL_R - hull.position.y / U };
  const ballastAt = {
    x: rearView ? 0 : (MACHINE_KG * MACHINE_COG.x - HULL_KG * hullCog.x) / BALLAST_KG,
    h: (MACHINE_KG * MACHINE_COG.h - HULL_KG * hullCog.h - 2 * WHEEL_KG * WHEEL_R) / BALLAST_KG,
  };
  const ballast = box(ballastAt.x, ballastAt.h, 0.55, 0.3, BALLAST_KG);

  const parts: Matter.Body[] = [hull, ballast];
  if (rearView) parts.push(wheelA, wheelB);
  if (cargo) parts.push(cargo);
  const chassis = Body.create({
    parts,
    friction: rearView ? 0.95 : 0.6,
    frictionStatic: 1.2,
    restitution: 0.04,
    frictionAir: 0.001,
    collisionFilter: filter(),
  });
  const cogLocal = { x: chassis.position.x, y: chassis.position.y };
  const cargoArm = cargo ? Vector.magnitude(Vector.sub(cargo.position, chassis.position)) / U : 0;
  setSpin(chassis, (rearView ? ROLL_I : PITCH_I) + cargoKg * cargoArm * cargoArm);

  /** Machine-frame point -> offset from the chassis CoG, in the build frame. */
  const local = (x: number, h: number) => ({ x: x * U - cogLocal.x, y: (WHEEL_R - h) * U - cogLocal.y });
  const armOf = (p: Matter.Vector) => Vector.rotate(p, chassis.angle);
  const worldOf = (p: Matter.Vector) => Vector.add(chassis.position, armOf(p));

  /* --- ground --- */
  const event = scenario.event;
  const eventX = event ? event.s * RUN_LENGTH_M : 0;
  const eventT = event ? event.s * REAR_SPAN_S : 0;
  const featureSize = event ? eventSize(event) : 0;
  /* A rock band lifts the uphill tyre, a rut drops the downhill one: either
   * way the face under the machine gets this much steeper, this fast. */
  const eventTilt = Math.atan(featureSize / (2 * TRACK_HALF));

  const samples: { x: number; y: number }[] = [];
  type Slab = { body: Matter.Body; centre: Matter.Vector };
  let strip: Slab;

  if (rearView) {
    /* One plane. The event is the ground itself giving way under one tyre —
     * the downhill one dropping into a rut, the uphill one riding up onto a
     * band of rock — which in a cross-section is the plane taking on extra
     * tilt, fast, on top of the face it was already on. Cutting a moving
     * trapdoor into the plane instead gives the tyre a rigid kerb to jam
     * against, which holds a machine up that should be going over. */
    for (let i = 0; i * SEGMENT <= 2 * REAR_HALF_WIDTH + 1e-9; i++) {
      samples.push({ x: -REAR_HALF_WIDTH + i * SEGMENT, y: 0 });
    }
    strip = slabs(samples, GROUND);
  } else {
    /* The same left-Riemann walk up the grade that stageTerrain.tsx draws, so
     * the slab tops and the painted surface are the same line, with the event
     * cut into it at the size the stage draws it. */
    let y = 0;
    for (let i = 0; i * SEGMENT <= RUN_LENGTH_M + TERRAIN_PAST + TERRAIN_BACK + 1e-9; i++) {
      const x = -TERRAIN_BACK + i * SEGMENT;
      if (x > 0) y += Math.tan((profileDeg(scenario, (x - SEGMENT) / RUN_LENGTH_M) * Math.PI) / 180) * SEGMENT;
      let feature = 0;
      if (event && event.kind === "rock" && Math.abs(x - eventX) < ROCK_W / 2) {
        feature = featureSize * Math.cos((Math.PI * (x - eventX)) / ROCK_W) ** 2;
      }
      if (event && event.kind === "washout" && Math.abs(x - eventX) < WASHOUT_W / 2) {
        /* Scoured out: it falls away under you and the far bank stands up
         * almost sheer, which is the wall a front wheel stops against. */
        const u = (x - eventX + WASHOUT_W / 2) / WASHOUT_W;
        feature = -featureSize * (u < WASHOUT_LIP ? smooth(u / WASHOUT_LIP) : 1 - (u - WASHOUT_LIP) / (1 - WASHOUT_LIP));
      }
      samples.push({ x, y: y + feature });
    }
    strip = slabs(samples, GROUND);
  }
  Composite.add(engine.world, strip.body);

  const surfaceAt = (x: number) => {
    const i = Math.max(0, Math.min(samples.length - 2, Math.floor((x - samples[0].x) / SEGMENT)));
    const a = samples[i];
    const b = samples[i + 1];
    const k = Math.max(0, Math.min(1, (x - a.x) / SEGMENT));
    return { y: a.y + (b.y - a.y) * k, grade: Math.atan2(b.y - a.y, SEGMENT) };
  };

  /* --- put the machine on the ground, already at riding speed --- */
  const startGrade = rearView ? 0 : surfaceAt(0).grade;
  const startY = rearView ? 0 : surfaceAt(0).y;
  const stand = {
    x: -Math.sin(startGrade) * WHEEL_R * U,
    y: -(startY + Math.cos(startGrade) * WHEEL_R) * U,
  };
  const place = (b: Matter.Body) => {
    rotateAbout(b, -startGrade, { x: 0, y: 0 });
    Body.setPosition(b, { x: b.position.x + stand.x, y: b.position.y + stand.y });
  };
  place(chassis);
  Composite.add(engine.world, chassis);
  if (!rearView) {
    for (const w of [wheelA, wheelB]) {
      w.friction = 0.05; // the tyre model below does the work
      w.frictionStatic = 0.1;
      w.restitution = 0.02;
      w.frictionAir = 0;
      w.collisionFilter = filter();
      place(w);
      Composite.add(engine.world, w);
      Composite.add(
        engine.world,
        Constraint.create({
          bodyA: chassis,
          pointA: Vector.sub(w.position, chassis.position),
          bodyB: w,
          pointB: { x: 0, y: 0 },
          length: 0,
          stiffness: 0.9,
          damping: 0.12,
        }),
      );
    }
  }

  /* --- rider --- */
  /** How far the hips have slid across the seat, machine-frame metres. */
  let slip = 0;
  const lever = HIP_LEVER[stance];
  const climbSign = profileDeg(scenario, 0.6) >= 0 ? 1 : -1;
  const targetV = climbSign > 0 ? DRIVE_V : DRIVE_V_DOWN;
  const hipAnchor =
    stance === "standing"
      ? { x: pegAt.x + (rearView ? 0 : STAND_BACK_ON_DROPS * Math.min(0, climbSign)), h: pegAt.h + HIP_SAG }
      : { x: seatAt.x, h: seatAt.h + HIP_SAG };
  /* lean −1 is into the hill: up the face, forward on a climb, back on a drop. */
  const leanUnit = rearView ? lean : -lean * climbSign;
  const leanX = leanUnit * (rearView ? LEAN_REACH_REAR : LEAN_REACH_SIDE)[stance];
  const torsoLean = -leanUnit * TORSO_LEAN[stance]; // CCW positive, y up

  const rider = Bodies.rectangle(0, 0, 0.35 * U, 0.9 * U, {
    friction: 0.5,
    frictionAir: 0.01,
    restitution: 0.05,
    collisionFilter: filter(),
  });
  setKg(rider, RIDER_KG);
  setSpin(rider, (RIDER_KG * (0.35 * 0.35 + 0.9 * 0.9)) / 12);
  const hipLocal = { x: 0, y: lever * U };
  const hipHome = () => local(hipAnchor.x + leanX + slip, hipAnchor.h);
  const hipStart = worldOf(hipHome());
  Body.setPosition(rider, { x: hipStart.x - hipLocal.x, y: hipStart.y - hipLocal.y });
  rotateAbout(rider, chassis.angle - torsoLean, hipStart);

  const hipJoint = Constraint.create({
    bodyA: chassis,
    pointA: armOf(hipHome()),
    bodyB: rider,
    pointB: Vector.rotate(hipLocal, rider.angle),
    length: 0,
    stiffness: HIP_STIFFNESS,
    damping: HIP_DAMPING,
  }) as Anchored;
  const gripLocal = local(gripAt.x, gripAt.h);
  const handLocal = { x: 0, y: -0.3 * U };
  const handsWorld = Vector.add(rider.position, Vector.rotate(handLocal, rider.angle));
  const handJoint = Constraint.create({
    bodyA: chassis,
    pointA: armOf(gripLocal),
    bodyB: rider,
    pointB: Vector.rotate(handLocal, rider.angle),
    length: Vector.magnitude(Vector.sub(worldOf(gripLocal), handsWorld)),
    stiffness: HAND_STIFFNESS,
    damping: HAND_DAMPING,
  }) as Anchored;
  Composite.add(engine.world, [rider, hipJoint, handJoint]);

  if (!rearView) {
    const v = {
      x: (targetV * Math.cos(startGrade) * U) / 60,
      y: (-targetV * Math.sin(startGrade) * U) / 60,
    };
    for (const b of [chassis, wheelA, wheelB, rider]) Body.setVelocity(b, v);
    for (const w of [wheelA, wheelB]) Body.setAngularVelocity(w, targetV / WHEEL_R / 60);
  }

  const tiltAt = (t: number) =>
    (profileDeg(scenario, Math.min(1, t / REAR_SPAN_S)) * Math.PI) / 180 +
    (event ? eventTilt * smooth((t - eventT) / EVENT_RAMP_S) : 0);

  /* --- per step --- */
  let stepIndex = 0;
  let attached = true;
  let brokeAt: number | null = null;
  let breakX = 0;
  let handsOn = true;
  let lifted = 0;
  let lastTheta = 0;
  const load = new Map<Matter.Body, number>();
  const touching = new Map<Matter.Body, boolean>([
    [wheelA, true],
    [wheelB, true],
  ]);

  const readContacts = () => {
    const pairs = (engine as unknown as { pairs: { list: Pairish[] } }).pairs.list;
    const fresh = new Map<Matter.Body, number>();
    for (const pair of pairs) {
      if (!pair.isActive) continue;
      let sum = 0;
      for (let i = 0; i < pair.contactCount; i++) sum += Math.abs(pair.contacts[i].normalImpulse);
      const n = sum * NEWTONS;
      fresh.set(pair.bodyA, (fresh.get(pair.bodyA) ?? 0) + n);
      fresh.set(pair.bodyB, (fresh.get(pair.bodyB) ?? 0) + n);
    }
    for (const w of [wheelA, wheelB]) {
      const n = fresh.get(w) ?? 0;
      load.set(w, (load.get(w) ?? 0) * (1 - LOAD_SMOOTH) + n * LOAD_SMOOTH);
      touching.set(w, n > 40);
    }
  };

  /* A torque-limited governor, which is what a low-range quad has: it asks for
   * the target wheel speed and gets as much of it as the torque cap allows, so
   * a wheel in the air spins up and stays there instead of flinging. */
  const driveWheel = (w: Matter.Body) => {
    const spin = w.inertia / (U * U * KG);
    const dwMax = (MOTOR_MAX * STEP_S) / spin;
    const dw = Math.max(-dwMax, Math.min(dwMax, targetV / WHEEL_R - radPerSec(w)));
    w.torque += toTorque((dw * spin) / STEP_S);

    const n = load.get(w) ?? 0;
    if (n < 1) return;
    const g = surfaceAt(w.position.x / U).grade;
    const tx = Math.cos(g);
    const ty = -Math.sin(g);
    const v = metresPerSec(w);
    const slipRate = radPerSec(w) * WHEEL_R - (v.x * tx + v.y * ty);
    const f = Math.max(-TYRE_MU * n, Math.min(TYRE_MU * n, slipRate * TYRE_K));
    /* Traction acts on the machine at the contact patch — at ground level,
     * which is what makes a loaded climb lift its front — and its reaction
     * torque goes back into the wheel it came from. Applied to the wheel
     * instead it has to squeeze through the axle constraint to reach 400 kg of
     * machine, and most of it does not arrive. */
    Body.applyForce(
      chassis,
      { x: w.position.x + WHEEL_R * U * Math.sin(g), y: w.position.y + WHEEL_R * U * Math.cos(g) },
      { x: toForce(f * tx), y: toForce(f * ty) },
    );
    w.torque -= toTorque(f * WHEEL_R);
  };

  const holdPosture = () => {
    if (!attached) return;
    const want = chassis.angle * POSTURE_FOLLOW[stance] - torsoLean;
    const err = Math.max(-TORSO_UPRIGHT, Math.min(TORSO_UPRIGHT, want)) - rider.angle;
    const rate = (Body.getAngularVelocity(chassis) - Body.getAngularVelocity(rider)) * 60;
    const t = Math.max(-POSTURE_MAX, Math.min(POSTURE_MAX, POSTURE_KP * err + POSTURE_KD * rate));
    rider.torque += toTorque(t);
    chassis.torque -= toTorque(t);
  };

  const trackJoints = () => {
    if (!attached) return;
    const hip = hipHome();
    hipJoint.pointA = armOf(hip);
    hipJoint.angleA = chassis.angle;
    let armPull = 0;
    if (handsOn) {
      handJoint.pointA = armOf(gripLocal);
      handJoint.angleA = chassis.angle;
      const reach = Vector.sub(worldOf(gripLocal), Vector.add(rider.position, Vector.rotate(handLocal, rider.angle)));
      const pull = ((Vector.magnitude(reach) - handJoint.length) / U) * HAND_K;
      armPull = Math.max(0, pull);
      /* Arms hold you back from the bars far better than they hold you off
       * them: past ARM_PUSH of compression they fold and you are over the top,
       * which is the whole meaning of going over the bars. */
      if (pull > ARM_N || pull < -ARM_PUSH) {
        handsOn = false;
        armPull = 0;
        Composite.remove(engine.world, handJoint);
      }
    }

    const seat = worldOf(hip);
    const hips = Vector.add(rider.position, Vector.rotate(hipLocal, rider.angle));
    const off = Vector.rotate(Vector.sub(hips, seat), -chassis.angle);
    const shear = off.x / U;
    const press = Math.max(0, (off.y / U) * HIP_K); // still pressed into the seat
    /* What the rider can hold is one budget, however it is shared out: friction
     * on the seat, legs on the tank, arms on the bars. What it has to hold is
     * everything the machine is asking of them. */
    const arms = !handsOn ? 0 : rearView || shear < 0 ? ARM_N : ARM_PUSH;
    const grip = (RIDER_MU * press + GRIP_BASE + arms) * (stance === "standing" ? GRIP_STAND : 1);
    const over = Math.abs(shear) * HIP_K + armPull - grip;
    if (over > 0) slip += (Math.sign(shear) * over) / HIP_K;
    const away = rearView
      ? -chassis.angle + tiltAt(stepIndex * STEP_S)
      : -chassis.angle - surfaceAt(chassis.position.x / U).grade;
    lifted = press <= 0 && Math.abs(away) > LIFT_ANGLE ? lifted + STEP_S : 0;
    const across = leanX + slip;
    const edge = rearView ? SEAT_EDGE[stance] : across < 0 ? SEAT_BACK[stance] : SEAT_FRONT[stance];
    if (Math.abs(across) > edge || lifted > LIFT_S) {
      breakX = Math.abs(slip) > 1e-6 ? leanX + slip : leanX + shear;
      attached = false;
      brokeAt = stepIndex;
      Composite.remove(engine.world, [hipJoint, handJoint]);
      rider.collisionFilter = { group: 0, category: 1, mask: 0xffffffff };
    }
  };

  /* The face steepens under the machine — it does not swing it round on an arc
   * — so the ground reports a rotation about the point the machine stands on.
   * The plate carries its own drop as well, and a moving piece of ground that
   * reports no velocity kicks whatever is resting on it. */
  const placeGround = (t: number) => {
    if (!rearView) return;
    const theta = tiltAt(t);
    const spin = theta - lastTheta;
    lastTheta = theta;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const pin = worldOf(local(0, 0));
    const c = strip.centre;
    const to = { x: c.x * cos - c.y * sin, y: c.x * sin + c.y * cos };
    Body.setAngle(strip.body, theta);
    Body.setPosition(strip.body, to);
    const k = strip.body as Kinematic;
    k.anglePrev = theta - spin;
    k.positionPrev = { x: to.x + spin * (to.y - pin.y), y: to.y - spin * (to.x - pin.x) };
  };

  const step = () => {
    const t = stepIndex * STEP_S;
    placeGround(t);
    readContacts();
    if (!rearView) {
      driveWheel(wheelA);
      driveWheel(wheelB);
    }
    holdPosture();
    trackJoints();
    Engine.update(engine, STEP_MS);
    stepIndex += 1;
  };

  /* --- reporting --- */
  const poseOf = (b: Matter.Body, arm?: Matter.Vector): BodyPose => {
    const p = arm ? worldOf(arm) : b.position;
    return { x: p.x / U, y: -p.y / U, angle: -b.angle };
  };
  const partPose = (b: Matter.Body): BodyPose => ({
    x: b.position.x / U,
    y: -b.position.y / U,
    angle: -chassis.angle,
  });
  const chassisArm = local(chassisAt.x, chassisAt.h);

  const sample = (): WorldSample => {
    const t = stepIndex * STEP_S;
    const chassisX = chassis.position.x / U;
    /* groundAngle mirrors the scenario profile: rear view positive means the
     * hill falls toward +x, side view positive means it rises toward +x. */
    const groundAngle = rearView ? tiltAt(t) : surfaceAt(chassisX).grade;
    const surfaceUp = rearView ? -groundAngle : groundAngle;

    const bodies: Partial<Record<BodyId, BodyPose>> = { chassis: poseOf(chassis, chassisArm) };
    if (rearView) {
      bodies.wheelLeft = partPose(wheelA);
      bodies.wheelRight = partPose(wheelB);
    } else {
      bodies.wheelFront = poseOf(wheelA);
      bodies.wheelRear = poseOf(wheelB);
    }
    if (cargo) bodies.cargo = partPose(cargo);
    bodies.rider = poseOf(rider);
    const hips = Vector.add(rider.position, Vector.rotate(hipLocal, rider.angle));
    const foot = attached ? worldOf(local(pegAt.x, pegAt.h)) : { x: hips.x, y: hips.y + lever * U };
    bodies.riderLegs = {
      x: (hips.x + foot.x) / 2 / U,
      y: -(hips.y + foot.y) / 2 / U,
      angle: Math.atan2(foot.x - hips.x, foot.y - hips.y),
    };

    let mass = chassis.mass;
    let cx = chassis.position.x * chassis.mass;
    let cy = chassis.position.y * chassis.mass;
    if (!rearView) {
      for (const w of [wheelA, wheelB]) {
        mass += w.mass;
        cx += w.position.x * w.mass;
        cy += w.position.y * w.mass;
      }
    }
    if (attached) {
      mass += rider.mass;
      cx += rider.position.x * rider.mass;
      cy += rider.position.y * rider.mass;
    }

    /* The plumb line is measured against the outside edge of each contact
     * patch — the edge the machine actually goes over. */
    const patch = (w: Matter.Body) =>
      (w.position.x + WHEEL_R * U * Math.sin(surfaceAt(w.position.x / U).grade)) / U;
    const pa = rearView ? worldOf(local(-(TRACK_HALF + TYRE_PATCH_HALF), 0)).x / U : patch(wheelA);
    const pb = rearView ? worldOf(local(TRACK_HALF + TYRE_PATCH_HALF, 0)).x / U : patch(wheelB);

    return {
      bodies,
      groundAngle,
      riderAttached: attached,
      contacts: rearView
        ? { left: touching.get(wheelA) ?? false, right: touching.get(wheelB) ?? false }
        : { front: touching.get(wheelA) ?? false, rear: touching.get(wheelB) ?? false },
      cog: { x: cx / mass / U, y: -cy / mass / U },
      support: [Math.min(pa, pb), Math.max(pa, pb)],
      eventActive: !event ? false : rearView ? t > eventT - 0.25 : Math.abs(chassisX - eventX) < EVENT_NEAR,
      s: rearView ? Math.min(1, t / REAR_SPAN_S) : Math.max(0, Math.min(1, chassisX / RUN_LENGTH_M)),
      tilt: -chassis.angle - surfaceUp,
      breakX,
      atEnd: rearView ? t >= REAR_SPAN_S : chassisX >= RUN_LENGTH_M,
    };
  };

  const ys = samples.map((p) => p.y);
  return {
    step,
    sample,
    get time() {
      return stepIndex * STEP_S;
    },
    get stepIndex() {
      return stepIndex;
    },
    get brokeAt() {
      return brokeAt;
    },
    extent: {
      x0: samples[0].x,
      x1: samples[samples.length - 1].x,
      y0: Math.min(...ys) - TERRAIN_DEEP,
      y1: Math.max(...ys) + 2,
    },
  };
}
