"""Runtime configuration loaded from environment / .env."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

try:
    from dotenv import load_dotenv

    # Load empire/.env if present (search upward from this file).
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except Exception:  # pragma: no cover - dotenv is optional at runtime
    pass


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass
class Settings:
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "").strip()
    anthropic_model: str = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6").strip()
    force_mock: bool = _as_bool(os.getenv("USE_MOCK"), default=False)

    base_tick_seconds: float = float(os.getenv("BASE_TICK_SECONDS", "3.0"))
    ceo_review_every: int = int(os.getenv("CEO_REVIEW_EVERY", "6"))
    starting_treasury: float = float(os.getenv("STARTING_TREASURY", "2000"))

    db_path: str = os.getenv("DB_PATH", "empire.db")

    @property
    def use_mock(self) -> bool:
        """Mock unless we have a key AND mock isn't explicitly forced."""
        return self.force_mock or not self.anthropic_api_key


settings = Settings()
