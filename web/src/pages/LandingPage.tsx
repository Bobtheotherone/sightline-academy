import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronDown,
  Clock,
  Compass,
  GraduationCap,
  Hand,
  Medal,
  ShieldCheck,
} from "lucide-react";
import { BlazeMarker } from "../components/BlazeMarker";
import { LinkButton } from "../components/Button";
import { Card } from "../components/Card";
import { ContourPanel } from "../components/ContourPanel";
import { SlotArt } from "../components/SlotArt";
import { StatStrip, type Stat } from "../components/StatStrip";
import { TrailPath } from "../components/TrailPath";
import { Reveal, useReducedMotion } from "../activities/motion";
import { BADGE_FACTS, MODULE_FACTS, type ModuleFacts } from "../lib/modules";

/**
 * Fires once when the section reaches the viewport — the trigger for the two
 * pieces of landing motion that must not run while off-screen (the trail draw
 * and the Ranger demo). Without an observer it reports seen immediately, so
 * nothing is ever gated behind an animation that cannot run.
 */
function useSectionSeen<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (seen) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver !== "function") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen] as const;
}

/** Rise 8px + fade, driven by a stage flag rather than by mount (the demo). */
function rise(shown: boolean): string {
  return `transition-[opacity,translate] duration-(--ts-dur-slow) ease-(--ts-ease-out) ${
    shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
  }`;
}

const GHOST_ON_DARK =
  "inline-flex h-12 items-center justify-center gap-2 rounded-sm border border-paper-0/30 px-6 text-base font-medium text-paper-0 transition-all duration-(--ts-dur-fast) ease-(--ts-ease-out) hover:-translate-y-px hover:border-paper-0/60 hover:bg-paper-0/10";

/** 6 modules · 22 lessons · ~5 hrs · free — the facts, counted (DESIGN-003). */
const HERO_STATS: Stat[] = [
  { value: 6, label: "Modules" },
  { value: 22, label: "Lessons" },
  { value: 5, prefix: "~", suffix: " hrs", label: "Self-paced" },
  { value: 0, prefix: "$", label: "Free, always" },
];

const TOTAL_MINUTES = MODULE_FACTS.reduce((sum, mod) => sum + mod.minutes, 0);

/**
 * The right half of a title band (DESIGN-003 standing rule 1): a band is title
 * + meta + action, never a lonely h2 with half the row empty.
 */
function BandMeta({ facts, to, action }: { facts: string; to: string; action: string }) {
  return (
    <div className="lg:text-right">
      <p className="font-mono text-sm text-ink-500">{facts}</p>
      <Link
        to={to}
        className="mt-2 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-pine-700 underline-offset-4 transition-colors duration-(--ts-dur-fast) ease-(--ts-ease-out) hover:text-pine-950 hover:underline"
      >
        {action}
        <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
      </Link>
    </div>
  );
}

function Hero() {
  return (
    // The clay bloom is centred on the plate's leading edge, so it spills over
    // the empty panel above and left of the art instead of hiding under it.
    <ContourPanel
      variant="dark"
      drift
      glow="clay"
      glowClassName="right-[4%] bottom-[16%] size-[72%]"
    >
      <div className="mx-auto grid max-w-wide items-center gap-10 px-6 pt-16 pb-28 lg:grid-cols-[1fr_1.05fr] lg:px-12 lg:pt-24 lg:pb-32">
        <div>
          <Reveal index={0}>
            <p className="ts-eyebrow text-pine-300!">A free online ATV &amp; road safety course</p>
          </Reveal>
          <Reveal index={1}>
            <h1 className="mt-4 font-display text-4xl font-extrabold text-paper-0">
              Ride like you've thought it through.
            </h1>
          </Reveal>
          <Reveal index={2}>
            <p className="mt-6 max-w-xl text-lg text-paper-0/80">
              Six modules on judgment, machines, gear, terrain, weather, and the road — built for
              riders who'd rather see trouble coming than meet it.
            </p>
          </Reveal>
          <Reveal index={3}>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <LinkButton
                to="/register"
                size="l"
                variant="accent"
                iconRight={<ArrowRight className="size-4" strokeWidth={2} aria-hidden />}
              >
                Start the course — it's free
              </LinkButton>
              <a href="#trail-heading" className={GHOST_ON_DARK}>
                See the six modules
              </a>
            </div>
          </Reveal>
          <Reveal index={4}>
            <StatStrip items={HERO_STATS} onDark className="mt-10 border-t border-paper-0/15 pt-8" />
          </Reveal>
        </div>

        {/* The plate bleeds off the panel's bottom-right edge — no box, no
            border. The negative right margin eats the container gutter AND the
            page's own side margin, so the art runs to the viewport edge at
            every width (the panel's overflow-hidden clips the scrollbar
            overshoot). 3:2 matches the render's own framing; priority + eager
            keep the LCP image out of the lazy queue. */}
        <Reveal
          index={1}
          className="-mr-6 -mb-28 self-end lg:-mb-36 lg:mr-[calc((100vw-min(100vw,var(--ts-container-wide)))*-0.5-48px)]"
        >
          <SlotArt
            slot="hero-landing"
            variant="dark"
            ratio="3 / 2"
            bleed
            priority
            sizes="(min-width: 1024px) 54vw, 100vw"
            className="w-full overflow-hidden rounded-l-xl"
          />
        </Reveal>
      </div>

      <a
        href="#trail-heading"
        aria-label="Skip ahead to the six modules"
        className="group absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2.5 rounded-sm px-4 py-2 text-paper-0/60 transition-colors duration-(--ts-dur-fast) hover:text-paper-0 lg:flex"
      >
        <span className="ts-blaze" aria-hidden />
        <ChevronDown
          className="size-4 transition-transform duration-(--ts-dur-fast) ease-(--ts-ease-out) group-hover:translate-y-[3px]"
          strokeWidth={2}
          aria-hidden
        />
      </a>
    </ContourPanel>
  );
}

