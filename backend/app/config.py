"""
Application configuration settings loaded from environment variables.
Uses Pydantic for validation and type conversion.
"""

from pydantic_settings import BaseSettings, Field
import os


class Settings(BaseSettings):
    # Database configuration
    DATABASE_URL: str

    # JWT authentication settings
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    # Development settings
    CREATE_TABLES: str = "false"

    # Email/SMTP configuration
    SMTP_SERVER: str = Field("", env="SMTP_SERVER")
    SMTP_PORT: int = Field(587, env="SMTP_PORT")
    SMTP_USER: str = Field("", env="SMTP_USER")
    SMTP_PASSWORD: str = Field("", env="SMTP_PASSWORD")
    SMTP_SSL: bool = Field(False, env="SMTP_SSL")
    SMTP_STARTTLS: bool = Field(True, env="SMTP_STARTTLS")

    EMAIL_FROM: str = Field("noreply@smartrecruit.tn", env="EMAIL_FROM")
    EMAIL_FROM_NAME: str = Field("TT SmartRecruit", env="EMAIL_FROM_NAME")
    EMAIL_DRY_RUN: bool = Field(False, env="EMAIL_DRY_RUN")

    FRONTEND_BASE_URL: str = Field("", env="FRONTEND_BASE_URL")

    # AI/ML model settings
    BI_ENCODER_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    CROSS_ENCODER_MODEL: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    USE_CROSS_ENCODER: str = "true"

    # CORS configuration
    CORS_ORIGINS: str = ""

    # Logging and debugging
    DEBUG: bool = False
    ENABLE_REQUEST_LOGS: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()

# Optional: legacy fallback mapping (keeps old envs working)
if not settings.SMTP_SERVER and os.getenv("SMTP_HOST"):
    settings.SMTP_SERVER = os.getenv("SMTP_HOST")
if not settings.SMTP_PASSWORD and os.getenv("SMTP_PASS"):
    settings.SMTP_PASSWORD = os.getenv("SMTP_PASS")
if not os.getenv("EMAIL_FROM") and os.getenv("FROM_EMAIL"):
    # Preserve explicit EMAIL_FROM if set; otherwise accept legacy FROM_EMAIL
    settings.EMAIL_FROM = os.getenv("FROM_EMAIL") or settings.EMAIL_FROM
