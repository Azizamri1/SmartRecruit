"""
Application configuration settings loaded from environment variables.
Uses Pydantic for validation and type conversion.
"""

from pydantic_settings import BaseSettings


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
    SMTP_SERVER: str
    SMTP_PORT: int
    SMTP_USER: str
    SMTP_PASSWORD: str
    EMAIL_FROM: str

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


# Global settings instance
settings = Settings()