const TRAIL_SEGMENTS = MODULE_FACTS.slice(1).map(() => true);

const BADGE_NAMES = new Map(BADGE_FACTS.map((badge) => [badge.id, badge.name]));

/**
 * The marketing waypoint (DESIGN-003 §Landing/2): the in-product ModuleCard
 * treatment — hero art, lift, interior zoom — with no progress affordance at
 * all. A logged-out visitor has no progress, so a ProgressRing here can only
 * tell them six times that they have done nothing; the corner carries what the
 * module pays out instead. Locked modules do not exist here either.
 */
function TrailCard({ mod }: { mod: ModuleFacts }) {
  const badge = BADGE_NAMES.get(mod.badgeId);
  return (
    <Link to="/register" className="group block h-full rounded-md">
      <article className="flex h-full flex-col overflow-hidden rounded-md border border-line-200 bg-paper-0 shadow-1 transition-all duration-(--ts-dur-fast) ease-(--ts-ease-out) hover:-translate-y-[3px] hover:border-pine-300 hover:shadow-2">
        <div className="transition-transform duration-(--ts-dur-base) ease-(--ts-ease-out) group-hover:scale-[1.03]">
          <SlotArt slot={mod.heroSlot} ratio="5 / 2" className="rounded-none border-0" />
        </div>
        <div className="flex flex-1 flex-col gap-2 p-5">
          <div>
            <p className="ts-eyebrow">Module {mod.order}</p>
            <h3 className="mt-1 font-display text-xl font-bold text-pine-950">{mod.title}</h3>
          </div>
          {/* The tagline rests open here: a hover-expand only earns its keep
              when the collapsed row is the resting state, and the height it had
              to reserve left every card half empty. */}
          <p className="text-sm text-ink-500">{mod.tagline}</p>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-2">
            <span className="inline-flex shrink-0 items-center gap-1.5 text-sm whitespace-nowrap text-ink-500">
              <Clock className="size-4" strokeWidth={1.5} aria-hidden />
              {mod.minutes} min
            </span>
            {badge && (
              // Dashed, not the filled sun chip: this badge is on offer, not earned.
              <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-ink-500/50 px-2.5 py-1 font-mono text-xs text-ink-500">
                <Medal className="size-3.5" strokeWidth={2} aria-hidden />
                <span className="sr-only">Badge on offer: </span>
                {badge}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

function TrailSection() {
  const reduced = useReducedMotion();
  const [ref, seen] = useSectionSeen<HTMLDivElement>();
  // The path draws as the section arrives, not silently at page load.
  const drawTrail = reduced || seen;

  return (
    // The band must be a full-width flex child: `mx-auto` on the section itself
    // gives it auto cross-axis margins, which cancel the stretch and shrink the
    // whole trail to max-content. The container lives one level in, as it does
    // in every sibling band.
    <section aria-labelledby="trail-heading">
      <div className="mx-auto max-w-wide px-6 py-20 lg:px-12 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
          <Reveal className="min-w-0 max-w-2xl">
            <p className="ts-eyebrow">The route</p>
            <h2 id="trail-heading" className="mt-2 scroll-mt-24 font-display text-3xl font-bold">
              Six modules, one trail
            </h2>
            <p className="mt-4 text-lg text-ink-500">
              The course moves the way good judgment does — from how riders think, to the machine,
              the gear, the ground, the weather, and finally the road and everyone on it.
            </p>
          </Reveal>
          <Reveal index={1} className="shrink-0">
            <BandMeta
              facts={`22 lessons · ${TOTAL_MINUTES} min · 6 badges`}
              to="/register"
              action="Start with Module 1"
            />
          </Reveal>
        </div>

        <div ref={ref} className="relative mt-12">
          {drawTrail && <TrailPath traversed={TRAIL_SEGMENTS} bow={36} />}
          <ol className="relative flex flex-col gap-8 lg:gap-0">
            {MODULE_FACTS.map((mod, i) => (
              <li
                key={mod.id}
                className={`relative pl-12 lg:w-[calc(50%-40px)] lg:pl-0 ${
                  i % 2 === 0 ? "lg:self-start" : "lg:self-end"
                } ${i > 0 ? "lg:-mt-28" : ""}`}
              >
                <span
                  data-trail-anchor
                  className={`absolute top-10 lg:top-1/2 lg:-translate-y-1/2 ${
                    i % 2 === 0 ? "left-1 lg:left-auto lg:-right-[49px]" : "left-6 lg:-left-[49px]"
                  }`}
                >
                  <BlazeMarker state={i === 0 ? "active" : "todo"} size="m" />
                </span>
                <Reveal>
                  <TrailCard mod={mod} />
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

const RANGER_PROMPTS = [
  "What helmet actually fits me?",
  "Is this hill too steep to climb?",
  "Can I legally cross a paved road?",
];

function RangerDemo() {
  const reduced = useReducedMotion();
  const [ref, seen] = useSectionSeen<HTMLElement>();
  const [stage, setStage] = useState(0);

  // Plays itself once, ≤1.5s: question rises, dots think, grounded answer
  // rises with its sources. Reduced motion gets the settled exchange.
  useEffect(() => {
    if (reduced) {
      setStage(3);
      return;
    }
    if (!seen) return;
    setStage(1);
    const think = window.setTimeout(() => setStage(2), 350);
    const answer = window.setTimeout(() => setStage(3), 950);
    return () => {
      window.clearTimeout(think);
      window.clearTimeout(answer);
    };
  }, [reduced, seen]);

  return (
    <section className="border-y border-line-200 bg-paper-0" aria-labelledby="ranger-heading">
      <div className="mx-auto grid max-w-wide items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:px-12 lg:py-24">
        <div>
          <Reveal index={0}>
            <p className="ts-eyebrow text-sky-600!">Meet Ranger</p>
            <h2 id="ranger-heading" className="mt-2 scroll-mt-24 font-display text-3xl font-bold">
              A tutor that tells you where its answers come from
            </h2>
          </Reveal>
          <Reveal index={1}>
            <p className="mt-4 max-w-lg text-lg text-ink-500">
              Ask Ranger anything about ATV or road safety. When the answer comes from the course,
              it says so and links the module it came from. When it's speaking from broader
              knowledge, it says that too — no bluffing, no invented rules.
            </p>
            <p className="ts-eyebrow mt-8">Riders ask things like</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {RANGER_PROMPTS.map((prompt) => (
                <li
                  key={prompt}
                  className="rounded-full border border-line-200 bg-paper-50 px-3.5 py-1.5 text-sm text-ink-500 shadow-1"
                >
                  {prompt}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* Mocked grounded exchange (authored, curriculum-accurate), staged on
            the in-product surface: the conversation sits on contour ground
            inside a raised panel, so the band reads ground → panel → bubble
            instead of one flat depth. Every bubble holds its space from first
            paint — the play is opacity and transform only, so nothing reflows. */}
        <Reveal index={1}>
          <ContourPanel variant="light" className="overflow-hidden rounded-lg shadow-2">
            <div className="flex items-center gap-2.5 border-b border-line-200 bg-paper-0 px-4 py-2.5">
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                <Compass className="size-4" strokeWidth={1.5} aria-hidden />
              </span>
              <p className="ts-eyebrow">Ranger · course tutor</p>
            </div>
            <figure ref={ref} className="m-0 flex flex-col gap-3 p-4 sm:p-5">
              <figcaption className="sr-only">
                An example exchange with Ranger, the course tutor.
              </figcaption>
              <div
                className={`max-w-[88%] self-end rounded-md rounded-br-[4px] bg-pine-300/40 px-4 py-3 text-sm shadow-1 ${rise(
                  stage >= 1,
                )}`}
              >
                Why is riding on pavement risky if knobby tires still grip?
              </div>
              <div className="flex items-start gap-3 self-start">
                <span
                  aria-hidden
                  className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 shadow-1 ${rise(
                    stage >= 2,
                  )}`}
                >
                  <Compass className="size-4" strokeWidth={1.5} />
                </span>
                <div className="relative min-w-0 flex-1">
                  <div
                    className={`rounded-md rounded-bl-[4px] bg-paper-50 p-4 shadow-1 ${rise(
                      stage >= 3,
                    )}`}
                  >
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-pine-700">
                      <span className="size-2 rounded-full bg-pine-700" aria-hidden />
                      From the course
                    </p>
                    <p className="mt-2 text-sm">
                      ATV tires run at low pressure and the rear axle turns both wheels together — a
                      design that bites into soft ground. On pavement, nothing deforms, so steering
                      gets vague and twitchy at once, and rollover risk climbs in every turn. Add
                      traffic, and you're on the one surface the machine was never designed for.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-sm border border-line-200 bg-paper-0 px-2 py-1 font-mono text-xs text-ink-500">
                        Why pavement changes the machine · Module 6
                      </span>
                      <span className="rounded-sm border border-line-200 bg-paper-0 px-2 py-1 font-mono text-xs text-ink-500">
                        Common crash patterns · Course intro
                      </span>
                    </div>
                  </div>
                  {stage === 2 && (
                    <span
                      aria-hidden
                      className="absolute top-0 left-0 flex items-center gap-1.5 rounded-md rounded-bl-[4px] bg-paper-50 px-4 py-3.5 shadow-1"
                    >
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="size-1.5 animate-pulse rounded-full bg-ink-500"
                          style={{ animationDelay: `${i * 160}ms` }}
                        />
                      ))}
                    </span>
                  )}
                </div>
              </div>
            </figure>
          </ContourPanel>
        </Reveal>
      </div>
    </section>
  );
}

const ARTIFACTS = [
  {
    name: "Risk profile",
    module: "Module 1",
    title: "Where I get caught out",
    lines: [
      "\"Riding the same trail I've ridden a hundred times — I stop looking at it.\"",
      "\"Last one in the group. I ride to keep up, not to read the ground.\"",
    ],
    footer: "3 situations named · 2 countermeasures",
  },
  {
    name: "Gear card",
    module: "Module 3",
    title: "What I pack, every ride",
    lines: [
      "\"Helmet: full-face, DOT, bought 2024 — replace after any impact.\"",
      "\"Goggles, over-ankle boots, gloves, long sleeves. Chest protector for rocky loops.\"",
    ],
    footer: "7 items · condition checked",
  },
  {
    name: "Ride Plan",
    module: "Module 6",
    title: "Saturday — Miller Creek loop",
    lines: [
      "\"Out 9:00, back by 14:00. Dana has the route and the turnaround time.\"",
      "\"One paved crossing at the bridge: stop, walk it, cross at 90°.\"",
    ],
    footer: "Printable · the capstone artifact",
  },
];

function WhatYouBuild() {
  return (
    <ContourPanel variant="light">
      <section
        className="mx-auto max-w-wide px-6 py-20 lg:px-12 lg:py-24"
        aria-labelledby="build-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
          <Reveal index={0} className="min-w-0 max-w-2xl">
            <p className="ts-eyebrow">Your field journal</p>
            <h2 id="build-heading" className="mt-2 scroll-mt-24 font-display text-3xl font-bold">
              You don't just finish — you build
            </h2>
            <p className="mt-4 text-lg text-ink-500">
              Every module ends in an artifact written in your words about your riding. They collect
              in your field journal, and the last one is a ride plan you can print.
            </p>
          </Reveal>
          <Reveal index={1} className="shrink-0">
            <BandMeta
              facts="6 artifacts · 1 printable ride plan"
              to="/register"
              action="Start your field journal"
            />
          </Reveal>
        </div>

        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          {ARTIFACTS.map((artifact, i) => (
            <li key={artifact.name}>
              <Reveal index={i} className="h-full">
                <article className="h-full overflow-hidden rounded-md bg-paper-50 shadow-1">
                  <div className="flex items-center justify-between gap-3 border-b border-line-200 px-5 py-2.5">
                    <p className="ts-eyebrow">{artifact.name}</p>
                    <span className="rounded-full border border-dashed border-ink-500/50 px-2.5 py-0.5 font-mono text-xs text-ink-500">
                      {artifact.module}
                    </span>
                  </div>
                  {/* Rules shifted +6px so baselines sit ON the lines (JournalCard). */}
                  <div className="ts-ruled px-5 pt-3 pb-5" style={{ backgroundPosition: "0 6px" }}>
                    <h3 className="font-display text-lg leading-8 font-bold text-pine-950">
                      {artifact.title}
                    </h3>
                    {artifact.lines.map((line) => (
                      <p key={line} className="text-sm leading-8 text-ink-500">
                        {line}
                      </p>
                    ))}
                    {/* One clear rule of space, not eight — anything off the
                        32px pitch walks the baseline off the line and the meta
                        row renders struck through. */}
                    <p className="mt-8 font-mono text-xs leading-8 text-ink-500">
                      {artifact.footer}
                    </p>
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>
    </ContourPanel>
  );
}

const EXPECTATIONS = [
  {
    icon: ShieldCheck,
    tint: "bg-pine-100 text-pine-700",
    title: "An awareness course",
    body: "Sightline teaches recognition, preparation, and decision-making — the judgment layer of safe riding.",
  },
  {
    icon: GraduationCap,
    tint: "bg-sun-100 text-pine-950",
    title: "A certificate, not a license",
    body: "Your completion certificate says exactly what it is: proof you finished, not a legal certification.",
  },
  {
    icon: Hand,
    tint: "bg-clay-100 text-clay-600",
    title: "Hands-on training still matters",
    body: "Machine skills are learned in person. Every module points you toward qualified hands-on courses.",
  },
];

function HonestExpectations() {
  return (
    // Ground wash, not paper: paper-50 cards on a paper-0 band are two shades
    // apart, so shadow-1 has nothing to fall on and the row reads as wireframe.
    <section className="ts-ground border-y border-line-200" aria-labelledby="honest-heading">
      <div className="mx-auto max-w-wide px-6 py-20 lg:px-12 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
          <Reveal index={0} className="min-w-0 max-w-2xl">
            <p className="ts-eyebrow">Straight with you</p>
            <h2 id="honest-heading" className="mt-2 scroll-mt-24 font-display text-3xl font-bold">
              What this course is — and isn't
            </h2>
            <p className="mt-4 text-lg text-ink-500">
              Sightline is one layer of becoming a safe rider — the judgment layer. Here is exactly
              which layer, and what the certificate at the end does and doesn't say.
            </p>
          </Reveal>
          <Reveal index={1} className="shrink-0">
            <BandMeta
              facts="Certificate of completion · not a license"
              to="/verify/sample"
              action="Verify a certificate"
            />
          </Reveal>
        </div>
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {EXPECTATIONS.map(({ icon: Icon, tint, title, body }, i) => (
            <li key={title}>
              <Reveal index={i} className="h-full">
                <Card interactive padding="m" className="h-full">
                  <span
                    className={`inline-flex size-11 items-center justify-center rounded-full ${tint}`}
                  >
                    <Icon className="size-5" strokeWidth={1.5} aria-hidden />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-sm text-ink-500">{body}</p>
                </Card>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <ContourPanel
      variant="dark"
      drift
      glow="clay"
      glowClassName="-bottom-[35%] left-1/2 size-[55%] -translate-x-1/2"
    >
      <div className="mx-auto flex max-w-wide flex-col items-center gap-6 px-6 py-20 text-center lg:px-12 lg:py-24">
        <Reveal index={0}>
          <Compass className="size-7 text-clay-500" strokeWidth={1.5} aria-hidden />
        </Reveal>
        <Reveal index={1}>
          <p className="max-w-3xl font-display text-3xl font-bold text-paper-0">
            The trail is more fun when you can{" "}
            <span className="whitespace-nowrap">read it.</span>
          </p>
        </Reveal>
        <Reveal index={2}>
          <p className="max-w-xl text-paper-0/75">
            Free, self-paced, and yours to keep — six modules, twenty-two lessons, and a field
            journal you'll actually ride with.
          </p>
        </Reveal>
        <Reveal index={3}>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <LinkButton
              to="/register"
              size="l"
              variant="accent"
              iconRight={<ArrowRight className="size-4" strokeWidth={2} aria-hidden />}
            >
              Start the course — it's free
            </LinkButton>
            <Link
              to="/login"
              className="rounded-sm px-2 py-1 text-sm font-medium text-paper-0/80 underline-offset-4 transition-colors duration-(--ts-dur-fast) hover:text-paper-0 hover:underline"
            >
              I already have an account
            </Link>
          </div>
        </Reveal>
      </div>
    </ContourPanel>
  );
}

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      <Hero />
      <TrailSection />
      <RangerDemo />
      <WhatYouBuild />
      <HonestExpectations />
      <ClosingCta />
    </div>
  );
}
