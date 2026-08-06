"""Environment settings (pydantic-settings) per ADR-001 / SPEC-002.

Reads a `.env` at the repo root when present. All values overridable via
environment variables of the same (upper-case) name.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

SERVER_DIR = Path(__file__).resolve().parents[1]  # .../server
REPO_ROOT = SERVER_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(REPO_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Sessions / auth (SPEC-005)
    session_secret: str = "dev-only-not-a-secret-change-in-prod"
    secure_cookies: int = 0  # 1 => set Secure on the session cookie (HTTPS deploys)
    instructor_emails: str = ""  # comma-separated list; matching emails get role=instructor

    # LLM provider (ADR-001)
    anthropic_api_key: str = ""
    tutor_model: str = "claude-sonnet-4-6"

    # Boot behavior
    seed_force: int = 0  # 1 => re-run the seed pipeline even if course tables are populated
    fixtures: int = 0  # 1 => create the QA-001 crawl fixture accounts (dev only)

    # Storage (SQLite + Chroma live under one data dir; single volume per ADR-001)
    data_dir: str = "../data"

    @property
    def data_path(self) -> Path:
        p = Path(self.data_dir)
        if not p.is_absolute():
            p = (SERVER_DIR / p).resolve()
        return p

    @property
    def sqlite_path(self) -> Path:
        return self.data_path / "sightline.db"

    @property
    def chroma_path(self) -> Path:
        return self.data_path / "chroma"

    @property
    def database_url(self) -> str:
        return f"sqlite:///{self.sqlite_path.as_posix()}"

    @property
    def instructor_email_set(self) -> set[str]:
        return {e.strip().lower() for e in self.instructor_emails.split(",") if e.strip()}

    @property
    def provider(self) -> str:
        return "anthropic" if self.anthropic_api_key else "extractive"


@lru_cache
def get_settings() -> Settings:
    return Settings()
