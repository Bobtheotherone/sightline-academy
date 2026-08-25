"""Administration: accounts, roles, comps, revenue (SPEC-011).

The privilege rules this router enforces, restated:

* Osama (``owner``, holding ``can_access_funds``) may create any role and is
  the only account that may grant funds access — or read revenue.
* Rad (``admin``) may create learner and developer accounts, so other student
  workers who contribute can be given free access without involving Osama.
  He cannot mint faculty or admin accounts and cannot reach anything financial.
* Every privileged action is written to the audit log before the response is
  returned, so the "only Osama" claim is checkable rather than merely asserted.

Note that a caller can never grant a privilege they do not themselves hold,
and can never edit their own role — the two most common ways a permission
system is turned into a self-service promotion.
"""

import logging
import secrets
import uuid

from fastapi import APIRouter, Depends, Request
from pydantic import Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import auth as auth_svc
from ..db import get_db
from ..errors import ApiError
from ..models import SessionRow, User, utc_now_iso
from ..schemas import _EMAIL_RE, ApiModel, camelize
from ..services import audit as audit_svc
from ..services import billing as billing_svc
from ..services import entitlements as ent_svc
from ..services import roles as roles_svc

logger = logging.getLogger("sightline.admin")

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Schemas ──────────────────────────────────────────────────────────────────


