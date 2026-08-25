"""Provision the owner and admin accounts from configuration (SPEC-011).

Run this once per environment, after OWNER_EMAIL / ADMIN_EMAILS are set:

    docker compose -f ops/docker-compose.yml exec -T api \
        python /app/ops/bootstrap_accounts.py

It exists because of a genuine chicken-and-egg: funds access can only be
granted by an account that already holds it, so the very first holder cannot be
created through the admin API. This is that bootstrap, and it is deliberately
the *only* path that mints one.

What it does, per address in the configuration:

* **Existing account** — aligns the role, and grants funds access to the owner.
  It never touches the password, so nobody is locked out by a re-run.
* **Missing account** — creates it with a cryptographically random password,
  printed **once**, to this terminal, and stored only as an argon2id hash.

Safe to re-run: it reports "already correct" rather than churning rows, and
every change it does make is written to the audit log.

Flags:
    --reset-password EMAIL   Issue a fresh random password for one account.
    --dry-run                Show what would change and exit.
"""

from __future__ import annotations

import argparse
import secrets
import sys
import uuid
from pathlib import Path

# Make the `app` package importable no matter how this is invoked.
#
# It runs in two quite different places: inside the api container, where the
# tree is /app/ops + /app/server, and straight out of a checkout, where it is
# <repo>/ops + <repo>/server. Resolving `server/` relative to THIS file covers
# both — /app/ops/bootstrap_accounts.py resolves to /app/server on its own —
# and it no longer depends on which directory the caller happened to be in.
# The explicit container path stays as a fallback for any layout where the
# script has been copied somewhere else.
_CANDIDATE_SERVER_DIRS = [
    Path(__file__).resolve().parent.parent / "server",
    Path("/app/server"),
]
for _candidate in _CANDIDATE_SERVER_DIRS:
    if (_candidate / "app" / "config.py").is_file():
        sys.path.insert(0, str(_candidate))
        break
else:  # pragma: no cover - only when the tree has been taken apart
    raise SystemExit(
        "Could not find the server/ folder next to ops/. Run this script from a "
        "complete copy of the project."
    )

from sqlalchemy import select  # noqa: E402

from app.auth import hash_password  # noqa: E402
from app.config import get_settings  # noqa: E402
from app.db import SessionLocal, init_db  # noqa: E402
from app.models import User, utc_now_iso  # noqa: E402
from app.services import audit as audit_svc  # noqa: E402
from app.services import roles as roles_svc  # noqa: E402

#: Long enough that it is not worth guessing, short enough to read aloud once.
GENERATED_PASSWORD_BYTES = 12


def generate_password() -> str:
    return secrets.token_urlsafe(GENERATED_PASSWORD_BYTES)


def ensure_account(
    db,
    email: str,
    *,
    role: str,
    funds: bool,
    display_name: str,
    dry_run: bool,
) -> tuple[str, str | None]:
    """Return (outcome, one_time_password). Password is None when unchanged."""
    email = email.strip().lower()
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()

    if user is None:
        if dry_run:
            return f"WOULD CREATE as {role}" + (" with funds access" if funds else ""), None
        password = generate_password()
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            display_name=display_name,
            password_hash=hash_password(password),
            role=role,
            can_access_funds=funds,
            created_at=utc_now_iso(),
        )
        db.add(user)
        db.commit()
        audit_svc.record(
            db,
            action=audit_svc.ACCOUNT_CREATED,
            actor=None,
            target_user_id=user.id,
            detail={"email": email, "role": role, "via": "bootstrap script"},
        )
        if funds:
            audit_svc.record(
                db,
                action=audit_svc.ACCOUNT_FUNDS_GRANTED,
                actor=None,
                target_user_id=user.id,
                detail={"via": "bootstrap script"},
            )
        return f"CREATED as {role}" + (" with funds access" if funds else ""), password

    changes = []
    if user.role != role:
        changes.append(f"role {user.role} -> {role}")
    if funds and not user.can_access_funds:
        changes.append("granted funds access")
    if not changes:
        return f"already correct ({role})", None
    if dry_run:
        return "WOULD UPDATE: " + "; ".join(changes), None

    previous_role = user.role
    user.role = role
    if funds:
        user.can_access_funds = True
    db.commit()

    if previous_role != role:
        audit_svc.record(
            db,
            action=audit_svc.ACCOUNT_ROLE_CHANGED,
            actor=None,
            target_user_id=user.id,
            detail={"from": previous_role, "to": role, "via": "bootstrap script"},
        )
    if funds:
        audit_svc.record(
            db,
            action=audit_svc.ACCOUNT_FUNDS_GRANTED,
            actor=None,
            target_user_id=user.id,
            detail={"via": "bootstrap script"},
        )
    return "UPDATED: " + "; ".join(changes), None


