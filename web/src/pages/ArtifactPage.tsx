import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ARTIFACT_FACTS } from "../lib/modules";
import type { ArtifactType } from "../lib/api";
import { Card } from "../components/Card";
import { LinkButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { SlotArt } from "../components/SlotArt";

/**
 * Artifact detail (DESIGN-003 §Journal). The live ArtifactPreview arrives with
 * the journal_builder renderer (Wave 2); this shell owns the provenance chrome
 * and the designed not-built-yet state.
 */
export default function ArtifactPage() {
  const { artifactType = "" } = useParams();
  const facts = ARTIFACT_FACTS[artifactType as ArtifactType];

  if (!facts) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-16">
        <EmptyState
          art={<SlotArt slot="state-404" ratio="5 / 3" />}
          heading="This trail doesn't exist."
          body="No artifact goes by that name. The six real ones live in your journal."
          action={<LinkButton to="/journal">Back to your journal</LinkButton>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <Link
        to="/journal"
        className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-pine-700 hover:underline"
      >
        <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />
        Field Journal
      </Link>

      <div className="mt-6">
        <p className="ts-eyebrow">
          Built in Module {facts.moduleOrder} · {facts.moduleTitle}
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold">{facts.name}</h1>
        <p className="mt-2 max-w-xl text-ink-500">{facts.blurb}</p>
      </div>

      <Card padding="l" className="ts-ruled mt-8">
        <EmptyState
          art={<SlotArt slot="empty-journal" ratio="5 / 3" />}
          heading={`You haven't built your ${facts.name.toLowerCase()} yet`}
          body={`It comes together inside ${facts.moduleTitle} — the course walks you through every field.`}
          action={
            <LinkButton to={`/course/${facts.moduleId}`}>
              Go to Module {facts.moduleOrder}
            </LinkButton>
          }
        />
      </Card>
    </div>
  );
}
