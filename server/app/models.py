"""SQLAlchemy models — every table from SPEC-003.

Real columns for identity/relations/query fields; JSON columns for authored
payloads the frontend consumes as-is. All timestamps are UTC ISO-8601 strings.
"""

from datetime import UTC, datetime

from sqlalchemy import JSON, Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat()


# ── Identity & auth ──────────────────────────────────────────────────────────


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # uuid
    email: Mapped[str] = mapped_column(String, unique=True, index=True)  # lowercased
    display_name: Mapped[str] = mapped_column(String)
    password_hash: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String, default="learner")  # 'learner' | 'instructor'
    created_at: Mapped[str] = mapped_column(String, default=utc_now_iso)
    last_login_at: Mapped[str | None] = mapped_column(String, nullable=True)


class SessionRow(Base):
    __tablename__ = "sessions"

    token_hash: Mapped[str] = mapped_column(String, primary_key=True)  # sha256 of token
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    created_at: Mapped[str] = mapped_column(String, default=utc_now_iso)
    expires_at: Mapped[str] = mapped_column(String)
    last_seen_at: Mapped[str] = mapped_column(String, default=utc_now_iso)


# ── Course content (seeded from content/curriculum/) ─────────────────────────


class CourseMeta(Base):
    __tablename__ = "course_meta"

    id: Mapped[str] = mapped_column(String, primary_key=True, default="course")
    title: Mapped[str] = mapped_column(String)
    tagline: Mapped[str] = mapped_column(String)
    version: Mapped[str] = mapped_column(String)  # content hash
    module_order: Mapped[list] = mapped_column(JSON)  # list of module ids


class Module(Base):
    __tablename__ = "modules"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # slug
    order: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String)
    tagline: Mapped[str] = mapped_column(String)
    mission: Mapped[str] = mapped_column(String)
    estimated_minutes: Mapped[int] = mapped_column(Integer)
    objectives: Mapped[list] = mapped_column(JSON)
    badge_id: Mapped[str] = mapped_column(String)
    hero_slot: Mapped[str] = mapped_column(String)  # illustration slot name


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # slug
    module_id: Mapped[str] = mapped_column(String, ForeignKey("modules.id"), index=True)
    order: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String)
    summary: Mapped[str] = mapped_column(String)
    estimated_minutes: Mapped[int] = mapped_column(Integer)
    sections_present: Mapped[list] = mapped_column(JSON)  # list of section ids


class Step(Base):
    __tablename__ = "steps"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # slug
    lesson_id: Mapped[str] = mapped_column(String, ForeignKey("lessons.id"), index=True)
    order: Mapped[int] = mapped_column(Integer)
    section: Mapped[str] = mapped_column(String)  # briefing|learn|try|debrief|journal|checkpoint
    renderer: Mapped[str] = mapped_column(String)  # SPEC-007 type
    title: Mapped[str] = mapped_column(String)
    minutes: Mapped[int] = mapped_column(Integer)
    required: Mapped[bool] = mapped_column(Boolean, default=True)
    payload: Mapped[dict] = mapped_column(JSON)  # full renderer contract data


# ── Learner progress ─────────────────────────────────────────────────────────


class StepEvidence(Base):
    __tablename__ = "step_evidence"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # user_id::step_id
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    step_id: Mapped[str] = mapped_column(String, index=True)
    lesson_id: Mapped[str] = mapped_column(String, index=True)
    module_id: Mapped[str] = mapped_column(String, index=True)
    kind: Mapped[str] = mapped_column(String)
    value: Mapped[dict] = mapped_column(JSON)
    complete: Mapped[bool] = mapped_column(Boolean, default=False)
    first_attempt_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    updated_at: Mapped[str] = mapped_column(String, default=utc_now_iso)


class LessonCompletion(Base):
    __tablename__ = "lesson_completions"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # user_id::lesson_id
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    lesson_id: Mapped[str] = mapped_column(String, index=True)
    module_id: Mapped[str] = mapped_column(String, index=True)
    completed_at: Mapped[str] = mapped_column(String, default=utc_now_iso)


class ModuleCompletion(Base):
    __tablename__ = "module_completions"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # user_id::module_id
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    module_id: Mapped[str] = mapped_column(String, index=True)
    completed_at: Mapped[str] = mapped_column(String, default=utc_now_iso)


class LearnerState(Base):
    __tablename__ = "learner_state"

    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), primary_key=True)
    last_lesson_id: Mapped[str | None] = mapped_column(String, nullable=True)
    last_step_id: Mapped[str | None] = mapped_column(String, nullable=True)
    updated_at: Mapped[str] = mapped_column(String, default=utc_now_iso)


class XpEvent(Base):
    __tablename__ = "xp_events"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # uuid
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    event: Mapped[str] = mapped_column(String)  # rule name
    xp: Mapped[int] = mapped_column(Integer)
    label: Mapped[str] = mapped_column(String)
    created_at: Mapped[str] = mapped_column(String, default=utc_now_iso)


class BadgeAward(Base):
    __tablename__ = "badge_awards"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # user_id::badge_id
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    badge_id: Mapped[str] = mapped_column(String, index=True)
    created_at: Mapped[str] = mapped_column(String, default=utc_now_iso)


class JournalArtifact(Base):
    __tablename__ = "journal_artifacts"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # user_id::artifact_type
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    artifact_type: Mapped[str] = mapped_column(String)
    title: Mapped[str] = mapped_column(String)
    fields: Mapped[dict] = mapped_column(JSON)  # field map
    status: Mapped[str] = mapped_column(String, default="draft")  # 'draft' | 'complete'
    module_id: Mapped[str] = mapped_column(String)
    updated_at: Mapped[str] = mapped_column(String, default=utc_now_iso)


class AssessmentAttempt(Base):
    __tablename__ = "assessment_attempts"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # uuid
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    kind: Mapped[str] = mapped_column(String, default="final")
    score_pct: Mapped[float] = mapped_column(Float)
    passed: Mapped[bool] = mapped_column(Boolean)
    answers: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[str] = mapped_column(String, default=utc_now_iso)


class Certificate(Base):
    __tablename__ = "certificates"

    code: Mapped[str] = mapped_column(String, primary_key=True)  # 10-char base32
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    issued_at: Mapped[str] = mapped_column(String, default=utc_now_iso)
    name_on_cert: Mapped[str] = mapped_column(String)


# ── Tutor ────────────────────────────────────────────────────────────────────


class TutorMessage(Base):
    __tablename__ = "tutor_messages"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # uuid
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    role: Mapped[str] = mapped_column(String)  # 'user' | 'assistant'
    content: Mapped[str] = mapped_column(Text)  # markdown
    grounding: Mapped[str] = mapped_column(String)
    sources: Mapped[list] = mapped_column(JSON)  # list of chunk ids
    triage_category: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[str] = mapped_column(String, default=utc_now_iso)