def reset_password(db, email: str, dry_run: bool) -> str | None:
    email = email.strip().lower()
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if user is None:
        print(f"  no account for {email}")
        return None
    if dry_run:
        print(f"  WOULD reset the password for {email}")
        return None
    password = generate_password()
    user.password_hash = hash_password(password)
    db.commit()
    audit_svc.record(
        db,
        action="account.password_reset",
        actor=None,
        target_user_id=user.id,
        detail={"via": "bootstrap script"},
    )
    return password


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reset-password", metavar="EMAIL")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    settings = get_settings()
    init_db()

    print()
    print("Sightline — account bootstrap")
    print("=" * 62)

    secrets_to_show: list[tuple[str, str]] = []

    with SessionLocal() as db:
        if args.reset_password:
            password = reset_password(db, args.reset_password, args.dry_run)
            if password:
                secrets_to_show.append((args.reset_password.strip().lower(), password))
        else:
            owner = settings.owner_email_normalised
            if not owner:
                print("  OWNER_EMAIL is not set — nothing to bootstrap.")
                print("  Set it and re-run; without it no account holds funds access.")
                return 1

            outcome, password = ensure_account(
                db,
                owner,
                role=roles_svc.ROLE_OWNER,
                funds=True,
                display_name="Osama",
                dry_run=args.dry_run,
            )
            print(f"  owner   {owner:28s} {outcome}")
            if password:
                secrets_to_show.append((owner, password))

            for email in sorted(settings.admin_email_set):
                outcome, password = ensure_account(
                    db,
                    email,
                    role=roles_svc.ROLE_ADMIN,
                    funds=False,
                    display_name=email.split("@")[0],
                    dry_run=args.dry_run,
                )
                print(f"  admin   {email:28s} {outcome}")
                if password:
                    secrets_to_show.append((email, password))

            for email in sorted(settings.instructor_email_set):
                outcome, password = ensure_account(
                    db,
                    email,
                    role=roles_svc.ROLE_INSTRUCTOR,
                    funds=False,
                    display_name=email.split("@")[0],
                    dry_run=args.dry_run,
                )
                print(f"  faculty {email:28s} {outcome}")
                if password:
                    secrets_to_show.append((email, password))

            for email in sorted(settings.developer_email_set):
                outcome, password = ensure_account(
                    db,
                    email,
                    role=roles_svc.ROLE_DEVELOPER,
                    funds=False,
                    display_name=email.split("@")[0],
                    dry_run=args.dry_run,
                )
                print(f"  dev     {email:28s} {outcome}")
                if password:
                    secrets_to_show.append((email, password))

    if secrets_to_show:
        print()
        print("-" * 62)
        print("  ONE-TIME PASSWORDS — shown here and nowhere else.")
        print("  Only the argon2id hash is stored; this cannot be recovered.")
        print("  Hand them over in person or by a channel you trust, and have")
        print("  the recipient change it at /account on first sign-in.")
        print("-" * 62)
        for email, password in secrets_to_show:
            print(f"  {email}")
            print(f"      {password}")
        print("-" * 62)

    print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
