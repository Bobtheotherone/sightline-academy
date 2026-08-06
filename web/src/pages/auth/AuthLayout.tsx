import { useEffect, useState, type ReactNode } from "react";
import { ContourPanel } from "../../components/ContourPanel";
import { BlazeMarker } from "../../components/BlazeMarker";
import { Card } from "../../components/Card";

/** Three authored field notes about judgment (DESIGN-003 §Auth). */
const QUOTES = [
  {
    text: "The throttle never gets you in trouble on its own. The decision you made ten seconds earlier does.",
    source: "Field notes · The Rider's Mindset",
  },
  {
    text: "Good riders aren't the ones who never meet trouble. They're the ones who saw it coming and were somewhere else.",
    source: "Field notes · Reading the Terrain",
  },
  {
    text: "Walk around the machine before you ride it. It will tell you the truth if you look.",
    source: "Field notes · Know Your Machine",
  },
];

function RotatingQuote() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % QUOTES.length);
        setVisible(true);
      }, 320);
    }, 8000);
    return () => window.clearInterval(timer);
  }, []);

  const quote = QUOTES[index];
  return (
    <figure
      className={`transition-opacity duration-(--ts-dur-slow) ease-in-out ${visible ? "opacity-100" : "opacity-0"}`}
      aria-live="polite"
    >
      <BlazeMarker state="active" size="l" />
      <blockquote className="mt-6 font-display text-2xl font-bold text-paper-0">
        {quote.text}
      </blockquote>
      <figcaption className="mt-5 font-mono text-xs tracking-wide text-paper-0/60">
        {quote.source}
      </figcaption>
    </figure>
  );
}

/** Split auth layout: form card on moss-100 left, pine-950 contour panel right. */
export function AuthLayout({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <div className="grid flex-1 lg:grid-cols-[1fr_minmax(380px,44%)]">
      <div className="flex items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-md">
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          <p className="mt-2 text-ink-500">{lead}</p>
          <Card padding="l" className="mt-6">
            {children}
          </Card>
        </div>
      </div>
      <ContourPanel variant="dark" className="hidden items-center px-12 py-16 lg:flex">
        <RotatingQuote />
      </ContourPanel>
    </div>
  );
}
