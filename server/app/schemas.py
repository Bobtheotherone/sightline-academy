"""Pydantic v2 request/response models for the full SPEC-004 API contract.

Field casing: snake_case in Python, camelCase over the wire (alias generator).
Errors always use the envelope {"error": {"code", "message"}}.
"""

import re
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator
from pydantic.alias_generators import to_camel

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class ApiModel(BaseModel):
    """Base for every wire model: camelCase aliases both directions."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


# ── Error envelope ───────────────────────────────────────────────────────────


class ErrorDetail(ApiModel):
    code: str
    message: str


class ErrorEnvelope(ApiModel):
    error: ErrorDetail


# ── Auth (SPEC-004 §Auth, SPEC-005) ──────────────────────────────────────────


class RegisterIn(ApiModel):
    email: str
    password: str
    display_name: str

    @field_validator("email")
    @classmethod
    def _email_valid(cls, v: str) -> str:
        v = v.strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("Enter a valid email address.")
        return v

    @field_validator("password")
    @classmethod
    def _password_length(cls, v: str) -> str:
        if len(v) < 10:
            raise ValueError("Password must be at least 10 characters.")
        return v

    @field_validator("display_name")
    @classmethod
    def _display_name_length(cls, v: str) -> str:
        v = v.strip()
        if not (2 <= len(v) <= 40):
            raise ValueError("Display name must be 2 to 40 characters.")
        return v


class LoginIn(ApiModel):
    email: str
    password: str


class UserOut(ApiModel):
    id: str
    email: str
    display_name: str
    role: str
    created_at: str
    xp_total: int
    level: int


class AuthUserOut(ApiModel):
    user: UserOut


class MeState(ApiModel):
    last_lesson_id: str | None = None
    last_step_id: str | None = None


class MeOut(ApiModel):
    user: UserOut
    state: MeState


class UpdateMeIn(ApiModel):
    display_name: str | None = None

    @field_validator("display_name")
    @classmethod
    def _display_name_length(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not (2 <= len(v) <= 40):
            raise ValueError("Display name must be 2 to 40 characters.")
        return v


class PasswordChangeIn(ApiModel):
    current: str
    next: str

    @field_validator("next")
    @classmethod
    def _next_length(cls, v: str) -> str:
        if len(v) < 10:
            raise ValueError("New password must be at least 10 characters.")
        return v


class DeleteMeIn(ApiModel):
    confirm_email: str


# ── Course (SPEC-004 §Course) ────────────────────────────────────────────────


class CourseMetaOut(ApiModel):
    id: str
    title: str
    tagline: str
    version: str
    module_order: list[str]


class ModuleProgress(ApiModel):
    percent: int
    complete: bool
    locked: bool


class ModuleOut(ApiModel):
    id: str
    order: int
    title: str
    tagline: str
    mission: str
    estimated_minutes: int
    objectives: list[str]
    badge_id: str
    hero_slot: str
    progress: ModuleProgress


class CourseOut(ApiModel):
    course: CourseMetaOut
    modules: list[ModuleOut]


class LessonProgress(ApiModel):
    percent: int
    complete: bool


class LessonSummary(ApiModel):
    id: str
    module_id: str
    order: int
    title: str
    summary: str
    estimated_minutes: int
    sections_present: list[str]
    progress: LessonProgress


class ModuleDetailOut(ApiModel):
    module: ModuleOut
    lessons: list[LessonSummary]


class StepOut(ApiModel):
    id: str
    order: int
    section: str
    renderer: str
    title: str
    minutes: int
    required: bool
    payload: dict[str, Any]


class EvidenceOut(ApiModel):
    step_id: str
    kind: str
    value: dict[str, Any]
    complete: bool
    first_attempt_correct: bool | None = None
    updated_at: str


class LessonDetailOut(ApiModel):
    lesson: LessonSummary
    steps: list[StepOut]
    evidence: dict[str, EvidenceOut]


# ── Progress (SPEC-004 §Progress) ────────────────────────────────────────────


class EvidencePutIn(ApiModel):
    kind: str
    value: dict[str, Any]
    complete: bool


class XpEventOut(ApiModel):
    id: str
    event: str
    xp: int
    label: str
    created_at: str


class BadgeOut(ApiModel):
    badge_id: str
    created_at: str


class EvidencePutOut(ApiModel):
    evidence: EvidenceOut
    lesson_complete: bool | None = None
    module_complete: bool | None = None
    xp_awarded: list[XpEventOut] = []
    badges_awarded: list[BadgeOut] = []


class ModuleRollup(ApiModel):
    module_id: str
    percent: int
    complete: bool
    lessons_completed: int
    lessons_total: int


class ProgressOut(ApiModel):
    modules: list[ModuleRollup]
    xp_total: int
    level: int
    level_progress: float
    badges: list[BadgeOut]
    recent_xp: list[XpEventOut]


class FinalAssessmentIn(ApiModel):
    answers: dict[str, str]  # questionId -> optionId


class PerQuestionResult(ApiModel):
    question_id: str
    correct: bool
    feedback: str


class FinalAssessmentOut(ApiModel):
    score_pct: float
    passed: bool
    per_question: list[PerQuestionResult]
    certificate_code: str | None = None


class CertificateOut(ApiModel):
    code: str
    issued_at: str
    name_on_cert: str


class VerifyOut(ApiModel):
    valid: bool
    name_on_cert: str | None = None
    issued_at: str | None = None
    course_title: str | None = None


# ── Journal (SPEC-004 §Journal) ──────────────────────────────────────────────


class ArtifactOut(ApiModel):
    artifact_type: str
    title: str
    fields: dict[str, Any]
    status: str
    module_id: str
    updated_at: str


class JournalOut(ApiModel):
    artifacts: list[ArtifactOut]


class JournalPutIn(ApiModel):
    title: str | None = None
    fields: dict[str, Any]
    status: str


class JournalPutOut(ApiModel):
    artifact: ArtifactOut


# ── Tutor (SPEC-004 §Tutor) ──────────────────────────────────────────────────


class TutorAskIn(ApiModel):
    message: str
    lesson_id: str | None = None


class TutorSource(ApiModel):
    chunk_id: str
    title: str
    module_ref: str


class TutorTriage(ApiModel):
    category: str


class TutorAskOut(ApiModel):
    id: str
    answer_markdown: str
    grounding: str
    sources: list[TutorSource]
    suggestions: list[str]
    triage: TutorTriage | None = None


class TutorMessageOut(ApiModel):
    id: str
    role: str
    content: str
    grounding: str
    sources: list[str]
    triage_category: str | None = None
    created_at: str


class TutorHistoryOut(ApiModel):
    messages: list[TutorMessageOut]


class TutorSuggestedOut(ApiModel):
    prompts: list[str]


# ── Meta (SPEC-004 §Meta) ────────────────────────────────────────────────────


class ChromaHealth(ApiModel):
    docs: int


class HealthOut(ApiModel):
    status: str
    db: str
    chroma: ChromaHealth
    provider: str
    version: str


# ── Instructor (SPEC-004 §Instructor) ────────────────────────────────────────


class ModuleFunnelRow(ApiModel):
    module_id: str
    started: int
    completed: int


class CommonWrongOption(ApiModel):
    option_id: str
    text: str
    pct: float


class KnowledgeCheckStat(ApiModel):
    step_id: str
    prompt: str
    first_attempt_correct_pct: float
    common_wrong: list[CommonWrongOption]


class TutorTheme(ApiModel):
    topic: str
    count: int


class InstructorOverviewOut(ApiModel):
    learners: int
    active_last7d: int
    module_funnel: list[ModuleFunnelRow]
    knowledge_check_stats: list[KnowledgeCheckStat]
    tutor_themes: list[TutorTheme]
