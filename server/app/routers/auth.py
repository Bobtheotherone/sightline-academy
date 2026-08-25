"""Auth & account routes — the full SPEC-004 auth table (SPEC-005 behavior)."""

import json
import logging
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import auth as auth_svc
from ..config import get_settings
from ..db import get_db
from ..errors import ApiError
from ..models import (
    AssessmentAttempt,
    BadgeAward,
    Certificate,
    Entitlement,
    JournalArtifact,
    LearnerState,
    LessonCompletion,
    LoginAttempt,
    ModuleCompletion,
    SessionRow,
    StepEvidence,
    TutorMessage,
    TutorUsage,
    User,
    XpEvent,
    utc_now_iso,
)
from ..schemas import (
    AuthUserOut,
    DeleteMeIn,
    LoginIn,
    MeOut,
    PasswordChangeIn,
    RegisterIn,
    UpdateMeIn,
)
from ..services import audit as audit_svc
from ..services import roles as roles_svc

logger = logging.getLogger("sightline.auth")

router = APIRouter(prefix="/auth", tags=["auth"])


def _role_for(email: str) -> str:
    """Role granted by self-registration, from the configured email allowlists.

    Self-registration trusts an unverified address, so it can only ever hand
    out a role the operator has already written into configuration. Anything
    not on a list is a learner.
    """
    settings = get_settings()
    return roles_svc.role_from_email(
        email,
        owner_email=settings.owner_email_normalised,
        admin_emails=settings.admin_email_set,
        instructor_emails=settings.instructor_email_set,
        developer_emails=settings.developer_email_set,
    )


def _is_configured_owner(email: str) -> bool:
    owner = get_settings().owner_email_normalised
    return bool(owner) and email.strip().lower() == owner


@router.post("/register", response_model=AuthUserOut, status_code=201)
def register(
    body: RegisterIn, request: Request, response: Response, db: Session = Depends(get_db)
) -> AuthUserOut:
    ip = auth_svc.client_ip(request)
    auth_svc.auth_rate_limiter.check(ip)

    email = body.email  # already validated + lowercased by the schema
    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing is not None:
        auth_svc.auth_rate_limiter.record_failure(ip)
        raise ApiError(
            409, "email_taken", "That email already has an account. Log in instead?"
        )

    now = utc_now_iso()
    role = _role_for(email)
    user = User(
        id=str(uuid.uuid4()),
        email=email,
        display_name=body.display_name,
        password_hash=auth_svc.hash_password(body.password),
        role=role,
        # The single account permitted to see revenue. Bootstrapped here from
        # OWNER_EMAIL because at first run there is nobody to grant it; from
        # then on it can only be conferred by an account that already holds it.
        can_access_funds=_is_configured_owner(email),
        created_at=now,
        last_login_at=now,
    )
    db.add(user)
    db.commit()
    if role != roles_svc.ROLE_LEARNER:
        audit_svc.record(
            db,
            action=audit_svc.ACCOUNT_CREATED,
            actor=None,
            target_user_id=user.id,
            detail={"role": role, "via": "self-registration allowlist"},
            ip=ip,
        )

    token = auth_svc.create_session(db, user.id)
    auth_svc.set_session_cookie(response, token)
    return AuthUserOut.model_validate({"user": auth_svc.user_out_payload(db, user)})


@router.post("/login", response_model=AuthUserOut)
def login(
    body: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)
) -> AuthUserOut:
    ip = auth_svc.client_ip(request)
    auth_svc.auth_rate_limiter.check(ip)

    email = body.email.strip().lower()
    # Per-account lockout, checked before the password is even compared. The
    # per-IP bucket above can be diluted by anyone with many source addresses;
    # this one is keyed on the account under attack, which cannot be rotated.
    auth_svc.check_account_lock(db, email)

    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if user is None or not auth_svc.verify_password(user.password_hash, body.password):
        auth_svc.auth_rate_limiter.record_failure(ip)
        auth_svc.record_account_failure(db, email)
        raise ApiError(
            401, "invalid_credentials", "That email and password don't match our records."
        )

    auth_svc.auth_rate_limiter.reset(ip)
    auth_svc.clear_account_failures(db, email)

    if auth_svc.needs_rehash(user.password_hash):
        user.password_hash = auth_svc.hash_password(body.password)
    # Promote an existing learner if their address was added to an allowlist
    # after they signed up. Only ever upgrades from `learner`, so an admin who
    # was deliberately demoted is not silently restored on next login.
    if user.role == roles_svc.ROLE_LEARNER:
        user.role = _role_for(email)
    if _is_configured_owner(email) and not user.can_access_funds:
        user.can_access_funds = True
        audit_svc.record(
            db,
            action=audit_svc.ACCOUNT_FUNDS_GRANTED,
            actor=None,
            target_user_id=user.id,
            detail={"via": "OWNER_EMAIL bootstrap"},
            ip=ip,
            commit=False,
        )
    user.last_login_at = utc_now_iso()
    db.commit()

    token = auth_svc.create_session(db, user.id)
    auth_svc.set_session_cookie(response, token)
    return AuthUserOut.model_validate({"user": auth_svc.user_out_payload(db, user)})


@router.post("/logout", status_code=204)
def logout(
    auth: tuple[User, SessionRow] = Depends(auth_svc.current_session),
    db: Session = Depends(get_db),
) -> Response:
    _, session_row = auth
    db.delete(session_row)
    db.commit()
    response = Response(status_code=204)
    auth_svc.clear_session_cookie(response)
    return response


