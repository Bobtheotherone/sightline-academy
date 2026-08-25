/* Replay (DESIGN-004 §Play): a lesson's playable step as pure play. The real
 * renderer runs with no evidence and a no-op sink, so hunts open in spot
 * mode, sorts and matches chase clean runs, and scenario rides branch fresh —
 * while the lesson's saved progress stays exactly as it was. The one honest
 * label this page owes the rider: nothing here is recorded.
 */
import { useParams } from "react-router-dom";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { SlotArt } from "../../components/SlotArt";
import { Skeleton, SkeletonGroup } from "../../components/Skeleton";
import { ActivityHost } from "../../activities/ActivityHost";
import { RangeHeader } from "./GamesPage";
import { REPLAY_VERB, useReplayStep } from "./data";

const noop = () => undefined;

export default function ReplayPage() {
  const { lessonId, stepId } = useParams();
  const { query, lesson, step } = useReplayStep(lessonId, stepId);

  return (
    <div className="mx-auto w-full max-w-lesson px-6 py-10">
      <RangeHeader
        title={step ? (REPLAY_VERB[step.renderer] ?? "Replay") : "Replay"}
        sub={
          lesson
            ? `From "${lesson.lesson.title}" — pure play, nothing is recorded.`
            : undefined
        }
        art="games-card-replays"
      />

      {query.isLoading && (
        <SkeletonGroup label="Setting up the replay" className="mt-6 flex flex-col gap-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </SkeletonGroup>
      )}

      {!query.isLoading && (query.isError || !step) && (
        <Card padding="l" className="mt-6 rounded-lg">
          <EmptyState
            art={<SlotArt slot="state-locked" ratio="5 / 3" />}
            heading="This replay isn't open"
            body="It belongs to a lesson you haven't unlocked yet — ride the trail to it first, then come practice."
          />
        </Card>
      )}

      {step && (
        <div className="mt-6 rounded-lg bg-paper-50 p-5 shadow-1 sm:p-7">
          {/* Fresh every visit: no evidence in, nothing saved out. */}
          <ActivityHost step={step} evidence={null} onEvidence={noop} />
        </div>
      )}
    </div>
  );
}
