"""SQLAlchemy 2.x engine + session (SPEC-002 §Performance notes).

Two backends, one switch:

* **SQLite** (default) — local development. WAL mode and a 5000 ms busy timeout
  are applied on every connection; the single-writer discipline of a
  one-instance dev box makes that adequate.
* **PostgreSQL** — set ``DATABASE_URL`` and the app uses managed Postgres
  instead. This is what takes the database off any one person's machine
  (ADR-008 §Availability): the data outlives the container, survives restarts,
  and is backed up by the provider rather than by whoever last remembered to.

Nothing else in the codebase needs to know which one is in use.
"""

from collections.abc import Generator

from sqlalchemy import create_engine, event, inspect
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()

if settings.uses_sqlite:
    engine = create_engine(
        settings.sqlalchemy_url,
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_connection, connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

else:
    # pool_pre_ping: managed Postgres closes idle connections, and a pooled
    # connection that died between requests otherwise surfaces as a 500 on a
    # perfectly good request.
    engine = create_engine(
        settings.sqlalchemy_url,
        pool_pre_ping=True,
        pool_recycle=300,
    )


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


# Columns added after a table first shipped. create_all never ALTERs, so a
# database created by an earlier build needs these applied by hand (Alembic-free
# per AGENT_OPERATIONS W0; a real migration tool stays out of budget).
#
# Portable DDL only — these run against SQLite and Postgres alike.
_LATE_COLUMNS: list[tuple[str, str, str]] = [
    ("course_meta", "assessment_bank", "JSON"),
    ("xp_events", "ref", "VARCHAR"),
    # SPEC-011 roles: funds access is a separate flag from role so that it can
    # be held by exactly one account regardless of how many admins exist.
    ("users", "can_access_funds", "BOOLEAN DEFAULT FALSE"),
    ("users", "created_by_user_id", "VARCHAR"),
]


def _ensure_late_columns() -> None:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        for table, column, ddl in _LATE_COLUMNS:
            if table not in existing_tables:
                continue  # create_all just made it with the column present
            columns = {c["name"] for c in inspector.get_columns(table)}
            if column not in columns:
                conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}")


def init_db() -> None:
    """Create the data directory and all tables (Alembic-free per AGENT_OPERATIONS W0)."""
    if settings.uses_sqlite:
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
