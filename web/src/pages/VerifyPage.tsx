/* Public certificate verification (DESIGN-003 v2 §404/verify + standing rule
 * 1): a composed band on textured ground — title + the queried code left/right,
 * the seal card beside a rail explaining what Sightline is, and the marketing
 * footer so the highest-trust page in the product does not end mid-air. The
 * success state carries the course CTA: this is the one moment a stranger meets
 * Sightline.
 */
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { RiseIn } from "../activities/motion";
import { BlazeMarker } from "../components/BlazeMarker";
import { Button, LinkButton } from "../components/Button";
import { Card } from "../components/Card";
import { ContourPanel } from "../components/ContourPanel";
import { EmptyState } from "../components/EmptyState";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";
import { SlotArt } from "../components/SlotArt";
import { usePlanPrice } from "../lib/usePlanPrice";

const COURSE_TITLE = "Sightline Safety Academy ATV & Road Safety Course";

const COURSE_FACTS = ["6 modules", "22 lessons", "~5 hrs, self-paced"];

const DISCLAIMER =
  "Sightline Safety Academy is an online awareness and judgment course. This certificate is not a license, legal certification, or a substitute for hands-on rider training.";

function longDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

/** The supporting column: what the reader is actually looking at, in every state. */
function AboutRail() {
  // Public page, public endpoint: show the price the server will charge.
  const price = usePlanPrice();
  return (
    <RiseIn delay={120}>
      <Card padding="m">
        <p className="ts-eyebrow">What Sightline is</p>
        <h2 className="mt-1.5 font-display text-lg font-bold">
          An ATV &amp; road safety course
        </h2>
        <p className="mt-2 text-sm text-ink-500">
          Judgment first — most crashes are decided before the wheels turn. A certificate means its
          holder worked through all six modules and passed the final assessment.
        </p>
        <ul className="mt-5 flex flex-col gap-2 border-t border-line-200 pt-5 font-mono text-xs text-ink-500">
          {[...COURSE_FACTS, price.display].map((fact) => (
            <li key={fact} className="flex items-center gap-2.5">
              <BlazeMarker state="done" size="s" />
              {fact}
            </li>
          ))}
        </ul>
        <p className="mt-5 border-t border-line-200 pt-5 text-xs text-ink-500">{DISCLAIMER}</p>
      </Card>
    </RiseIn>
  );
}

export default function VerifyPage() {
  const { code = "" } = useParams();

  const query = useQuery({
    queryKey: ["verify", code],
    queryFn: () => api.verify(code),
    retry: false,
  });

  const offline = query.error instanceof ApiError && query.error.status === 0;
  const rejected =
    query.data?.valid === false || (query.error instanceof ApiError && query.error.status > 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ContourPanel
        drift
        glow="sun"
        glowClassName="-top-[10%] right-0 size-[45%]"
        className="flex-1"
      >
        <div className="mx-auto w-full max-w-page px-6 py-14 lg:px-12 lg:py-20">
          {/* Band composes to its edges: what this page is left, the code that
           * was actually checked — in mono — right. */}
          <RiseIn className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
            <div>
              <p className="ts-eyebrow">Sightline Safety Academy</p>
              <h1 className="mt-1 font-display text-3xl font-extrabold">
                Certificate verification
              </h1>
              <p className="mt-2 max-w-xl text-ink-500">
                Anyone can check a Sightline certificate — no account, no login. Here is what this
                code resolves to.
              </p>
            </div>
            <p className="inline-flex items-center gap-2.5 rounded-sm border border-line-200 bg-paper-0 px-4 py-2.5 font-mono text-lg font-medium tracking-[0.12em] text-pine-950">
              <BlazeMarker
                state={query.data?.valid ? "done" : rejected ? "locked" : "todo"}
                size="s"
              />
              {code}
            </p>
          </RiseIn>

          <div className="mt-8 grid items-start gap-6 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
            <div>
              {query.isLoading && (
                <SkeletonGroup
                  label="Checking the certificate code"
                  className="flex flex-col gap-4"
                >
                  <Skeleton className="mx-auto h-8 w-64" />
                  <Skeleton className="h-64 w-full" />
                </SkeletonGroup>
              )}

              {query.data?.valid && (
                /* Same choreography as the empty states (DESIGN-003 v2
                 * §404/verify): the mark rises first, the verdict, the record,
                 * and the way in follow it. */
                <Card padding="l" className="rounded-lg text-center">
                  <RiseIn>
                    <span className="mx-auto grid size-16 place-items-center rounded-full bg-pine-100">
                      <BadgeCheck className="size-8 text-pine-700" strokeWidth={1.5} aria-hidden />
                    </span>
                  </RiseIn>
                  <RiseIn delay={60}>
                    <h2 className="mt-5 font-display text-2xl font-bold">
                      This certificate is genuine
                    </h2>
                    <p className="mx-auto mt-4 max-w-lg text-lg">
                      <span className="font-semibold">{query.data.nameOnCert}</span> completed the{" "}
                      {query.data.courseTitle ?? COURSE_TITLE}
                    </p>
                  </RiseIn>
                  <RiseIn delay={120}>
                    <dl className="mt-7 flex flex-wrap justify-center gap-x-12 gap-y-5 border-t border-line-200 pt-6">
                      <div className="flex min-w-36 flex-col-reverse">
                        <dt className="ts-eyebrow mt-1.5">Issued</dt>
                        <dd className="font-mono text-lg font-medium text-pine-950">
                          {query.data.issuedAt ? longDate(query.data.issuedAt) : "—"}
                        </dd>
                      </div>
                      <div className="flex min-w-36 flex-col-reverse">
                        <dt className="ts-eyebrow mt-1.5">Verification code</dt>
                        <dd className="font-mono text-lg font-medium tracking-[0.12em] text-pine-950">
                          {code}
                        </dd>
                      </div>
                    </dl>
                  </RiseIn>
                  <RiseIn
                    delay={180}
                    className="mt-6 flex flex-wrap justify-center gap-3 border-t border-line-200 pt-6"
                  >
                    <LinkButton
                      to="/register"
                      variant="accent"
                      iconRight={<ArrowRight className="size-4" strokeWidth={2} aria-hidden />}
                    >
                      Start the course
                    </LinkButton>
                    <LinkButton to="/" variant="secondary">
                      See the six modules
                    </LinkButton>
                  </RiseIn>
                </Card>
              )}

              {rejected && (
                <Card padding="l" className="rounded-lg">
                  <EmptyState
                    art={<SlotArt slot="state-404" ratio="5 / 3" />}
                    heading="That code doesn't match a certificate"
                    body="Check the 10-character code printed under the seal — it's easy to swap a letter for a lookalike."
                    action={
                      <>
                        <LinkButton to="/">Go to Sightline Safety Academy</LinkButton>
                        <LinkButton to="/register" variant="secondary">
                          Start the course
                        </LinkButton>
                      </>
                    }
                  />
                </Card>
              )}

              {offline && (
                <Card padding="l" className="rounded-lg">
                  <EmptyState
                    art={<SlotArt slot="state-offline" ratio="5 / 3" />}
                    heading="We couldn't check that code"
                    body="The connection dropped before we could verify. Check your network and try again."
                    action={
                      <Button variant="secondary" onClick={() => query.refetch()}>
                        Try again
                      </Button>
                    }
                  />
                </Card>
              )}
            </div>

            <AboutRail />
          </div>
        </div>
      </ContourPanel>
    </div>
  );
}