@router.get("/me", response_model=MeOut)
def me(user: User = Depends(auth_svc.current_user), db: Session = Depends(get_db)) -> MeOut:
    state = db.get(LearnerState, user.id)
    return MeOut.model_validate(
        {
            "user": auth_svc.user_out_payload(db, user),
            "state": {
                "last_lesson_id": state.last_lesson_id if state else None,
                "last_step_id": state.last_step_id if state else None,
            },
        }
    )


@router.patch("/me", response_model=AuthUserOut)
def update_me(
    body: UpdateMeIn,
    user: User = Depends(auth_svc.current_user),
    db: Session = Depends(get_db),
) -> AuthUserOut:
    if body.display_name is not None:
        user.display_name = body.display_name
        db.commit()
    return AuthUserOut.model_validate({"user": auth_svc.user_out_payload(db, user)})


@router.post("/password", status_code=204)
def change_password(
    body: PasswordChangeIn,
    auth: tuple[User, SessionRow] = Depends(auth_svc.current_session),
    db: Session = Depends(get_db),
) -> Response:
    user, session_row = auth
    if not auth_svc.verify_password(user.password_hash, body.current):
        raise ApiError(400, "wrong_password", "Your current password didn't match.")
    user.password_hash = auth_svc.hash_password(body.next)
    # Revoke every other session (SPEC-005 §Sessions).
    for row in db.execute(select(SessionRow).where(SessionRow.user_id == user.id)).scalars():
        if row.token_hash != session_row.token_hash:
            db.delete(row)
    db.commit()
    return Response(status_code=204)


_EXPORT_TABLES = [
    ("step_evidence", StepEvidence),
    ("lesson_completions", LessonCompletion),
    ("module_completions", ModuleCompletion),
    ("learner_state", LearnerState),
    ("xp_events", XpEvent),
    ("badge_awards", BadgeAward),
    ("journal_artifacts", JournalArtifact),
    ("assessment_attempts", AssessmentAttempt),
    ("certificates", Certificate),
    ("tutor_messages", TutorMessage),
    ("tutor_usage", TutorUsage),
]

#: Deleted with the account but deliberately NOT included in the data export:
#: the entitlement row is billing metadata (Stripe ids), not learner content,
#: and echoing customer ids into a user-downloadable file widens the blast
#: radius of a stolen export for no benefit to the person requesting it.
_DELETE_ONLY_TABLES = [Entitlement]


def _row_dict(row: object) -> dict:
    return {c.key: getattr(row, c.key) for c in row.__mapper__.column_attrs}  # type: ignore[attr-defined]


@router.get("/export")
def export_data(
    user: User = Depends(auth_svc.current_user), db: Session = Depends(get_db)
) -> Response:
    profile = _row_dict(user)
    profile.pop("password_hash", None)  # never return hashes (ADR-003)
    dump: dict = {
        "exported_at": utc_now_iso(),
        "user": profile,
    }
    for name, model in _EXPORT_TABLES:
        rows = db.execute(select(model).where(model.user_id == user.id)).scalars().all()
        dump[name] = [_row_dict(r) for r in rows]
    filename = f"sightline-export-{datetime.now(UTC).date().isoformat()}.json"
    return Response(
        content=json.dumps(dump, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/me", status_code=204)
def delete_me(
    body: DeleteMeIn,
    user: User = Depends(auth_svc.current_user),
    db: Session = Depends(get_db),
) -> Response:
    if body.confirm_email.strip().lower() != user.email:
        raise ApiError(
            400, "confirm_mismatch", "That doesn't match the email on this account."
        )
    # Delete order is explicit, and deliberately not left to the ORM.
    #
    # These models declare ForeignKey *columns* but no `relationship()`, so the
    # unit of work has no dependency graph to sort deletes by and could emit
    # `DELETE FROM users` before the rows still pointing at it. SQLite enforces
    # the constraint (PRAGMA foreign_keys=ON), so the statement failed, the
    # whole transaction rolled back, and the caller got a 500 with every row
    # still in place — an account that could never be deleted, reporting an
    # error that made it sound like a passing glitch.
    #
    # Issuing the child deletes as explicit statements and flushing them before
    # the parent removes the ambiguity: the order is the one written here.
    for _, model in _EXPORT_TABLES:
        db.execute(sa_delete(model).where(model.user_id == user.id))
    for model in _DELETE_ONLY_TABLES:
        db.execute(sa_delete(model).where(model.user_id == user.id))
    db.execute(sa_delete(SessionRow).where(SessionRow.user_id == user.id))
    # Keyed on email rather than user id, so it has no foreign key — but it
    # still has to go, or a lockout would outlive the account and follow the
    # next person who registers that address.
    db.execute(sa_delete(LoginAttempt).where(LoginAttempt.email == user.email))
    db.flush()  # children are gone from the database before the parent is tried

    if user.can_access_funds:
        # Recoverable (ops/bootstrap_accounts.py re-creates the owner from
        # OWNER_EMAIL), but worth a loud line in the log: for a moment nobody
        # can see revenue or grant that privilege to anyone else.
        logger.warning(
            "the funds-access account %s deleted itself; re-run "
            "ops/bootstrap_accounts.py to restore an owner",
            user.email,
        )

    db.delete(user)
    db.commit()
    response = Response(status_code=204)
    auth_svc.clear_session_cookie(response)
    return response
