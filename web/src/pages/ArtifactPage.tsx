/* Artifact detail (DESIGN-003 §Journal): full ArtifactPreview with the field
 * labels from the authoring payload, provenance line ("Built in Module N ·
 * <title>"), and an edit action deep-linking to the journal step. The
 * ride_plan gets a print action (DESIGN-003: the plan is the course's
 * carry-it-with-you product) via the shared .ts-print-sheet stylesheet. The
 * not-built state ships the module CTA instead.
 */
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, PenLine, Printer } from "lucide-react";
import { api, type ArtifactType, type SectionId } from "../lib/api";
import type { JournalBuilderPayload } from "../activities/types";
import { ARTIFACT_FACTS } from "../lib/modules";
import { Reveal } from "../activities/motion";
import { ArtifactPreview, type ArtifactPreviewEntry } from "../components/ArtifactPreview";
import { Card } from "../components/Card";
import { Button, LinkButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { artifactCoverUrl, shortDate } from "../components/JournalCard";
import { SlotArt } from "../components/SlotArt";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";

const JOURNAL_SECTION: SectionId = "journal";

/**
 * Locate the journal_builder step that authors this artifact: the module's
 * lesson listing names which lesson carries a journal section; that lesson's
 * steps carry the field definitions (labels + order) and the edit deep-link.
 */
function useJournalStep(artifactType: ArtifactType, moduleId: string, enabled: boolean) {
  const moduleQuery = useQuery({
    queryKey: ["module", moduleId],
    queryFn: () => api.module(moduleId),
    enabled,
  });
  const journalLesson = moduleQuery.data?.lessons.find((l) =>
    l.sectionsPresent.includes(JOURNAL_SECTION),
  );
  const lessonQuery = useQuery({
    queryKey: ["lesson", journalLesson?.id ?? ""],
    queryFn: () => api.lesson(journalLesson?.id ?? ""),
    enabled: enabled && Boolean(journalLesson),
  });
  const step = lessonQuery.data?.steps.find(
    (s) =>
      s.renderer === "journal_builder" &&
      (s.payload as JournalBuilderPayload).artifactType === artifactType,
  );
  return {
    loading: enabled && (moduleQuery.isLoading || lessonQuery.isLoading),
    lessonId: journalLesson?.id,
    step,
  };
}

export default function ArtifactPage() {
  const { artifactType = "" } = useParams();
  const facts = ARTIFACT_FACTS[artifactType as ArtifactType];

  const journalQuery = useQuery({
    queryKey: ["journal"],
    queryFn: () => api.journal(),
    enabled: Boolean(facts),
  });
  const artifact = journalQuery.data?.artifacts.find((a) => a.artifactType === artifactType);
  const { loading: stepLoading, lessonId, step } = useJournalStep(
    artifactType as ArtifactType,
    facts?.moduleId ?? "",
    Boolean(facts && artifact),
  );

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

  const payload = step?.payload as JournalBuilderPayload | undefined;
  const entries: ArtifactPreviewEntry[] = artifact
    ? payload
      ? payload.fields.map((f) => {
          const raw = artifact.fields[f.id];
          return {
            id: f.id,
            label: f.label,
            value: Array.isArray(raw) ? raw.map(String) : raw === undefined ? "" : String(raw),
          };
        })
      : Object.entries(artifact.fields).map(([id, raw]) => ({
          id,
          label: id.replaceAll("_", " "),
          value: Array.isArray(raw) ? raw.map(String) : String(raw ?? ""),
        }))
    : [];

  const editHref =
    lessonId && step ? `/learn/${lessonId}?step=${step.id}&edit=1` : undefined;
  const cover = artifactCoverUrl(artifactType);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <Link
        to="/journal"
        className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-pine-700 hover:underline"
      >
        <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />
        Field Journal
      </Link>

      <Reveal index={0} className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-start gap-5">
          {/* B-030…B-035 cover — decorative: the eyebrow and title beside it
           * name this artifact and the module it came out of. */}
          {cover && (
            <img
              src={cover}
              alt=""
              aria-hidden
              className="hidden w-36 shrink-0 rounded-sm border border-line-200 bg-paper-0 sm:block"
            />
          )}
          <div>
            <p className="ts-eyebrow">
              Built in Module {facts.moduleOrder} · {facts.moduleTitle}
            </p>
            <h1 className="mt-1 font-display text-3xl font-extrabold">{facts.name}</h1>
            <p className="mt-2 max-w-xl text-ink-500">{facts.blurb}</p>
          </div>
        </div>
        {artifact && (
          <div className="flex flex-wrap gap-3">
            {editHref && (
              <LinkButton
                to={editHref}
                variant="secondary"
                iconLeft={<PenLine className="size-4" strokeWidth={1.5} aria-hidden />}
              >
                Edit in the lesson
              </LinkButton>
            )}
            {artifactType === "ride_plan" && (
              <Button
                onClick={() => window.print()}
                iconLeft={<Printer className="size-4" strokeWidth={1.5} aria-hidden />}
              >
                Print your plan
              </Button>
            )}
          </div>
        )}
      </Reveal>

      <div className="mt-8">
        {journalQuery.isLoading || stepLoading ? (
          <SkeletonGroup label="Loading this artifact" className="flex flex-col gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </SkeletonGroup>
        ) : artifact ? (
          <Reveal index={1}>
            {/* The sheet is the object on the desk: shadow-2 lifts it off the
             * ground wash (DESIGN-003 v2 §Journal detail). Print strips the
             * shadow via .ts-print-sheet's own rules. */}
            <ArtifactPreview
              eyebrow={`Field journal — ${facts.name}`}
              title={artifact.title || facts.name}
              entries={entries}
              status={artifact.status}
              className={`shadow-2 ${artifactType === "ride_plan" ? "ts-print-sheet" : ""}`}
            />
            <p className="mt-3 text-right font-mono text-xs text-ink-500">
              Last updated {shortDate(artifact.updatedAt)}
            </p>
          </Reveal>
        ) : (
          /* No rules here: the ruled pitch registers to the journal card's
           * 32px rhythm, and centred empty-state type would sit across the
           * lines instead of on them. */
          <Card padding="l">
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
        )}
      </div>
    </div>
  );
}
