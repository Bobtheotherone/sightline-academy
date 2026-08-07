/* Field Journal index (DESIGN-003 §Journal): JournalCards in a 2-col masonry
 * on the ruled background — type eyebrow, title, an excerpt in the learner's
 * words, updated time, status stitch. Empty state copy is DESIGN-005 verbatim.
 */
import { useQuery } from "@tanstack/react-query";
import { api, ApiError, type ArtifactOut } from "../lib/api";
import { ARTIFACT_FACTS } from "../lib/modules";
import { Card } from "../components/Card";
import { Button, LinkButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { JournalCard } from "../components/JournalCard";
import { SlotArt } from "../components/SlotArt";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";

/** First filled prose field, quoted on the card. */
function excerptOf(artifact: ArtifactOut): string | undefined {
  for (const value of Object.values(artifact.fields)) {
    if (typeof value === "string" && value.trim().length > 12) return value.trim();
  }
  return undefined;
}

export default function JournalPage() {
  const query = useQuery({ queryKey: ["journal"], queryFn: () => api.journal() });

  // A 404 here means the journal service hasn't stored anything for this
  // account yet — same learner-facing truth as an empty journal.
  const emptyish =
    (query.data && query.data.artifacts.length === 0) ||
    (query.error instanceof ApiError && query.error.status === 404);
  const hardError = query.error != null && !emptyish;

  const artifacts = (query.data?.artifacts ?? [])
    .slice()
    .sort(
      (a, b) =>
        (ARTIFACT_FACTS[a.artifactType]?.moduleOrder ?? 9) -
        (ARTIFACT_FACTS[b.artifactType]?.moduleOrder ?? 9),
    );

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

        {artifacts.length > 0 && (
          <div className="columns-1 gap-5 md:columns-2 [&>*]:mb-5">
            {artifacts.map((artifact) => {
              const facts = ARTIFACT_FACTS[artifact.artifactType];
              return (
                <JournalCard
                  key={artifact.artifactType}
                  to={`/journal/${artifact.artifactType}`}
                  artifactType={artifact.artifactType}
                  eyebrow={facts?.name ?? artifact.artifactType}
                  title={artifact.title || facts?.name || artifact.artifactType}
                  excerpt={excerptOf(artifact)}
                  status={artifact.status}
                  updatedAt={artifact.updatedAt}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
