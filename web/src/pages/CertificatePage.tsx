/* Certificate (SPEC-009 §Certificate, DESIGN-003): a diploma, not a webpage —
 * generous margins, cert-seal plate, learner name in the display face, mono
 * verification code + URL, the exact disclaimer, and a print stylesheet
 * (.ts-print-sheet in app.css) that drops all app chrome. The not-yet state
 * stays the designed "finish the course" composition. Reveal: one 900ms
 * fade-in (DESIGN-004 — the only animation allowed past 600ms).
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Award, BadgeCheck, Printer } from "lucide-react";
import { api, ApiError, type CertificateOut } from "../lib/api";
import { Card } from "../components/Card";
import { Button, LinkButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { SlotArt } from "../components/SlotArt";
import { BlazeMarker } from "../components/BlazeMarker";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";
import { useEntered } from "../activities/motion";

const COURSE_TITLE = "Sightline Safety Academy ATV & Road Safety Course";

/** SPEC-009 disclaimer — exact text, printed on the certificate itself. */
const DISCLAIMER =
  "Sightline Safety Academy is an online awareness and judgment course. This certificate " +
  "recognizes completion of the Sightline Safety Academy ATV & Road Safety Course. It is not a license, " +
  "legal certification, or a substitute for hands-on rider training. For hands-on training, " +
  "seek a qualified in-person course in your region.";

function longDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

/** The designed "finish the course" state (unchanged from Wave 0). */
function NotYet() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <p className="ts-eyebrow">Certificate</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold">Your name goes here</h1>
      <p className="mt-2 max-w-xl text-ink-500">
        Finish all six modules and pass the final assessment, and this page becomes your
        certificate — printable, verifiable, and honest about what it means.
      </p>

      <Card padding="l" className="mt-8">
        <EmptyState
          art={<SlotArt slot="cert-seal" ratio="5 / 3" />}
          heading="The frame is waiting"
          body="Your certificate is issued the moment you pass the final assessment, with a verification code anyone can check."
          action={<LinkButton to="/course">Keep riding the course</LinkButton>}
        />
      </Card>

      <Card padding="m" className="mt-6 flex items-start gap-3">
        <Award className="mt-0.5 size-5 shrink-0 text-sun-400" strokeWidth={1.5} aria-hidden />
        <p className="text-xs text-ink-500">{DISCLAIMER}</p>
      </Card>
    </div>
  );
}

/** The issued diploma. */
function Diploma({ cert }: { cert: CertificateOut }) {
  const revealed = useEntered();
  const verifyPath = `/verify/${cert.code}`;
  const verifyUrl = `${window.location.origin}${verifyPath}`;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <p className="ts-eyebrow">Certificate</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold">The whole trail, ridden</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => window.print()}
            iconLeft={<Printer className="size-4" strokeWidth={1.5} aria-hidden />}
          >
            Print certificate
          </Button>
          <LinkButton
            to={verifyPath}
            variant="secondary"
            iconLeft={<BadgeCheck className="size-4" strokeWidth={1.5} aria-hidden />}
          >
            Public verification page
          </LinkButton>
        </div>
      </div>

      {/* The sheet. Reveal is opacity-only so the print layout (absolute
          positioning in app.css) keeps a clean containing block. */}
      <div
        className={`ts-print-sheet mt-8 rounded-lg border border-line-200 bg-paper-0 shadow-soft transition-opacity ease-(--ts-ease-out) ${
          revealed ? "opacity-100" : "opacity-0"
        }`}
        style={{ transitionDuration: "900ms" }}
      >
        <div className="m-3 rounded-md border border-pine-700/25 px-6 py-12 text-center sm:px-12 md:px-16 md:py-16">
          <div
            className={`mx-auto w-32 transition-transform ease-(--ts-ease-out) ${
              revealed ? "scale-100" : "scale-90"
            }`}
            style={{ transitionDuration: "900ms" }}
          >
            <SlotArt slot="cert-seal" ratio="1 / 1" className="border-transparent" />
          </div>
          <p className="ts-eyebrow mt-8">Sightline Safety Academy</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold text-pine-950">
            Certificate of Completion
          </h2>

          <p className="mt-10 text-sm text-ink-500">This certifies that</p>
          <p className="mt-2 font-display text-4xl font-extrabold text-pine-950">
            {cert.nameOnCert}
          </p>
          <div className="mt-5 flex items-center justify-center gap-2.5" aria-hidden>
            <span className="h-px w-16 bg-line-200" />
            <BlazeMarker state="done" size="m" />
            <span className="h-px w-16 bg-line-200" />
          </div>

          <p className="mt-5 text-sm text-ink-500">has completed the</p>
          <p className="mx-auto mt-1 max-w-md font-display text-xl font-bold text-pine-950">
            {COURSE_TITLE}
          </p>
          <p className="mt-3 text-sm text-ink-500">Issued {longDate(cert.issuedAt)}</p>

          <div className="mx-auto mt-10 max-w-md border-t border-line-200 pt-6">
            <p className="ts-eyebrow">Verification</p>
            <p className="mt-2 font-mono text-lg font-medium tracking-[0.2em] text-pine-950">
              {cert.code}
            </p>
            <Link
              to={verifyPath}
              className="mt-1 inline-block rounded-sm font-mono text-xs text-ink-500 hover:text-pine-700 hover:underline"
            >
              {verifyUrl}
            </Link>
          </div>

          <p className="mx-auto mt-10 max-w-xl text-xs leading-relaxed text-ink-500">
            {DISCLAIMER}
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-center print:hidden">
        <Link
          to="/dashboard"
          className="rounded-sm text-sm font-medium text-pine-700 hover:underline"
        >
          Back to your dashboard
        </Link>
      </div>
    </div>
  );
}

export default function CertificatePage() {
  const query = useQuery({
    queryKey: ["certificate"],
    queryFn: () => api.certificate(),
    retry: (n, err) => !(err instanceof ApiError && err.status === 404) && n < 2,
  });

  if (query.isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <SkeletonGroup label="Fetching your certificate" className="flex flex-col gap-8">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-[560px] w-full rounded-lg" />
        </SkeletonGroup>
      </div>
    );
  }

  if (query.data) return <Diploma cert={query.data} />;

  if (query.error instanceof ApiError && query.error.status === 404) return <NotYet />;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Card padding="l">
        <EmptyState
          heading="Couldn't load your certificate"
          body={
            query.error instanceof ApiError && query.error.status === 0
              ? "The connection dropped before it arrived. Check your network and try again."
              : "Something went wrong fetching your certificate. Try again in a moment."
          }
          action={
            <Button variant="secondary" onClick={() => query.refetch()}>
              Try again
            </Button>
          }
        />
      </Card>
    </div>
  );
}
