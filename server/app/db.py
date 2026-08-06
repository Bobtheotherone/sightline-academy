"""SQLAlchemy 2.x engine + session over SQLite (SPEC-002 §Performance notes).

WAL mode and a 5000 ms busy timeout are applied on every connection; the
single-writer discipline of a one-instance deploy makes this adequate.
"""

from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine, "connect")
def _set_sqlite_pragmas(dbapi_connection, connection_record) -> None:
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


# Columns added after Wave 0 shipped the tables. create_all never ALTERs, so a
# dev DB created earlier needs these applied by hand (Alembic-free per
# AGENT_OPERATIONS W0; a real migration tool stays out of budget).
_LATE_COLUMNS = [
    ("course_meta", "assessment_bank", "JSON"),
    ("xp_events", "ref", "VARCHAR"),
]


def _ensure_late_columns() -> None:
    with engine.begin() as conn:
        for table, column, ddl in _LATE_COLUMNS:
            rows = conn.exec_driver_sql(f"PRAGMA table_info({table})").fetchall()
            if rows and column not in {r[1] for r in rows}:
                conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}")


def init_db() -> None:
    """Create the data directory and all tables (Alembic-free per AGENT_OPERATIONS W0)."""
    settings.data_path.mkdir(parents=True, exist_ok=True)
    # Import models so all tables are registered on Base before create_all.
    from . import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _ensure_late_columns()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
