import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { SlotArt } from "../components/SlotArt";
import { LinkButton } from "../components/Button";

/** Designed 404 (SPEC-010) — copy final per DESIGN-005. */
export default function NotFoundPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 items-center px-6 py-16">
      {/* The state sits on an elevated sheet over the ground wash — a dead-end
       * route still lands on a real surface, never on bare ground. */}
      <Card padding="l" className="w-full rounded-lg">
        <EmptyState
          art={<SlotArt slot="state-404" ratio="5 / 3" />}
          heading="This trail doesn't exist."
          body="The address you followed doesn't lead anywhere on the map. Every real route starts from your dashboard."
          action={<LinkButton to="/dashboard">Back to your dashboard</LinkButton>}
        />
      </Card>
    </div>
  );
}
