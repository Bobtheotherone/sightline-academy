import { Award } from "lucide-react";
import { Card } from "../components/Card";
import { LinkButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { SlotArt } from "../components/SlotArt";

/** Certificate — the designed "finish the course" state (SPEC-010). */
export default function CertificatePage() {
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
        <p className="text-xs text-ink-500">
          Sightline Safety Academy is an online awareness and judgment course. This certificate
          recognizes completion of the Sightline Safety Academy ATV &amp; Road Safety Course. It is
          not a license, legal certification, or a substitute for hands-on rider training. For
          hands-on training, seek a qualified in-person course in your region.
        </p>
      </Card>
    </div>
  );
}