class CreateAccountIn(ApiModel):
    # Plain str + the project's shared regex rather than pydantic's EmailStr:
    # EmailStr drags in the `email-validator` package, and adding a dependency
    # for one field would break the frozen uv lock the API image builds from.
    email: str
    display_name: str = Field(min_length=1, max_length=80)
    role: str
    # Optional: when omitted a strong password is generated and returned once.
    password: str | None = Field(default=None, min_length=12, max_length=200)
    grant_funds_access: bool = False

    @field_validator("email")
    @classmethod
    def _email_valid(cls, v: str) -> str:
        v = v.strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("Enter a valid email address.")
        return v

    @field_validator("role")
    @classmethod
    def _known_role(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in roles_svc.ALL_ROLES:
            raise ValueError(f"Unknown role {v!r}.")
        return v


class ChangeRoleIn(ApiModel):
    role: str

    @field_validator("role")
    @classmethod
    def _known_role(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in roles_svc.ALL_ROLES:
            raise ValueError(f"Unknown role {v!r}.")
        return v


class FundsAccessIn(ApiModel):
    granted: bool
    reason: str = Field(min_length=3, max_length=300)


class CompIn(ApiModel):
    reason: str = Field(min_length=3, max_length=300)


# ── Helpers ──────────────────────────────────────────────────────────────────


def _user_row(db: Session, user: User) -> dict:
    ent = ent_svc.get_entitlement(db, user.id)
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "role": user.role,
        "can_access_funds": bool(user.can_access_funds),
        "created_at": user.created_at,
        "last_login_at": user.last_login_at,
        "entitlement": {
            "status": ent.status if ent else "none",
            "source": ent.source if ent else "none",
            "current_period_end": ent.current_period_end if ent else None,
        },
    }


def _require_target(db: Session, user_id: str) -> User:
    target = db.get(User, user_id)
    if target is None:
        raise ApiError(404, "not_found", "No account with that id.")
    return target


# ── Read ─────────────────────────────────────────────────────────────────────


@router.get("/me/permissions")
def my_permissions(actor: User = Depends(auth_svc.require_admin)) -> dict:
    """What this admin may actually do — the UI renders from this, not from role."""
    return camelize({
        "role": actor.role,
        "can_access_funds": bool(actor.can_access_funds),
        "grantable_roles": sorted(roles_svc.grantable_roles(actor.role)),
        "may_grant_funds_access": roles_svc.may_grant_funds_access(actor.can_access_funds),
        "may_comp_accounts": True,
        "role_catalog": [
            {"key": r.key, "label": r.label, "blurb": r.blurb} for r in roles_svc.ROLE_CATALOG
        ],
    })


@router.get("/accounts")
def list_accounts(
    q: str | None = None,
    limit: int = 100,
    actor: User = Depends(auth_svc.require_admin),
    db: Session = Depends(get_db),
) -> dict:
    stmt = select(User).order_by(User.created_at.desc()).limit(min(max(limit, 1), 500))
    if q:
        needle = f"%{q.strip().lower()}%"
        stmt = stmt.where(func.lower(User.email).like(needle))
    users = list(db.execute(stmt).scalars())
    return camelize({"accounts": [_user_row(db, u) for u in users], "count": len(users)})


@router.get("/audit")
def read_audit(
    limit: int = 200,
    actor: User = Depends(auth_svc.require_admin),
    db: Session = Depends(get_db),
) -> dict:
    entries = audit_svc.recent(db, limit=min(max(limit, 1), 500))
    return camelize({
        "entries": [
            {
                "id": e.id,
                "action": e.action,
                "actor_email": e.actor_email,
                "target_user_id": e.target_user_id,
                "detail": e.detail,
                "created_at": e.created_at,
            }
            for e in entries
        ]
    })


# ── Account creation ─────────────────────────────────────────────────────────


@router.post("/accounts", status_code=201)
def create_account(
    body: CreateAccountIn,
    request: Request,
    actor: User = Depends(auth_svc.require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Provision an account. The caller can only hand out what they may grant."""
    if not roles_svc.may_grant_role(actor.role, body.role):
        allowed = ", ".join(sorted(roles_svc.grantable_roles(actor.role))) or "nothing"
        raise ApiError(
            403,
            "forbidden",
            f"Your account can create: {allowed}. Creating a {body.role} account "
            "is restricted to the faculty owner.",
        )

    if body.grant_funds_access and not roles_svc.may_grant_funds_access(actor.can_access_funds):
        raise ApiError(
            403,
            "forbidden",
            "Only the account that already holds funds access can grant it.",
        )

    existing = db.execute(
        select(User).where(User.email == body.email)
    ).scalar_one_or_none()
    if existing is not None:
        raise ApiError(409, "email_taken", "That email already has an account.")

    # A generated password is returned exactly once, in this response, and is
    # never stored in plaintext or logged. The recipient changes it on first use.
    generated = None
    password = body.password
    if not password:
        generated = secrets.token_urlsafe(15)
        password = generated

    now = utc_now_iso()
    user = User(
        id=str(uuid.uuid4()),
        email=body.email,
        display_name=body.display_name,
        password_hash=auth_svc.hash_password(password),
        role=body.role,
        can_access_funds=bool(body.grant_funds_access),
        created_by_user_id=actor.id,
        created_at=now,
    )
    db.add(user)
    db.commit()

    audit_svc.record(
        db,
        action=audit_svc.ACCOUNT_CREATED,
        actor=actor,
        target_user_id=user.id,
        detail={
            "email": user.email,
            "role": user.role,
            "funds_access": bool(body.grant_funds_access),
            "password": "generated" if generated else "supplied",
        },
        ip=auth_svc.client_ip(request),
    )
    if body.grant_funds_access:
        audit_svc.record(
            db,
            action=audit_svc.ACCOUNT_FUNDS_GRANTED,
            actor=actor,
            target_user_id=user.id,
            detail={"at": "account creation"},
            ip=auth_svc.client_ip(request),
        )

    return camelize({
        "account": _user_row(db, user),
        # Shown once. Deliver it out of band; it is not recoverable afterwards.
        "one_time_password": generated,
    })


# ── Role & privilege changes ─────────────────────────────────────────────────


@router.post("/accounts/{user_id}/role")
def change_role(
    user_id: str,
    body: ChangeRoleIn,
    request: Request,
    actor: User = Depends(auth_svc.require_admin),
    db: Session = Depends(get_db),
) -> dict:
    target = _require_target(db, user_id)

    if target.id == actor.id:
        raise ApiError(403, "forbidden", "You can't change your own role.")
    if not roles_svc.may_grant_role(actor.role, body.role):
        raise ApiError(
            403, "forbidden", f"Your account cannot grant the {body.role} role."
        )
    # Demoting someone whose role you could not have granted is also off-limits:
    # otherwise an admin could strip the owner and re-create the account.
    if not roles_svc.may_grant_role(actor.role, target.role):
        raise ApiError(
            403,
            "forbidden",
            f"Your account cannot modify a {target.role} account.",
        )

    previous = target.role
    target.role = body.role
    db.commit()
    audit_svc.record(
        db,
        action=audit_svc.ACCOUNT_ROLE_CHANGED,
        actor=actor,
        target_user_id=target.id,
        detail={"from": previous, "to": body.role},
        ip=auth_svc.client_ip(request),
    )
    return camelize({"account": _user_row(db, target)})


@router.post("/accounts/{user_id}/funds-access")
def set_funds_access(
    user_id: str,
    body: FundsAccessIn,
    request: Request,
    actor: User = Depends(auth_svc.require_funds_access),
    db: Session = Depends(get_db),
) -> dict:
    """Grant or revoke access to financial information.

    Gated on ``require_funds_access``, so the caller must already hold the
    privilege — the invariant is self-enforcing rather than dependent on the
    role table being correct.
    """
    target = _require_target(db, user_id)
    if target.id == actor.id and not body.granted:
        raise ApiError(
            403,
            "forbidden",
            "You can't remove your own funds access — that would leave no one "
            "able to grant it back.",
        )

    target.can_access_funds = bool(body.granted)
    db.commit()
    audit_svc.record(
        db,
        action=(
            audit_svc.ACCOUNT_FUNDS_GRANTED
            if body.granted
            else audit_svc.ACCOUNT_FUNDS_REVOKED
        ),
        actor=actor,
        target_user_id=target.id,
        detail={"reason": body.reason},
        ip=auth_svc.client_ip(request),
    )
    return camelize({"account": _user_row(db, target)})


# ── Entitlement overrides ────────────────────────────────────────────────────


@router.post("/accounts/{user_id}/comp")
def comp_account(
    user_id: str,
    body: CompIn,
    request: Request,
    actor: User = Depends(auth_svc.require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Grant free course access without a subscription (scholarship, pilot, staff guest)."""
    target = _require_target(db, user_id)
    ent_svc.upsert(
        db,
        target.id,
        status=ent_svc.STATUS_ACTIVE,
        source="comp",
        note=body.reason,
    )
    audit_svc.record(
        db,
        action=audit_svc.ENTITLEMENT_COMPED,
        actor=actor,
        target_user_id=target.id,
        detail={"reason": body.reason},
        ip=auth_svc.client_ip(request),
    )
    return camelize({"account": _user_row(db, target)})


@router.delete("/accounts/{user_id}/comp")
def revoke_comp(
    user_id: str,
    request: Request,
    actor: User = Depends(auth_svc.require_admin),
    db: Session = Depends(get_db),
) -> dict:
    target = _require_target(db, user_id)
    row = ent_svc.get_entitlement(db, target.id)
    if row is None or row.source != "comp":
        raise ApiError(400, "not_comped", "That account doesn't have a comped entitlement.")
    # Never touch a Stripe-sourced row from here: revoking a paid subscription
    # by hand would take away access someone is being billed for.
    db.delete(row)
    db.commit()
    audit_svc.record(
        db,
        action=audit_svc.ENTITLEMENT_REVOKED,
        actor=actor,
        target_user_id=target.id,
        detail={"source": "comp"},
        ip=auth_svc.client_ip(request),
    )
    return camelize({"account": _user_row(db, target)})


# ── Revenue (owner only) ─────────────────────────────────────────────────────


@router.get("/revenue")
def revenue(
    request: Request,
    actor: User = Depends(auth_svc.require_funds_access),
    db: Session = Depends(get_db),
) -> dict:
    """Subscriber counts and estimated MRR. Restricted to the funds-access account.

    Every read is logged: who looked at the money, and when.
    """
    audit_svc.record(
        db,
        action=audit_svc.FUNDS_VIEWED,
        actor=actor,
        detail={},
        ip=auth_svc.client_ip(request),
    )
    return camelize(billing_svc.revenue_summary(db))


# ── Session revocation ───────────────────────────────────────────────────────


@router.post("/accounts/{user_id}/revoke-sessions")
def revoke_sessions(
    user_id: str,
    request: Request,
    actor: User = Depends(auth_svc.require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Sign an account out everywhere — the lever to pull on a suspected compromise."""
    target = _require_target(db, user_id)
    if not roles_svc.may_grant_role(actor.role, target.role) and target.id != actor.id:
        raise ApiError(
            403, "forbidden", f"Your account cannot act on a {target.role} account."
        )
    rows = list(
        db.execute(select(SessionRow).where(SessionRow.user_id == target.id)).scalars()
    )
    for row in rows:
        db.delete(row)
    db.commit()
    audit_svc.record(
        db,
        action="account.sessions_revoked",
        actor=actor,
        target_user_id=target.id,
        detail={"count": len(rows)},
        ip=auth_svc.client_ip(request),
    )
    return camelize({"revoked": len(rows)})
