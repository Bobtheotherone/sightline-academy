import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError, type ArtifactOut } from "../lib/api";
import { ARTIFACT_FACTS } from "../lib/modules";
import { Card } from "../components/Card";
import { Button, LinkButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { SlotArt } from "../components/SlotArt";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";
import { BlazeMarker } from "../components/BlazeMarker";

function ArtifactCard({ artifact }: { artifact: ArtifactOut }) {
  const facts = ARTIFACT_FACTS[artifact.artifactType];
  return (
    <Link to={`/journal/${artifact.artifactType}`} className="block break-inside-avoid rounded-md">
      <Card interactive padding="m" className="ts-ruled">
        <p className="ts-eyebrow">{facts?.name ?? artifact.artifactType}</p>
        <h2 className="mt-1 font-display text-lg font-bold">
          {artifact.title || facts?.name}
        </h2>
        <div className="mt-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs text-ink-500">
            <BlazeMarker state={artifact.status === "complete" ? "done" : "active"} size="s" />
            {artifact.status === "complete" ? "Complete" : "Draft"}
          </span>
          <span className="font-mono text-xs text-ink-500">
            {new Date(artifact.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </Card>
    </Link>
  );
}

export default function JournalPage() {
  const query = useQuery({ queryKey: ["journal"], queryFn: () => api.journal() });

  // A 404 here means the journal service hasn't stored anything for this
  // account yet — same learner-facing truth as an empty journal.
  const emptyish =
    (query.data && query.data.artifacts.length === 0) ||
    (query.error instanceof ApiError && query.error.status === 404);
  const hardError = query.error != null && !emptyish;

  return (
    <div className="mx-auto w-full max-w-page flex-1 px-6 py-10 lg:px-12">
      <p className="ts-eyebrow">Field Journal</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold">Your journal</h1>
      <p className="mt-2 max-w-xl text-ink-500">
        Everything you build in the course lives here — one artifact per module, yours to keep.
      </p>

      <div className="mt-8">
        {query.isLoading && (
          <SkeletonGroup label="Loading your journal" className="grid gap-5 md:grid-cols-2">
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </SkeletonGroup>
        )}

        {emptyish && (
          <Card padding="l" className="ts-ruled">
            <EmptyState
              art={<SlotArt slot="empty-journal" ratio="5 / 3" />}
              heading="Your field journal is empty"
              body="As you work through the course you'll build a risk profile, a gear card, an inspection log, and more — they all live here."
              action={<LinkButton to="/course/m1-riders-mindset">Start Module 1</LinkButton>}
            />
          </Card>
        )}

        {hardError && (
          <Card padding="l">
            <EmptyState
              heading="Couldn't open your journal"
              body="The connection dropped before your artifacts arrived. Check your network and try again."
              action={
                <Button variant="secondary" onClick={() => query.refetch()}>
                  Try again
                </Button>
              }
            />
          </Card>
        )}

        {query.data && query.data.artifacts.length > 0 && (
          <div className="columns-1 gap-5 md:columns-2 [&>*]:mb-5">
            {query.data.artifacts.map((artifact) => (
              <ArtifactCard key={artifact.artifactType} artifact={artifact} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
