"""Append-only audit trail for privileged actions.

"Only Osama can grant funds access" is an assertion until someone can check it
after the fact. This is that check — the integrity leg of the CIA triad, and
the thing a university compliance review actually asks to see.

Never record secrets, passwords, tokens, or card data here; the whole table is
readable by any admin.
"""

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import AuditLog, User

logger = logging.getLogger("sightline.audit")

# Action names, kept as constants so a typo cannot silently create a
# second, unqueryable spelling of an important event.
ACCOUNT_CREATED = "account.created"
ACCOUNT_ROLE_CHANGED = "account.role_changed"
ACCOUNT_FUNDS_GRANTED = "account.funds_access_granted"
ACCOUNT_FUNDS_REVOKED = "account.funds_access_revoked"
ACCOUNT_DISABLED = "account.disabled"
ENTITLEMENT_COMPED = "entitlement.comped"
ENTITLEMENT_REVOKED = "entitlement.revoked"
FUNDS_VIEWED = "funds.viewed"


def record(
    db: Session,
    *,
    action: str,
    actor: User | None,
    target_user_id: str | None = None,
    detail: dict | None = None,
    ip: str | None = None,
    commit: bool = True,
) -> AuditLog:
    entry = AuditLog(
        id=uuid.uuid4().hex,
        actor_user_id=actor.id if actor else None,
        actor_email=actor.email if actor else None,
        action=action,
        target_user_id=target_user_id,
        detail=detail or {},
        ip=ip,
    )
    db.add(entry)
    if commit:
        db.commit()
    logger.info(
        "audit: %s by %s -> %s %s",
        action,
        actor.email if actor else "system",
        target_user_id or "-",
        detail or {},
    )
    return entry


def recent(db: Session, limit: int = 200) -> list[AuditLog]:
    return list(
        db.execute(
            select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
        ).scalars()
    )
