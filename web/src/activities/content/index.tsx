/* content renderer (SPEC-007 §1): narrative/teaching blocks with the trail-
 * marker keylist treatment, designed callouts, and figure slots. Acknowledges
 * automatically when the learner reaches the bottom (IntersectionObserver);
 * the player's Continue press is the fallback path (host page emits it).
 */
import { useEffect, useRef } from "react";
import type { ActivityProps, ContentBlock, ContentPayload } from "../types";
import { CalloutCard, type CalloutKind } from "../../components/CalloutCard";
import { BlazeMarker } from "../../components/BlazeMarker";
import { SlotArt } from "../../components/SlotArt";
import { HotspotFigure } from "./HotspotFigure";
import { Markdown } from "../Markdown";

const CALLOUT_KIND: Record<string, CalloutKind> = {
  tip: "tip",
  caution: "caution",
  story: "story",
};

const CALLOUT_DEFAULT_TITLE: Record<string, string> = {
  tip: "Tip",
  caution: "Caution",
  story: "Field story",
};

/**
 * `${stepId}:${variant}` → vignette slot (VISUAL_ASSETS §7.3, C-020…C-037).
 * The mapping lives in code, not the payloads, for the same ADR-006 reason as
 * assets/slotmap.ts: content declares meaning, art is presentation. A step
 * absent here renders its callout exactly as it did before the art existed.
 * No step carries two ready callouts of the same variant, so the pair is a key.
 */
const CALLOUT_ART: Record<string, string> = {
  "m1-l1-s1:story": "callout-pattern",
  "m2-l3-s1:story": "callout-why-it-works",
  "m5-l2-s1:story": "callout-checkin",
  "m6-l3-s1:story": "callout-counting",
  /* The awareness line borrows m2-l4-s1's plate. Its own, callout-awareness-line,
   * drew the three sources of knowledge as three nested rounded rectangles around
   * a thumbnail-sized quad — abstract enough that it read as decoration rather
   * than as an idea. This one shows a rider sizing up a machine, which is what
   * "know when something needs a qualified mechanic" actually looks like.
   * NOTE: that makes callout-fit appear twice in Module 2, one lesson apart. */
  "m2-l3-s1:caution": "callout-fit",
  "m2-l4-s1:caution": "callout-fit",
  "m4-l2-s1:caution": "callout-model",
  "m5-l3-s1:caution": "callout-boundary",
  "m6-l1-s2:caution": "callout-traffic",
  "m1-l2-s1:tip": "callout-out-loud",
  "m4-l1-s1:tip": "callout-cues",
};

function Block({ block, stepId }: { block: ContentBlock; stepId: string }) {
  switch (block.type) {
    case "text":
      return <Markdown md={block.md} className="text-base text-pine-950" />;
    case "callout":
      return (
        <CalloutCard
          kind={CALLOUT_KIND[block.variant] ?? "tip"}
          title={block.title ?? CALLOUT_DEFAULT_TITLE[block.variant] ?? "Note"}
          art={CALLOUT_ART[`${stepId}:${block.variant}`]}
        >
          <Markdown md={block.md} />
        </CalloutCard>
      );
    case "figure":
      return (
        <figure>
          <SlotArt slot={block.assetSlot} ratio="5 / 3" />
          <figcaption className="mt-2 text-sm text-ink-500">{block.caption}</figcaption>
        </figure>
      );
    case "hotspot_figure":
      return <HotspotFigure block={block} />;
    case "keylist":
      return (
        <section aria-label={block.title}>
          <h3 className="font-display text-lg font-bold text-pine-950">{block.title}</h3>
          <ul className="mt-3 flex flex-col gap-3">
            {block.items.map((item) => (
              <li key={item.term} className="flex items-start gap-3">
                <BlazeMarker state="active" size="s" className="mt-[7px]" />
                <span className="min-w-0">
                  <span className="font-semibold text-pine-950">{item.term}</span>
                  <span className="mt-0.5 block text-sm text-ink-500">{item.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      );
  }
}

export default function ContentActivity({ step, evidence, onEvidence }: ActivityProps) {
  const payload = step.payload as ContentPayload;
  const seenRef = useRef(Boolean(evidence?.complete));
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (seenRef.current) return;
    const el = endRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !seenRef.current) {
        seenRef.current = true;
        onEvidence({ kind: "acknowledgement", value: { seen: true }, complete: true });
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [onEvidence]);

  return (
    <div className="flex flex-col gap-5">
      {payload.blocks.map((block, i) => (
        <Block key={i} block={block} stepId={step.id} />
      ))}
      {/* Bottom sentinel: reaching it acknowledges the step. */}
      <div ref={endRef} aria-hidden className="h-px" />
    </div>
  );
}
