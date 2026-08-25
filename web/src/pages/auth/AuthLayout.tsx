import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ContourPanel } from "../../components/ContourPanel";
import { BlazeMarker } from "../../components/BlazeMarker";
import { StatStrip, type Stat } from "../../components/StatStrip";
import { Reveal, useReducedMotion } from "../../activities/motion";
import { usePlanPrice } from "../../lib/usePlanPrice";

/** The hero's facts, restated under the form so the half composes vertically. */
const COURSE_FACTS: Stat[] = [
  { value: 6, label: "Modules" },
  { value: 22, label: "Lessons" },
  { value: 5, prefix: "~", suffix: " hrs", label: "Self-paced" },
];

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
  const { pathname } = useLocation();
  const reduced = useReducedMotion();
  // Login and register open on different notes so the two routes aren't clones.
  const first = pathname.includes("register") ? 1 : 0;
  const [index, setIndex] = useState(first);
  const [visible, setVisible] = useState(true);

  // One pass through the remaining notes, then rest (WCAG 2.2.2 — content that
  // auto-updates must not do so indefinitely without a pause control). Under
  // reduced motion the note parks: the global rule collapses the fade but not
  // the 400ms opacity-0 hold, which would hard-blink the panel's only content.
  useEffect(() => {
    if (reduced) return;
    let advanced = 0;
    const timer = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % QUOTES.length);
        setVisible(true);
      }, 400);
      advanced += 1;
      if (advanced >= QUOTES.length - 1) window.clearInterval(timer);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [reduced]);

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

/**
 * Split auth layout (DESIGN-003 §Auth): elevated form card on the contour
 * ground wash left, drifting pine-gradient contour panel with the field note
 * right. The card never floats alone — the facts strip and the trust line
 * carry the left half to the bottom of the panel (DESIGN-006 §Depth).
 */
export function AuthLayout({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: ReactNode;
}) {
  // Same source as the landing hero: the price the server will actually charge.
  const price = usePlanPrice();
  const priceStat: Stat = {
    value: price.dollars,
    prefix: "$",
    suffix: "/mo",
    label: price.label,
  };
  return (
    <div className="grid flex-1 lg:grid-cols-[1fr_minmax(380px,44%)]">
      <ContourPanel
        variant="light"
        className="flex items-center justify-center px-6 py-12 lg:px-12"
      >
        <div className="w-full max-w-md">
          <Reveal>
            <h1 className="font-display text-2xl font-bold">{title}</h1>
            <p className="mt-2 text-ink-500">{lead}</p>
          </Reveal>
          <div className="mt-6 rounded-lg bg-paper-50 p-8 shadow-2">{children}</div>
          <Reveal index={3} className="mt-10 border-t border-line-200 pt-8">
            <StatStrip items={[...COURSE_FACTS, priceStat]} columns={2} />
            <p className="mt-7 font-mono text-xs leading-relaxed text-ink-500">
              Your email is only how your progress and certificate stay attached to
              you.
            </p>
          </Reveal>
        </div>
      </ContourPanel>
      <ContourPanel variant="dark" drift className="hidden items-center px-12 py-16 lg:flex">
        <RotatingQuote />
      </ContourPanel>
    </div>
  );
}
