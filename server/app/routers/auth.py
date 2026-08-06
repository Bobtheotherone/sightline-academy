"""Auth & account routes — the full SPEC-004 auth table (SPEC-005 behavior)."""

import json
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request, Response
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
    JournalArtifact,
    LearnerState,
    LessonCompletion,
    ModuleCompletion,
    SessionRow,
    StepEvidence,
    TutorMessage,
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

router = APIRouter(prefix="/auth", tags=["auth"])


def _role_for(email: str) -> str:
    return "instructor" if email in get_settings().instructor_email_set else "learner"


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
    user = User(
        id=str(uuid.uuid4()),
        email=email,
        display_name=body.display_name,
        password_hash=auth_svc.hash_password(body.password),
        role=_role_for(email),
        created_at=now,
        last_login_at=now,
    )
    db.add(user)
    db.commit()

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
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if user is None or not auth_svc.verify_password(user.password_hash, body.password):
        auth_svc.auth_rate_limiter.record_failure(ip)
        raise ApiError(
            401, "invalid_credentials", "That email and password don't match our records."
        )

    if auth_svc.needs_rehash(user.password_hash):
        user.password_hash = auth_svc.hash_password(body.password)
    user.role = _role_for(email) if user.role == "learner" else user.role
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
]


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
    for _, model in _EXPORT_TABLES:
        for row in db.execute(select(model).where(model.user_id == user.id)).scalars():
            db.delete(row)
    for row in db.execute(select(SessionRow).where(SessionRow.user_id == user.id)).scalars():
        db.delete(row)
    db.delete(user)
    db.commit()
    response = Response(status_code=204)
    auth_svc.clear_session_cookie(response)
    return response
