# backend/app/config.py
from __future__ import annotations

import os
from pathlib import Path

# Pydantic v2 imports
from pydantic import Field
try:
    # pydantic-settings >= 2.x (for Pydantic v2)
    from pydantic_settings import BaseSettings, SettingsConfigDict
    _V2 = True
except ImportError:
    # Fallback: very old env; we can still run on Pydantic v1 if needed
    from pydantic import BaseSettings  # type: ignore
    SettingsConfigDict = None
    _V2 = False

# Force .env location to backend/.env (next to this file's parent)
_BACKEND_DIR = Path(__file__).resolve().parents[1]     # backend/
_ENV_FILE = _BACKEND_DIR / ".env"

class Settings(BaseSettings):
    # Database configuration
    DATABASE_URL: str

    # JWT authentication settings
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    # Development settings
    CREATE_TABLES: str = "false"

    # SMTP
    SMTP_SERVER: str = Field("", description="SMTP server hostname")
    SMTP_PORT: int = Field(587, description="SMTP port")
    SMTP_USER: str = Field("", description="SMTP username")
    SMTP_PASSWORD: str = Field("", description="SMTP password")
    SMTP_SSL: bool = Field(False, description="Use SMTPS (implicit TLS)")
    SMTP_STARTTLS: bool = Field(True, description="Upgrade to TLS via STARTTLS")

    # Email
    EMAIL_FROM: str = Field("noreply@smartrecruit.tn", description="Sender email")
    EMAIL_FROM_NAME: str = Field("TT SmartRecruit", description="Sender display name")
    EMAIL_DRY_RUN: bool = Field(False, description="If true, do not actually send email")

    # App
    FRONTEND_BASE_URL: str = Field("", description="Frontend base URL for links")

    # AI/ML model settings
    BI_ENCODER_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    CROSS_ENCODER_MODEL: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    USE_CROSS_ENCODER: str = "true"

    # CORS configuration
    CORS_ORIGINS: str = ""

    # Logging and debugging
    DEBUG: bool = False
    ENABLE_REQUEST_LOGS: bool = True

    # pydantic-settings v2 config: read only backend/.env, utf-8
    if _V2:
        model_config = SettingsConfigDict(
            env_file=str(_ENV_FILE),
            env_file_encoding="utf-8",
            case_sensitive=False,
        )

    # Legacy env fallback (keep after fields so they can overwrite)
    def apply_legacy_fallbacks(self) -> None:
        # Accept legacy SMTP_HOST/SMTP_PASS/FROM_EMAIL if the new ones are unset
        if not self.SMTP_SERVER and os.getenv("SMTP_HOST"):
            self.SMTP_SERVER = os.getenv("SMTP_HOST") or self.SMTP_SERVER
        if not self.SMTP_PASSWORD and os.getenv("SMTP_PASS"):
            self.SMTP_PASSWORD = os.getenv("SMTP_PASS") or self.SMTP_PASSWORD
        if (not os.getenv("EMAIL_FROM")) and os.getenv("FROM_EMAIL"):
            # Only adopt FROM_EMAIL if EMAIL_FROM isn't explicitly set
            self.EMAIL_FROM = os.getenv("FROM_EMAIL") or self.EMAIL_FROM

# Pydantic v1 fallback config (only if _V2 is False)
if not _V2:
    class _Settings(Settings):  # type: ignore
        class Config:
            env_file = str(_ENV_FILE)
            env_file_encoding = "utf-8"
            case_sensitive = False
    Settings = _Settings  # type: ignore

settings = Settings()
settings.apply_legacy_fallbacks()
