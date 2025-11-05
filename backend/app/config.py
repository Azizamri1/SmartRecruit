# backend/app/config.py
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    CREATE_TABLES: str = "false"
    SMTP_SERVER: str
    SMTP_PORT: int
    SMTP_USER: str
    SMTP_PASSWORD: str
    EMAIL_FROM: str

    # AI Settings
    BI_ENCODER_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    CROSS_ENCODER_MODEL: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    USE_CROSS_ENCODER: str = "true"

    # CORS Settings
    CORS_ORIGINS: str = ""

    # Logging Settings
    DEBUG: bool = False
    ENABLE_REQUEST_LOGS: bool = True

    class Config:
        env_file = ".env"

settings = Settings()
