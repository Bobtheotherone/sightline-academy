import { Link } from "react-router-dom";
import { ArrowRight, Clock, Compass, GraduationCap, Hand, ShieldCheck } from "lucide-react";
import { LinkButton } from "../components/Button";
import { Card } from "../components/Card";
import { ContourPanel } from "../components/ContourPanel";
import { BlazeMarker } from "../components/BlazeMarker";
import { SlotArt } from "../components/SlotArt";
import { Logo } from "../components/Logo";
import { MODULE_FACTS } from "../lib/modules";

function Hero() {
  return (
    <ContourPanel variant="dark">
      <div className="mx-auto grid max-w-page items-center gap-10 px-6 py-16 lg:grid-cols-[1.1fr_1fr] lg:px-12 lg:py-24">
        <div>
          <p className="ts-eyebrow text-pine-300!">A free online ATV &amp; road safety course</p>
          <h1 className="mt-4 font-display text-3xl font-extrabold text-paper-0 md:text-4xl">
            Ride like you've thought it through.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-paper-0/80">
            Six modules on judgment, machines, gear, terrain, weather, and the road — built for
            riders who'd rather see trouble coming than meet it.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <LinkButton to="/register" size="l" variant="accent">
              Start the course — it's free
            </LinkButton>
            <Link
              to="/login"
              className="rounded-sm px-2 py-1 text-sm font-medium text-paper-0/80 underline-offset-4 transition-colors duration-(--ts-dur-fast) hover:text-paper-0 hover:underline"
            >
              I already have an account
            </Link>
          </div>
        </div>
        <SlotArt slot="hero-landing" variant="dark" ratio="4 / 3" className="lg:justify-self-end lg:w-full" />
      </div>
    </ContourPanel>
  );
}

