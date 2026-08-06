import { CircleHelp, Gauge, ListChecks, TimerOff } from "lucide-react";
import { MODULE_FACTS } from "../lib/modules";
import { Card } from "../components/Card";
import { ContourPanel } from "../components/ContourPanel";
import { LinkButton } from "../components/Button";
import { BlazeMarker } from "../components/BlazeMarker";

/**
 * Final assessment — locked composition (SPEC-010): the intro facts are always
 * visible so learners know what's coming; the attempt unlocks after Module 6.
 */
export default function AssessmentPage() {
  const facts = [
    {
      icon: ListChecks,
      title: "20 questions",
      body: "Drawn from all six modules — judgment, machine, gear, terrain, environment, roads.",
    },
    {
      icon: Gauge,
      title: "80% to pass",
      body: "Miss the bar and you'll get a review list of the modules to revisit. Retakes are open.",
    },
    {
      icon: TimerOff,
      title: "No timer",
      body: "Speed has nothing to do with judgment. Take the time the questions deserve.",
    },
    {
      icon: CircleHelp,
      title: "Feedback after submission",
      body: "You'll see per-question feedback once you submit — not while you answer.",
    },
  ];

  return (
    <div className="flex-1">
      <ContourPanel variant="light" className="border-b border-line-200">
        <div className="mx-auto w-full max-w-page px-6 py-10 lg:px-12">
          <p className="ts-eyebrow">Final assessment</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold">The last climb</h1>
          <p className="mt-2 max-w-xl text-ink-500">
            Twenty questions across the whole course. Pass it and your certificate is issued on the
            spot.
          </p>
        </div>
      </ContourPanel>

      <div className="mx-auto w-full max-w-page px-6 py-10 lg:px-12">
        <div className="grid gap-6 md:grid-cols-2">
          {facts.map(({ icon: Icon, title, body }) => (
            <Card key={title} padding="m">
              <Icon className="size-6 text-pine-700" strokeWidth={1.5} aria-hidden />
              <h2 className="mt-3 font-display text-lg font-bold">{title}</h2>
              <p className="mt-1.5 text-sm text-ink-500">{body}</p>
            </Card>
          ))}
        </div>

        <Card padding="l" className="mt-8">
          <h2 className="font-display text-xl font-bold">Locked for now</h2>
          <p className="mt-2 max-w-xl text-sm text-ink-500">
            The assessment opens when all six modules are complete. Here's the trail between you
            and it:
          </p>
          <ul className="mt-5 flex flex-col gap-2.5">
            {MODULE_FACTS.map((mod) => (
              <li key={mod.id} className="flex items-center gap-3 text-sm">
                <BlazeMarker state="todo" size="s" />
                {mod.title}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <LinkButton to="/course">Back to the course</LinkButton>
          </div>
        </Card>
      </div>
    </div>
  );
}
