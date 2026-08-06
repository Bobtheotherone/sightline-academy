/* Activity renderer contracts — the frontend's copy of SPEC-007 (normative).
 * All twelve payload shapes are typed here now so Wave 2 renderers
 * (hotspot_list, structured_response, lab_objective) slot straight in.
 * Payloads arrive verbatim from the API on `step.payload`.
 */

import type { ArtifactType, StepOut } from "../lib/api";

// ---------------------------------------------------------------------------
// Shared payload fields (SPEC-007 preamble)
// ---------------------------------------------------------------------------

export interface StepPayloadBase {
  /** Renders in the step header (ActivityHost owns it). */
  instructions: string;
  /** Optional illustration slot name (DESIGN-002 §Illustration slots). */
  assetSlot?: string;
  /** Optional collapsible hint (ActivityHost owns it). */
  helper?: string;
}

// ---------------------------------------------------------------------------
// 1. content
// ---------------------------------------------------------------------------

export type ContentBlock =
  | { type: "text"; md: string }
  | { type: "callout"; variant: "tip" | "caution" | "story"; title?: string; md: string }
  | { type: "figure"; assetSlot: string; caption: string }
  | { type: "keylist"; title: string; items: { term: string; detail: string }[] };

export interface ContentPayload extends StepPayloadBase {
  blocks: ContentBlock[];
}

// ---------------------------------------------------------------------------
// 2. prediction_reveal
// ---------------------------------------------------------------------------

export interface PredictionRevealPayload extends StepPayloadBase {
  question: string;
  options: { id: string; label: string }[];
  reveal: { md: string; perOption: Record<string, string> };
}

// ---------------------------------------------------------------------------
// 3. multiple_choice
// ---------------------------------------------------------------------------

export interface MultipleChoiceOption {
  id: string;
  text: string;
  isBest: boolean;
  feedback: string;
}

export interface MultipleChoicePayload extends StepPayloadBase {
  prompt: string;
  options: MultipleChoiceOption[];
  explanation?: string;
}

// ---------------------------------------------------------------------------
// 4. sort_categorize
// ---------------------------------------------------------------------------

export interface SortCategorizePayload extends StepPayloadBase {
  categories: { id: string; label: string; hint?: string }[];
  items: { id: string; label: string; categoryId: string; explanation: string }[];
  shuffle: boolean;
}

// ---------------------------------------------------------------------------
// 5. match
// ---------------------------------------------------------------------------

export interface MatchPair {
  id: string;
  left: string;
  right: string;
  explanation?: string;
}

export interface MatchPayload extends StepPayloadBase {
  pairs: MatchPair[];
  shuffle: boolean;
}

// ---------------------------------------------------------------------------
// 6. hotspot_list (Wave 2 component; contract typed now)
// ---------------------------------------------------------------------------

export interface Hotspot {
  id: string;
  label: string;
  /** Percentage of the image box. */
  x: number;
  /** Percentage of the image box. */
  y: number;
  description: string;
  detail?: string;
}

export interface HotspotListPayload extends StepPayloadBase {
  assetSlot: string;
  intro: string;
  hotspots: Hotspot[];
  requireAll: boolean;
}

// ---------------------------------------------------------------------------
// 7. branching_decision
// ---------------------------------------------------------------------------

export type ChoiceQuality = "best" | "okay" | "risky";

export interface BranchChoice {
  id: string;
  label: string;
  quality: ChoiceQuality;
  feedback: string;
  /** Next node id; the same node re-offers (risky), null/absent is terminal. */
  next?: string | null;
}

export interface BranchNode {
  id: string;
  prompt: string;
  choices: BranchChoice[];
}

export interface BranchingDecisionPayload extends StepPayloadBase {
  scenario: string;
  nodes: BranchNode[];
  debrief: string;
  startNode: string;
}

// ---------------------------------------------------------------------------
// 8. structured_response (Wave 2 component; contract typed now)
// ---------------------------------------------------------------------------

export interface StructuredResponsePayload extends StepPayloadBase {
  prompt: string;
  criteria: string[];
  minLength: number;
  placeholder?: string;
  exemplar?: string;
}

// ---------------------------------------------------------------------------
// 9. journal_builder
// ---------------------------------------------------------------------------

