import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { SlotArt } from "../components/SlotArt";
import { Button, LinkButton } from "../components/Button";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";
import { BlazeMarker } from "../components/BlazeMarker";

export default function VerifyPage() {
  const { code = "" } = useParams();

  const query = useQuery({
    queryKey: ["verify", code],
    queryFn: () => api.verify(code),
    retry: false,
  });

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <p className="ts-eyebrow text-center">Certificate verification</p>

      {query.isLoading && (
        <SkeletonGroup label="Checking the certificate code" className="mt-8 flex flex-col gap-4">
          <Skeleton className="mx-auto h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </SkeletonGroup>
      )}

      {query.data?.valid && (
        <Card padding="l" className="mt-8 text-center">
          <BadgeCheck className="mx-auto size-10 text-pine-700" strokeWidth={1.5} aria-hidden />
          <h1 className="mt-4 font-display text-2xl font-bold">This certificate is genuine</h1>
          <p className="mt-4 text-lg">
            <span className="font-semibold">{query.data.nameOnCert}</span> completed the{" "}
            {query.data.courseTitle ?? "Sightline Safety Academy ATV & Road Safety Course"}
          </p>
          {query.data.issuedAt && (
            <p className="mt-2 text-sm text-ink-500">
              Issued{" "}
              {new Date(query.data.issuedAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
          <p className="mt-5 inline-flex items-center gap-2 rounded-sm border border-line-200 bg-moss-100 px-3 py-1.5 font-mono text-sm">
            <BlazeMarker state="done" size="s" />
            {code}
          </p>
          <p className="mx-auto mt-6 max-w-md text-xs text-ink-500">
            Sightline Safety Academy is an online awareness and judgment course. This certificate is
            not a license, legal certification, or a substitute for hands-on rider training.
          </p>
        </Card>
      )}

      {(query.data?.valid === false ||
        (query.error instanceof ApiError && query.error.status > 0)) && (
        <Card padding="l" className="mt-8">
          <EmptyState
            art={<SlotArt slot="state-404" ratio="5 / 3" />}
            heading="That code doesn't match a certificate"
            body="Check the 10-character code printed under the seal — it's easy to swap a letter for a lookalike."
            action={<LinkButton to="/">Go to Sightline Safety Academy</LinkButton>}
          />
        </Card>
      )}

      {query.error instanceof ApiError && query.error.status === 0 && (
        <Card padding="l" className="mt-8">
          <EmptyState
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
  );
}
