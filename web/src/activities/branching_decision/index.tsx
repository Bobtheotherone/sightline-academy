/* branching_decision renderer (SPEC-007 §7): a field-report scenario with
 * sequential decision points. Risky choices are honored and traversed — the
 * feedback explains consequences and the node re-offers itself so the learner
 * also experiences the better line. The path renders as a breadcrumb trail;
 * the debrief compares the learner's route with the strongest one. Evidence
 * decision_path completes on debrief acknowledge.
 */
import { useMemo, useState } from "react";
import { FileText, RotateCcw } from "lucide-react";
import type {
  ActivityProps,
  BranchChoice,
  BranchNode,
  BranchingDecisionPayload,
  ChoiceQuality,
  DecisionPathValue,
} from "../types";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { FeedbackStrip, type FeedbackTone } from "../../components/FeedbackStrip";
import { BlazeMarker } from "../../components/BlazeMarker";
import { Markdown } from "../Markdown";
import { RiseIn } from "../motion";

const QUALITY_TONE: Record<ChoiceQuality, FeedbackTone> = {
  best: "positive",
  okay: "info",
  risky: "risk",
};

const QUALITY_DOT: Record<ChoiceQuality, string> = {
  best: "bg-pine-700",
  okay: "bg-sky-600",
  risky: "bg-danger-600",
};

const QUALITY_LABEL: Record<ChoiceQuality, string> = {
  best: "Strong line",
  okay: "Defensible — there's a stronger line",
  risky: "That line bites",
};

type PathEntry = { nodeId: string; choiceId: string };

function findChoice(
  nodes: BranchNode[],
  entry: PathEntry,
): { node: BranchNode; choice: BranchChoice } | null {
  const node = nodes.find((n) => n.id === entry.nodeId);
  const choice = node?.choices.find((c) => c.id === entry.choiceId);
  return node && choice ? { node, choice } : null;
}

/** Replay a stored path to find where the learner stands. */
function replay(payload: BranchingDecisionPayload, path: PathEntry[]) {
  let nodeId: string | null = payload.startNode;
  let last: { node: BranchNode; choice: BranchChoice } | null = null;
  for (const entry of path) {
    const hit = findChoice(payload.nodes, entry);
    if (!hit) break;
    last = hit;
    nodeId = hit.choice.next ?? null;
  }
  return { nodeId, last };
}

/** The strongest route: follow the best-quality choice from the start. */
function strongestRoute(payload: BranchingDecisionPayload): { node: BranchNode; choice: BranchChoice }[] {
  const out: { node: BranchNode; choice: BranchChoice }[] = [];
  let nodeId: string | null = payload.startNode;
  const guard = new Set<string>();
  while (nodeId && !guard.has(nodeId)) {
    guard.add(nodeId);
    const node = payload.nodes.find((n) => n.id === nodeId);
    if (!node) break;
    const choice =
      node.choices.find((c) => c.quality === "best") ?? node.choices[0];
    if (!choice) break;
    out.push({ node, choice });
    nodeId = choice.next ?? null;
  }
  return out;
}