export interface JournalField {
  id: string;
  label: string;
  prompt: string;
  minLength?: number;
  /** Renders tappable cards; the selection is stored as the value. */
  options?: string[];
  /** With options: allow several selections (value becomes string[]). */
  multi?: boolean;
  /** Pull a prior artifact's field as an editable starting value. */
  prefillFrom?: { artifactType: ArtifactType; fieldId: string };
}

export interface JournalBuilderPayload extends StepPayloadBase {
  artifactType: ArtifactType;
  title: string;
  intro: string;
  fields: JournalField[];
  /** Where this artifact returns later ("You'll use this in your Ride Plan"). */
  connection: string;
}

// ---------------------------------------------------------------------------
// 10. reflection
// ---------------------------------------------------------------------------

export interface ReflectionPayload extends StepPayloadBase {
  prompt: string;
  chips?: string[];
  allowText: boolean;
}

// ---------------------------------------------------------------------------
// 11. lab_objective (Wave 2 component; contract typed now)
// ---------------------------------------------------------------------------

export interface LabObjectivePayload extends StepPayloadBase {
  lab: "stability_explorer" | "walkaround";
  config: Record<string, unknown>;
  objectives: { id: string; text: string }[];
  debrief: string;
}

// ---------------------------------------------------------------------------
// 12. checkpoint
// ---------------------------------------------------------------------------

export interface CheckpointPayload extends StepPayloadBase {
  mode: "multiple_choice" | "structured_response";
  inner: MultipleChoicePayload | StructuredResponsePayload;
  passCopy: string;
  reviseCopy: string;
}

export type ActivityPayload =
  | ContentPayload
  | PredictionRevealPayload
  | MultipleChoicePayload
  | SortCategorizePayload
  | MatchPayload
  | HotspotListPayload
  | BranchingDecisionPayload
  | StructuredResponsePayload
  | JournalBuilderPayload
  | ReflectionPayload
  | LabObjectivePayload
  | CheckpointPayload;

// ---------------------------------------------------------------------------
// Evidence contracts (SPEC-007 per renderer; SPEC-006 semantics)
// ---------------------------------------------------------------------------

export type EvidenceKind =
  | "acknowledgement"
  | "prediction"
  | "choice"
  | "classification"
  | "matches"
  | "hotspots"
  | "decision_path"
  | "written_response"
  | "journal_artifact"
  | "lab_result"
  | "checkpoint_response";

export interface AcknowledgementValue {
  seen: true;
}

export interface PredictionValue {
  optionId: string;
}

export interface ChoiceValue {
  optionId: string;
  firstAttemptOptionId: string;
}

export interface ClassificationValue {
  placements: Record<string, string>;
}

export interface MatchesValue {
  matches: Record<string, true>;
}

export interface HotspotsValue {
  visited: string[];
}

export interface DecisionPathValue {
  path: { nodeId: string; choiceId: string }[];
}

export interface WrittenResponseValue {
  text?: string;
  chip?: string;
}

export type JournalFieldValue = string | string[];

export interface JournalArtifactValue {
  fields: Record<string, JournalFieldValue>;
}

export interface LabResultValue {
  objectivesMet: string[];
}

/** What a renderer emits; the host page owns persistence (PUT + debounce). */
export interface EvidenceDraft {
  kind: EvidenceKind;
  value: unknown;
  complete: boolean;
}

/** The slice of persisted evidence a renderer needs (EvidenceOut satisfies it). */
export interface StepEvidenceLike {
  kind: string;
  value: unknown;
  complete: boolean;
}

// ---------------------------------------------------------------------------
// Component contract (SPEC-007 §Component architecture)
// ---------------------------------------------------------------------------

/**
 * Every renderer is `activities/<type>/index.tsx` default-exporting a component
 * of these props. Renderers stay pure: they read `step.payload` (cast to their
 * payload type), restore from `evidence`, and report through `onEvidence`.
 */
export interface ActivityProps {
  step: StepOut;
  evidence: StepEvidenceLike | null;
  onEvidence: (draft: EvidenceDraft) => void;
  /**
   * journal_builder only: starting values for fields that declare
   * `prefillFrom`, keyed by field id. The host resolves prior artifacts.
   */
  prefill?: Record<string, JournalFieldValue>;
}
