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
    # SPEC-011: 'learner' | 'developer' | 'instructor' | 'admin' | 'owner'
    role: Mapped[str] = mapped_column(String, default="learner")
    # Access to revenue data and payout configuration. Deliberately a separate
    # column from `role` rather than implied by it: the requirement is that
    # exactly ONE account holds it, which a role cannot express (roles are
    # many-to-one) and which must survive adding more admins later.
    can_access_funds: Mapped[bool] = mapped_column(Boolean, default=False)
    # Who provisioned this account, when it was made through the admin API.
    created_by_user_id: Mapped[str | None] = mapped_column(String, nullable=True)
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
    # Authored final-assessment bank (final-assessment.md); smallest home for
    # a single authored payload — no separate table for one row.
    assessment_bank: Mapped[dict | None] = mapped_column(JSON, nullable=True)


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
    # Dedupe key ("step:m1-l1-s1", "lesson:m1-l1-...") so every rule fires once
    # per subject no matter how often the client retries (SPEC-002 idempotency).
    ref: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
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


class TutorUsage(Base):
    """One row per tutor question, for per-user quota accounting.

    The Anthropic key is personal and metered, so an unbounded tutor endpoint
    is a spend risk, not merely a load one. Counting in the database rather
    than in process memory means the quota survives a restart and holds across
    replicas — an in-memory counter would reset every deploy.
    """

    __tablename__ = "tutor_usage"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # uuid
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    created_at: Mapped[str] = mapped_column(String, default=utc_now_iso, index=True)
    provider: Mapped[str] = mapped_column(String)  # 'anthropic' | 'extractive'


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


# ── Billing & entitlement (SPEC-012) ─────────────────────────────────────────


class Entitlement(Base):
    """Whether a learner may open the course, and why.

    One row per user. `source` records how access was granted so that a comped
    account is distinguishable from a paying one during a refund dispute, and
    so revoking a subscription never silently strips a staff account.
    """

    __tablename__ = "entitlements"

    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), primary_key=True)
    # 'active' | 'past_due' | 'canceled' | 'none'
    status: Mapped[str] = mapped_column(String, default="none", index=True)
    # 'stripe' | 'role' | 'comp'
    source: Mapped[str] = mapped_column(String, default="none")
    stripe_customer_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    # ISO-8601. Access is honoured through the end of a paid period even after
    # the learner cancels — cancelling should stop the next charge, not confiscate
    # the month already bought.
    current_period_end: Mapped[str | None] = mapped_column(String, nullable=True)
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False)
    price_id: Mapped[str | None] = mapped_column(String, nullable=True)
    note: Mapped[str | None] = mapped_column(String, nullable=True)  # why, for comps
    updated_at: Mapped[str] = mapped_column(String, default=utc_now_iso)


class ProcessedWebhook(Base):
    """Stripe event ids already applied, for idempotency.

    Stripe retries deliveries and does not promise exactly-once. Replaying a
    `subscription.deleted` after a fresh `subscription.created` would revoke a
    live subscription, so every event is applied at most once.
    """

    __tablename__ = "processed_webhooks"

    event_id: Mapped[str] = mapped_column(String, primary_key=True)
    event_type: Mapped[str] = mapped_column(String)
    received_at: Mapped[str] = mapped_column(String, default=utc_now_iso)


# ── Accountability ───────────────────────────────────────────────────────────


class AuditLog(Base):
    """Append-only record of privileged actions (the 'I' in the CIA triad).

    Role grants, funds-access grants, comps and account creation all land here.
    Without this, "only Osama can grant funds access" is an assertion; with it,
    it is checkable after the fact.
    """

    __tablename__ = "audit_log"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # uuid
    actor_user_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    actor_email: Mapped[str | None] = mapped_column(String, nullable=True)
    action: Mapped[str] = mapped_column(String, index=True)
    target_user_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    detail: Mapped[dict] = mapped_column(JSON, default=dict)
    ip: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[str] = mapped_column(String, default=utc_now_iso, index=True)


class LoginAttempt(Base):
    """Per-account failed-login counter.

    The per-IP limiter is defeated by anyone who can vary X-Forwarded-For, so
    it cannot be the only brute-force control. This one is keyed on the account
    being attacked, which the attacker cannot rotate: they must guess *this*
    account's password, so the counter always finds them.
    """

    __tablename__ = "login_attempts"

    email: Mapped[str] = mapped_column(String, primary_key=True)  # lowercased
    failures: Mapped[int] = mapped_column(Integer, default=0)
    first_failure_at: Mapped[str] = mapped_column(String, default=utc_now_iso)
    locked_until: Mapped[str | None] = mapped_column(String, nullable=True)
