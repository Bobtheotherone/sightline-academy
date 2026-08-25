"""Progress routes (SPEC-004 §Progress): the evidence write path, rollup,
final assessment, certificate, and public verification."""

import secrets
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import auth as auth_svc
from ..db import get_db
from ..errors import ApiError
from ..models import (
    AssessmentAttempt,
    BadgeAward,
    Certificate,
    CourseMeta,
    Module,
    ModuleCompletion,
    User,
    XpEvent,
)
from ..schemas import (
    AssessmentBankOut,
    CertificateOut,
    EvidencePutIn,
    EvidencePutOut,
    FinalAssessmentIn,
    FinalAssessmentOut,
    ProgressOut,
    VerifyOut,
)
from ..services import entitlements as ent_svc
from ..services import progress as progress_svc
from ..services import xp
from ..services.seed import COURSE_ID, COURSE_TITLE

router = APIRouter(tags=["progress"])

RECENT_XP_LIMIT = 15
# Fallback only — the live bar is the authored bank's passPct (see _pass_pct).
DEFAULT_PASS_PCT = 80.0
CERT_CODE_LENGTH = 10
CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
# Crockford base32 reads lookalikes as their canonical digit (I/L -> 1, O -> 0).
_CODE_LOOKALIKES = str.maketrans("ILO", "110")


@router.put("/steps/{step_id}/evidence", response_model=EvidencePutOut)
def put_step_evidence(
    step_id: str,
    body: EvidencePutIn,
    user: User = Depends(auth_svc.current_user),
    db: Session = Depends(get_db),
) -> EvidencePutOut:
    ent_svc.require_course_access(db, user)
    result = progress_svc.put_evidence(db, user, step_id, body)
    return EvidencePutOut.model_validate(result)


@router.get("/progress", response_model=ProgressOut)
def get_progress(
    user: User = Depends(auth_svc.current_user), db: Session = Depends(get_db)
) -> ProgressOut:
    modules, states = progress_svc.course_state(db, user.id)
    total = xp.xp_total(db, user.id)

    held = {
        row.badge_id: row.created_at
        for row in db.execute(
            select(BadgeAward).where(BadgeAward.user_id == user.id)
        ).scalars()
    }
    recent = db.execute(
        select(XpEvent)
        .where(XpEvent.user_id == user.id)
        .order_by(XpEvent.created_at.desc(), XpEvent.id.desc())
        .limit(RECENT_XP_LIMIT)
    ).scalars()

    return ProgressOut.model_validate(
        {
            "modules": [
                {
                    "module_id": m.id,
                    "title": m.title,
                    "percent": states[m.id].percent,
                    "complete": states[m.id].complete,
                    "lessons_completed": states[m.id].lessons_completed,
                    "lessons_total": len(states[m.id].lessons),
                }
                for m in modules
            ],
            "xp_total": total,
            "level": xp.level_for(total),
            "level_progress": xp.level_progress(total),
            "badges": [
                {"id": badge_id, "name": name, "awarded_at": held.get(badge_id)}
                for badge_id, name in xp.BADGES.items()
            ],
            "recent_xp": [progress_svc.xp_event_out(row) for row in recent],
        }
    )


# ── Final assessment (SPEC-004 §Progress, SPEC-006 §Hierarchy & unlocking) ───


def _assessment_bank(db: Session) -> dict:
    meta = db.get(CourseMeta, COURSE_ID)
    bank = meta.assessment_bank if meta else None
    if not bank or not bank.get("questions"):
        raise ApiError(503, "course_not_seeded", "The course content isn't loaded yet.")
    return bank


def _pass_pct(bank: dict) -> float:
    """The authored pass bar (final-assessment.md `passPct`, ADR-006 content-as-code).

    Any authored percentage is honoured as written; only an absent, non-numeric
    or out-of-range value falls back — an unreadable threshold must never be
    what decides a learner's attempt.
    """
    raw = bank.get("passPct")
    if isinstance(raw, bool) or not isinstance(raw, int | float):
        return DEFAULT_PASS_PCT
    return float(raw) if 0 <= raw <= 100 else DEFAULT_PASS_PCT


def _ensure_assessment_unlocked(db: Session, user_id: str) -> None:
    total = db.execute(select(func.count()).select_from(Module)).scalar_one()
    done = db.execute(
        select(func.count())
        .select_from(ModuleCompletion)
        .where(ModuleCompletion.user_id == user_id)
    ).scalar_one()
    if done < total:
        remaining = total - done
        plural = "module" if remaining == 1 else "modules"
        raise ApiError(
            403,
            "assessment_locked",
            f"The final assessment opens when all six modules are complete — "
            f"{remaining} {plural} to go.",
        )


