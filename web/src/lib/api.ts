/* Sightline Safety Academy — typed API client.
 * This file is the frontend's copy of SPEC-004 (normative). Every response
 * shape in the contract has a hand-written type here; the fetch wrapper parses
 * the shared error envelope into ApiError. camelCase over the wire.
 */

// ---------------------------------------------------------------------------
// Error envelope
// ---------------------------------------------------------------------------

export interface ApiErrorEnvelope {
  error: { code: string; message: string; incidentId?: string };
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly incidentId?: string;

  constructor(code: string, message: string, status: number, incidentId?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.incidentId = incidentId;
  }
}

// ---------------------------------------------------------------------------
// Shared enums / small shapes
// ---------------------------------------------------------------------------

export type Role = "learner" | "instructor";
export type SectionId =
  | "briefing"
  | "learn"
  | "try"
  | "debrief"
  | "journal"
  | "checkpoint";
export type RendererType =
  | "content"
  | "prediction_reveal"
  | "multiple_choice"
  | "sort_categorize"
  | "match"
  | "hotspot_list"
  | "branching_decision"
  | "structured_response"
  | "journal_builder"
  | "reflection"
  | "lab_objective"
  | "checkpoint";
export type Grounding = "curriculum" | "mixed" | "general";
export type ArtifactType =
  | "risk_profile"
  | "inspection_log"
  | "gear_card"
  | "hazard_brief"
  | "readiness_plan"
  | "ride_plan";
export type ArtifactStatus = "draft" | "complete";

// ---------------------------------------------------------------------------
// Auth (SPEC-004 §Auth)
// ---------------------------------------------------------------------------

export interface UserOut {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  createdAt: string;
  xpTotal: number;
  level: number;
}

export interface LearnerStateOut {
  lastLessonId: string | null;
  lastStepId: string | null;
}

export interface MeResponse {
  user: UserOut;
  state: LearnerStateOut;
}

export interface AuthResponse {
  user: UserOut;
}

// ---------------------------------------------------------------------------
// Course (SPEC-004 §Course)
// ---------------------------------------------------------------------------

export interface CourseMetaOut {
  id: string;
  title: string;
  tagline: string;
  version: string;
  moduleOrder: string[];
}

export interface ModuleOut {
  id: string;
  order: number;
  title: string;
  tagline: string;
  mission: string;
  estimatedMinutes: number;
  objectives: string[];
  badgeId: string;
  heroSlot: string;
  percent: number;
  complete: boolean;
  locked: boolean;
}

export interface CourseResponse {
  course: CourseMetaOut;
  modules: ModuleOut[];
}

export interface LessonSummary {
  id: string;
  moduleId: string;
  order: number;
  title: string;
  summary: string;
  estimatedMinutes: number;
  sectionsPresent: SectionId[];
  percent: number;
  complete: boolean;
}

export interface ModuleResponse {
  module: ModuleOut;
  lessons: LessonSummary[];
}

export interface StepOut {
  id: string;
  order: number;
  section: SectionId;
  renderer: RendererType;
  title: string;
  minutes: number;
  required: boolean;
  /** Renderer contract data, passed to the activity component verbatim (SPEC-007). */
  payload: unknown;
}

export interface EvidenceOut {
  stepId: string;
  kind: string;
  value: unknown;
  complete: boolean;
  firstAttemptCorrect: boolean | null;
  updatedAt: string;
}

export interface LessonResponse {
  lesson: LessonSummary;
  steps: StepOut[];
  evidence: Record<string, EvidenceOut>;
}

// ---------------------------------------------------------------------------
// Progress, XP, badges, assessment, certificate (SPEC-004 §Progress)
// ---------------------------------------------------------------------------

export interface XpEvent {
  id: string;
  event: string;
  xp: number;
  label: string;
  createdAt: string;
}

export interface Badge {
  id: string;
  name: string;
  awardedAt: string | null;
}

export interface EvidencePutRequest {
  kind: string;
  value: unknown;
  complete: boolean;
}

export interface EvidencePutResponse {
  evidence: EvidenceOut;
  lessonComplete?: boolean;
  moduleComplete?: boolean;
  xpAwarded: XpEvent[];
  badgesAwarded: Badge[];
}

export interface ModuleProgressRollup {
  moduleId: string;
  title: string;
  percent: number;
  complete: boolean;
  lessonsCompleted: number;
  lessonsTotal: number;
}

export interface ProgressResponse {
  modules: ModuleProgressRollup[];
  xpTotal: number;
  level: number;
  /** 0..1 progress toward the next level threshold. */
  levelProgress: number;
  badges: Badge[];
  recentXp: XpEvent[];
}

export interface AssessmentSubmitRequest {
  answers: Record<string, string>;
}

export interface AssessmentResult {
  scorePct: number;
  passed: boolean;
  perQuestion: { questionId: string; correct: boolean; feedback: string }[];
  certificateCode?: string;
}

export interface CertificateOut {
  code: string;
  issuedAt: string;
  nameOnCert: string;
}

export interface VerifyResponse {
  valid: boolean;
  nameOnCert?: string;
  issuedAt?: string;
  courseTitle?: string;
}

// ---------------------------------------------------------------------------
// Journal (SPEC-004 §Journal)
// ---------------------------------------------------------------------------