function Breadcrumbs({
  payload,
  path,
  label,
}: {
  payload: BranchingDecisionPayload;
  path: PathEntry[];
  label: string;
}) {
  if (path.length === 0) return null;
  return (
    <div>
      <p className="ts-eyebrow">{label}</p>
      <ol className="mt-2 flex flex-wrap items-center gap-2">
        {path.map((entry, i) => {
          const hit = findChoice(payload.nodes, entry);
          if (!hit) return null;
          return (
            <li key={`${entry.nodeId}-${entry.choiceId}-${i}`} className="flex items-center gap-2">
              {i > 0 && <span className="text-line-200" aria-hidden>—</span>}
              <span className="inline-flex max-w-64 items-center gap-2 rounded-full border border-line-200 bg-paper-0 px-3 py-1.5 text-xs text-pine-950">
                <span
                  className={`size-2 shrink-0 rounded-full ${QUALITY_DOT[hit.choice.quality]}`}
                  aria-hidden
                />
                <span className="truncate">{hit.choice.label}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function BranchingDecisionActivity({ step, evidence, onEvidence }: ActivityProps) {
  const payload = step.payload as BranchingDecisionPayload;
  const prior = (evidence?.value ?? null) as DecisionPathValue | null;

  const [path, setPath] = useState<PathEntry[]>(() => prior?.path ?? []);
  const [done, setDone] = useState(Boolean(evidence?.complete));
  /** After completion, "ride it again" stays local until a new debrief ack. */
  const [replaying, setReplaying] = useState(false);
  /** The choice awaiting its Continue/Try-again acknowledgement. */
  const [pending, setPending] = useState<{ node: BranchNode; choice: BranchChoice } | null>(null);

  const { nodeId: currentNodeId } = useMemo(() => replay(payload, path), [payload, path]);
  const currentNode = currentNodeId
    ? payload.nodes.find((n) => n.id === currentNodeId)
    : undefined;
  const strongest = useMemo(() => strongestRoute(payload), [payload]);
  const atTerminal = !done && path.length > 0 && !pending && currentNodeId === null;

  const choose = (node: BranchNode, choice: BranchChoice) => {
    const nextPath = [...path, { nodeId: node.id, choiceId: choice.id }];
    setPath(nextPath);
    setPending({ node, choice });
    if (!done && !replaying) {
      onEvidence({ kind: "decision_path", value: { path: nextPath }, complete: false });
    }
  };

  const acknowledgeDebrief = () => {
    setDone(true);
    setReplaying(false);
    onEvidence({ kind: "decision_path", value: { path }, complete: true });
  };

  const rideAgain = () => {
    setPath([]);
    setPending(null);
    setDone(false);
    setReplaying(true);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* The scenario as a field report card */}
      <Card padding="m" className="relative overflow-hidden">
        <span className="absolute inset-y-0 left-0 w-[3px] bg-clay-500" aria-hidden />
        <div className="flex items-start gap-3 pl-1">
          <FileText className="mt-0.5 size-5 shrink-0 text-clay-500" strokeWidth={1.5} aria-hidden />
          <div className="min-w-0">
            <p className="ts-eyebrow">Field report</p>
            <Markdown md={payload.scenario} className="mt-2 text-base text-pine-950" />
          </div>
        </div>
      </Card>

      {/* The running trail hands off to the debrief's route comparison. */}
      {!atTerminal && !done && (
        <Breadcrumbs payload={payload} path={path} label="The path you've taken" />
      )}

      {/* Pending feedback for the last choice */}
      {pending && (
        <RiseIn>
          <div className="flex flex-col gap-3">
            <FeedbackStrip
              tone={QUALITY_TONE[pending.choice.quality]}
              label={QUALITY_LABEL[pending.choice.quality]}
              md={pending.choice.feedback}
              animate={false}
            />
            <div>
              {pending.choice.next === pending.node.id ? (
                <Button variant="secondary" onClick={() => setPending(null)}>
                  Try the moment again
                </Button>
              ) : pending.choice.next ? (
                <Button onClick={() => setPending(null)}>Continue the ride</Button>
              ) : (
                <Button onClick={() => setPending(null)}>See the debrief</Button>
              )}
            </div>
          </div>
        </RiseIn>
      )}

      {/* Current decision point */}
      {!pending && !done && currentNode && (
        <section aria-label="Decision point">
          <h3 className="font-display text-lg font-bold text-pine-950">{currentNode.prompt}</h3>
          <div className="mt-3 flex flex-col gap-2">
            {currentNode.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => choose(currentNode, choice)}
                className="flex w-full items-center gap-3 rounded-sm border border-line-200 bg-paper-0 px-4 py-3.5 text-left text-base text-pine-950 transition-all duration-(--ts-dur-fast) hover:-translate-y-0.5 hover:border-pine-300 active:scale-[0.99]"
              >
                <BlazeMarker state="todo" size="s" />
                <span className="min-w-0 flex-1">{choice.label}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Debrief: learner's route vs the strongest line */}
      {(atTerminal || done) && (
        <RiseIn>
          <Card padding="m" className="flex flex-col gap-4">
            <div>
              <p className="ts-eyebrow">Debrief</p>
              <Markdown md={payload.debrief} className="mt-2 text-base text-pine-950" />
            </div>
            <Breadcrumbs payload={payload} path={path} label="Your route" />
            <Breadcrumbs
              payload={payload}
              path={strongest.map(({ node, choice }) => ({ nodeId: node.id, choiceId: choice.id }))}
              label="The strongest line"
            />
            {!done ? (
              <div>
                <Button onClick={acknowledgeDebrief}>Log the debrief</Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  iconLeft={<RotateCcw className="size-4" strokeWidth={1.5} aria-hidden />}
                  onClick={rideAgain}
                >
                  Ride it again
                </Button>
                <p className="text-sm text-ink-500">Replays don't touch your completed record.</p>
              </div>
            )}
          </Card>
        </RiseIn>
      )}
    </div>
  );
}