def _user_certificate(db: Session, user_id: str) -> Certificate | None:
    return db.execute(
        select(Certificate).where(Certificate.user_id == user_id)
    ).scalars().first()


def _new_certificate_code(db: Session) -> str:
    """10-char crockford-base32, collision-checked against issued certificates."""
    while True:
        code = "".join(secrets.choice(CROCKFORD) for _ in range(CERT_CODE_LENGTH))
        if db.get(Certificate, code) is None:
            return code


@router.get("/assessment/final", response_model=AssessmentBankOut)
def get_assessment(
    user: User = Depends(auth_svc.current_user), db: Session = Depends(get_db)
) -> AssessmentBankOut:
    """Sanitized question set for the assessment page (same unlock gate)."""
    ent_svc.require_course_access(db, user)
    _ensure_assessment_unlocked(db, user.id)
    bank = _assessment_bank(db)
    return AssessmentBankOut.model_validate(
        {
            "questions": [
                {
                    "id": q["id"],
                    "module": q["module"],
                    "prompt": q["prompt"],
                    "options": [{"id": o["id"], "text": o["text"]} for o in q["options"]],
                }
                for q in bank["questions"]
            ]
        }
    )


@router.post("/assessment/final", response_model=FinalAssessmentOut)
def submit_assessment(
    body: FinalAssessmentIn,
    user: User = Depends(auth_svc.current_user),
    db: Session = Depends(get_db),
) -> FinalAssessmentOut:
    _ensure_assessment_unlocked(db, user.id)
    bank = _assessment_bank(db)

    per_question: list[dict] = []
    n_correct = 0
    for q in bank["questions"]:
        options = {o["id"]: o for o in q["options"]}
        best = next(o for o in q["options"] if o.get("correct") is True)
        chosen = options.get(body.answers.get(q["id"], ""))
        correct = chosen is not None and chosen["id"] == best["id"]
        n_correct += correct
        # The chosen option's authored feedback; unanswered/unknown falls back
        # to the correct option's so the review interstitial always teaches.
        feedback = (chosen or {}).get("feedback") or best.get("feedback", "")
        per_question.append(
            {"question_id": q["id"], "correct": correct, "feedback": feedback}
        )

    score_pct = round(100 * n_correct / len(bank["questions"]), 1)
    passed = score_pct >= _pass_pct(bank)
    db.add(
        AssessmentAttempt(
            id=str(uuid.uuid4()),
            user_id=user.id,
            kind="final",
            score_pct=score_pct,
            passed=passed,
            answers=dict(body.answers),
        )
    )

    certificate_code: str | None = None
    if passed:
        cert = _user_certificate(db, user.id)
        if cert is None:
            cert = Certificate(
                code=_new_certificate_code(db),
                user_id=user.id,
                name_on_cert=user.display_name,
            )
            db.add(cert)
        certificate_code = cert.code
        # Both awards are idempotent: XP dedupes on ref, badge on user::badge.
        xp.award(
            db, user.id, "final_assessment_passed",
            label="Final assessment passed", ref="final",
        )
        xp.on_certificate_issued(db, user.id)

    db.commit()
    return FinalAssessmentOut.model_validate(
        {
            "score_pct": score_pct,
            "passed": passed,
            "per_question": per_question,
            "certificate_code": certificate_code,
        }
    )


# ── Certificate & public verification (SPEC-009 §Certificate) ────────────────


@router.get("/certificate", response_model=CertificateOut)
def get_certificate(
    user: User = Depends(auth_svc.current_user), db: Session = Depends(get_db)
) -> CertificateOut:
    cert = _user_certificate(db, user.id)
    if cert is None:
        raise ApiError(
            404, "not_found", "No certificate yet — it's issued when you pass the final assessment."
        )
    return CertificateOut.model_validate(
        {"code": cert.code, "issued_at": cert.issued_at, "name_on_cert": cert.name_on_cert}
    )


@router.get("/verify/{code}", response_model=VerifyOut)
def verify_certificate(code: str, db: Session = Depends(get_db)) -> VerifyOut:
    """PUBLIC. Confirms validity with name + date only (no other PII)."""
    normalized = code.strip().upper().translate(_CODE_LOOKALIKES)
    cert = db.get(Certificate, normalized)
    if cert is None:
        return VerifyOut.model_validate({"valid": False})
    meta = db.get(CourseMeta, COURSE_ID)
    return VerifyOut.model_validate(
        {
            "valid": True,
            "name_on_cert": cert.name_on_cert,
            "issued_at": cert.issued_at,
            "course_title": meta.title if meta else COURSE_TITLE,
        }
    )