export interface ArtifactOut {
  artifactType: ArtifactType;
  title: string;
  fields: Record<string, unknown>;
  status: ArtifactStatus;
  moduleId: string;
  updatedAt: string;
}

export interface JournalResponse {
  artifacts: ArtifactOut[];
}

export interface ArtifactPutRequest {
  title?: string;
  fields: Record<string, unknown>;
  status: ArtifactStatus;
}

// ---------------------------------------------------------------------------
// Tutor (SPEC-004 §Tutor)
// ---------------------------------------------------------------------------

export interface SourceRef {
  chunkId: string;
  title: string;
  moduleRef: string;
}

export interface TutorAskResponse {
  id: string;
  answerMarkdown: string;
  grounding: Grounding;
  sources: SourceRef[];
  suggestions: string[];
  triage?: { category: string };
}

export interface TutorMessageOut {
  id: string;
  role: "user" | "assistant";
  content: string;
  grounding: Grounding | null;
  sources: string[];
  /** Chip-ready refs resolved server-side at read time (stored rows carry only chunk ids). */
  sourceRefs: SourceRef[];
  triageCategory: string | null;
  createdAt: string;
}

export interface TutorHistoryResponse {
  messages: TutorMessageOut[];
}

export interface TutorSuggestedResponse {
  prompts: string[];
}

// ---------------------------------------------------------------------------
// Meta & instructor (SPEC-004 §Meta, §Instructor)
// ---------------------------------------------------------------------------

export interface HealthResponse {
  status: string;
  db: string;
  chroma: { docs: number };
  provider: "anthropic" | "extractive";
  version: string;
}

export interface InstructorOverview {
  learners: number;
  activeLast7d: number;
  moduleFunnel: { moduleId: string; started: number; completed: number }[];
  knowledgeCheckStats: {
    stepId: string;
    prompt: string;
    firstAttemptCorrectPct: number;
    commonWrong: { optionId: string; text: string; pct: number }[];
  }[];
  tutorThemes: { topic: string; count: number }[];
}

// ---------------------------------------------------------------------------
// Fetch wrapper
// ---------------------------------------------------------------------------

const BASE = "/api";

async function request<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: init.method ?? "GET",
      credentials: "include",
      headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError("network", "Could not reach Sightline Safety Academy.", 0);
  }

  if (!res.ok) {
    let envelope: ApiErrorEnvelope | null = null;
    try {
      envelope = (await res.json()) as ApiErrorEnvelope;
    } catch {
      envelope = null;
    }
    const code = envelope?.error?.code ?? "unexpected";
    const message = envelope?.error?.message ?? "Something went wrong on our side.";
    throw new ApiError(code, message, res.status, envelope?.error?.incidentId);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Endpoint methods — one per row of SPEC-004
// ---------------------------------------------------------------------------

export const api = {
  // Auth
  register: (body: { email: string; password: string; displayName: string }) =>
    request<AuthResponse>("/auth/register", { method: "POST", body }),
  login: (body: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", { method: "POST", body }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  me: () => request<MeResponse>("/auth/me"),
  updateMe: (body: { displayName?: string }) =>
    request<AuthResponse>("/auth/me", { method: "PATCH", body }),
  changePassword: (body: { current: string; next: string }) =>
    request<void>("/auth/password", { method: "POST", body }),
  /** Raw URL for the data-export download link (browser handles the stream). */
  exportUrl: `${BASE}/auth/export`,
  deleteAccount: (body: { confirmEmail: string }) =>
    request<void>("/auth/me", { method: "DELETE", body }),

  // Course
  course: () => request<CourseResponse>("/course"),
  module: (moduleId: string) => request<ModuleResponse>(`/modules/${moduleId}`),
  lesson: (lessonId: string) => request<LessonResponse>(`/lessons/${lessonId}`),

  // Progress
  putEvidence: (stepId: string, body: EvidencePutRequest) =>
    request<EvidencePutResponse>(`/steps/${stepId}/evidence`, { method: "PUT", body }),
  progress: () => request<ProgressResponse>("/progress"),
  submitAssessment: (body: AssessmentSubmitRequest) =>
    request<AssessmentResult>("/assessment/final", { method: "POST", body }),
  certificate: () => request<CertificateOut>("/certificate"),
  verify: (code: string) => request<VerifyResponse>(`/verify/${encodeURIComponent(code)}`),

  // Journal
  journal: () => request<JournalResponse>("/journal"),
  putArtifact: (artifactType: ArtifactType, body: ArtifactPutRequest) =>
    request<{ artifact: ArtifactOut }>(`/journal/${artifactType}`, { method: "PUT", body }),

  // Tutor
  tutorAsk: (body: { message: string; lessonId?: string }) =>
    request<TutorAskResponse>("/tutor/ask", { method: "POST", body }),
  tutorHistory: () => request<TutorHistoryResponse>("/tutor/history"),
  clearTutorHistory: () => request<void>("/tutor/history", { method: "DELETE" }),
  tutorSuggested: () => request<TutorSuggestedResponse>("/tutor/suggested"),

  // Meta
  health: () => request<HealthResponse>("/meta/health"),

  // Instructor
  instructorOverview: () => request<InstructorOverview>("/instructor/overview"),
  /** Raw URL for the CSV export download link. */
  instructorExportUrl: `${BASE}/instructor/export.csv`,
};