function TrailMap() {
  return (
    <section className="mx-auto max-w-page px-6 py-16 lg:px-12 lg:py-20" aria-labelledby="trail-heading">
      <p className="ts-eyebrow">The route</p>
      <h2 id="trail-heading" className="mt-2 font-display text-2xl font-bold">
        Six modules, one trail
      </h2>
      <p className="mt-3 max-w-xl text-ink-500">
        The course moves the way good judgment does — from how riders think, to the machine, the
        gear, the ground, the weather, and finally the road and everyone on it.
      </p>

      <ol className="relative mt-10 flex flex-col gap-6 lg:gap-0">
        {/* Winding connective path (desktop) */}
        <span
          className="absolute top-6 bottom-6 left-[7px] hidden w-px bg-line-200 lg:left-1/2 lg:block"
          aria-hidden
        />
        <span className="absolute top-4 bottom-4 left-[7px] w-px bg-line-200 lg:hidden" aria-hidden />
        {MODULE_FACTS.map((mod, i) => (
          <li
            key={mod.id}
            className={`relative pl-8 lg:w-[calc(50%-28px)] lg:pl-0 ${
              i % 2 === 0 ? "lg:self-start lg:pr-0" : "lg:self-end"
            } ${i > 0 ? "lg:-mt-6" : ""}`}
          >
            <span
              className={`absolute top-6 left-0 lg:left-auto ${
                i % 2 === 0 ? "lg:-right-[35px]" : "lg:-left-[35px]"
              }`}
            >
              <BlazeMarker state={i === 0 ? "active" : "todo"} size="m" />
            </span>
            <Card interactive padding="m" className="h-full">
              <div className="flex items-baseline justify-between gap-3">
                <p className="ts-eyebrow">Module {mod.order}</p>
                <span className="flex items-center gap-1 font-mono text-xs text-ink-500">
                  <Clock className="size-3.5" strokeWidth={1.5} aria-hidden />
                  {mod.minutes} min
                </span>
              </div>
              <h3 className="mt-1.5 font-display text-xl font-bold">{mod.title}</h3>
              <p className="mt-1.5 text-sm text-ink-500">{mod.tagline}</p>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  );
}

function RangerTeaser() {
  return (
    <section className="border-y border-line-200 bg-paper-0" aria-labelledby="ranger-heading">
      <div className="mx-auto grid max-w-page items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:px-12 lg:py-20">
        <div>
          <p className="ts-eyebrow text-sky-600!">Meet Ranger</p>
          <h2 id="ranger-heading" className="mt-2 font-display text-2xl font-bold">
            A tutor that tells you where its answers come from
          </h2>
          <p className="mt-3 max-w-lg text-ink-500">
            Ask Ranger anything about ATV or road safety. When the answer comes from the course, it
            says so and links the module. When it's speaking from broader knowledge, it says that
            too — no bluffing.
          </p>
        </div>

        {/* Mocked grounded exchange (authored, curriculum-accurate) */}
        <div className="flex flex-col gap-3" aria-label="Example conversation with Ranger">
          <div className="self-end rounded-md rounded-br-[4px] bg-pine-300/30 px-4 py-3 text-sm">
            Why is riding on pavement risky if knobby tires still grip?
          </div>
          <div className="max-w-[92%] self-start rounded-md rounded-bl-[4px] border border-line-200 bg-moss-100 p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-pine-700">
              <span className="size-2 rounded-full bg-pine-700" aria-hidden />
              From the course
            </p>
            <p className="mt-2 text-sm">
              ATV tires run at low pressure and the rear axle turns both wheels together — a design
              that bites into soft ground. On pavement, nothing deforms, so steering gets vague and
              twitchy at once, and rollover risk climbs in every turn. Add traffic, and you're on
              the one surface the machine was never designed for.
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
        </div>
      </div>
    </section>
  );
}

function HonestExpectations() {
  const items = [
    {
      icon: ShieldCheck,
      title: "An awareness course",
      body: "Sightline teaches recognition, preparation, and decision-making — the judgment layer of safe riding.",
    },
    {
      icon: GraduationCap,
      title: "A certificate, not a license",
      body: "Your completion certificate says exactly what it is: proof you finished, not a legal certification.",
    },
    {
      icon: Hand,
      title: "Hands-on training still matters",
      body: "Machine skills are learned in person. Every module points you toward qualified hands-on courses.",
    },
  ];
  return (
    <section className="mx-auto max-w-page px-6 py-16 lg:px-12" aria-labelledby="honest-heading">
      <h2 id="honest-heading" className="font-display text-2xl font-bold">
        What this course is — and isn't
      </h2>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {items.map(({ icon: Icon, title, body }) => (
          <Card key={title} padding="m">
            <Icon className="size-6 text-pine-700" strokeWidth={1.5} aria-hidden />
            <h3 className="mt-3 font-display text-lg font-bold">{title}</h3>
            <p className="mt-1.5 text-sm text-ink-500">{body}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line-200 bg-paper-0">
      <div className="mx-auto flex max-w-page flex-col gap-8 px-6 py-12 lg:flex-row lg:items-start lg:justify-between lg:px-12">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-3 text-sm text-ink-500">
            A free, self-paced ATV and road safety course. Judgment first — because most crashes
            are decided before the wheels turn.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2 text-sm">
          <p className="ts-eyebrow">Get started</p>
          <Link to="/register" className="rounded-sm text-pine-700 hover:underline">
            Create a free account
          </Link>
          <Link to="/login" className="rounded-sm text-pine-700 hover:underline">
            Log in
          </Link>
        </nav>
        <div className="max-w-xs text-xs text-ink-500">
          <p className="ts-eyebrow">The fine print</p>
          <p className="mt-2">
            Sightline Safety Academy is an online awareness and judgment course. It is not a
            license, legal certification, or a substitute for hands-on rider training.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      <Hero />
      <TrailMap />
      <RangerTeaser />
      <HonestExpectations />
      <div className="mx-auto mb-16 flex max-w-page flex-col items-center gap-4 px-6 text-center">
        <Compass className="size-6 text-clay-500" strokeWidth={1.5} aria-hidden />
        <p className="max-w-md font-display text-xl font-bold">
          The trail is more fun when you can read it.
        </p>
        <LinkButton
          to="/register"
          size="l"
          iconRight={<ArrowRight className="size-4" strokeWidth={2} aria-hidden />}
        >
          Start the course — it's free
        </LinkButton>
      </div>
      <Footer />
    </div>
  );
}
