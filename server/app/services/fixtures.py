"""QA-001 crawl fixture accounts (dev-only; created when FIXTURES=1).

Wave 0 scope: accounts only. Progress/journal/XP/tutor-history payloads for
mid@ and grad@ land with the seed pipeline in Wave 1+.
"""

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import hash_password
from ..models import User, utc_now_iso

logger = logging.getLogger("sightline.fixtures")

FIXTURE_PASSWORD = "crawl-pass"

FIXTURE_ACCOUNTS = [
    ("fresh@crawl.test", "Fresh Crawler"),
    ("mid@crawl.test", "Mid Crawler"),
    ("grad@crawl.test", "Grad Crawler"),
]


def create_fixture_accounts(db: Session) -> int:
    """Idempotently create the three crawl accounts. Returns how many were created."""
    created = 0
    password_hash = None
    for email, display_name in FIXTURE_ACCOUNTS:
        existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
        if existing is not None:
            continue
        if password_hash is None:
            password_hash = hash_password(FIXTURE_PASSWORD)
        db.add(
            User(
                id=str(uuid.uuid4()),
                email=email,
                display_name=display_name,
                password_hash=password_hash,
                role="learner",
                created_at=utc_now_iso(),
            )
        )
        created += 1
    if created:
        db.commit()
    logger.info("fixtures: %d crawl account(s) created, %d already present",
                created, len(FIXTURE_ACCOUNTS) - created)
    return created
