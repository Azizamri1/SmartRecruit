# app/main.py
import os

from app import models
from app.config import settings
from app.database import engine
from app.routers import (admin_analytics, applications, auth, company,
                         company_analytics, cvs, jobs, users)
from app.services.ai_service import ai_service, compute_deterministic_score
from app.services.ai_service import warmup as warmup_ai
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.logging import setup_logging

load_dotenv()

# --- Create DB tables in dev only (use Alembic in prod) ---
if os.getenv("CREATE_TABLES", "false").lower() in {"1", "true", "yes"}:
    models.Base.metadata.create_all(bind=engine)

setup_logging(debug=getattr(settings, "DEBUG", False))

app = FastAPI(title="Job Matching API")


@app.on_event("startup")
def _warm_models():
    try:
        warmup_ai()
    except Exception as e:
        # don't block startup on warmup issues
        import logging

        logging.getLogger("smartrecruit").warning("warmup_failed", exc_info=e)


if getattr(settings, "ENABLE_REQUEST_LOGS", True):
    from .core.middleware import AccessLogMiddleware, RequestIdMiddleware

    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(AccessLogMiddleware)

# --- CORS ---
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
# Optionally override with comma-separated ORIGINS in .env
env_origins = os.getenv("CORS_ORIGINS")
origins = (
    [o.strip() for o in env_origins.split(",")] if env_origins else default_origins
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(jobs.router)
app.include_router(cvs.router)
app.include_router(applications.router)
app.include_router(admin_analytics.router)
app.include_router(company_analytics.router)
app.include_router(company.router)

# --- Static files ---
import os

from fastapi.staticfiles import StaticFiles

if not os.path.exists("uploads"):
    os.makedirs("uploads")
if not os.path.exists("uploads/company_logos"):
    os.makedirs("uploads/company_logos")
if not os.path.exists("uploads/avatars"):
    os.makedirs("uploads/avatars")
app.mount(
    "/static/company_logos",
    StaticFiles(directory="uploads/company_logos"),
    name="company_logos",
)
app.mount("/static/avatars", StaticFiles(directory="uploads/avatars"), name="avatars")


# --- Simple health check ---
@app.get("/health")
def health():
    return {"status": "ok"}


# --- Detailed health check ---
@app.get("/healthz")
def healthz():
    """Detailed health check with AI service status"""
    ok = True
    ai_ok = True
    try:
        # model load
        from app.services.ai_service import get_bi_encoder

        _ = get_bi_encoder()
        # micro inference
        _ = compute_deterministic_score("ping", "pong")
    except Exception:
        ai_ok = False
        ok = False

    return {
        "status": "ok" if ok else "error",
        "services": {
            "database": "ok",  # Assume DB is ok if we get here
            "ai_service": "ok" if ai_ok else "error",
        },
        "email_config_present": bool(getattr(settings, "SMTP_SERVER", None)),
    }


# --- AI warmup endpoint ---
@app.post("/ai/warmup")
def warmup_ai():
    """Warm up AI models by loading them into memory"""
    try:
        # Force loading of AI models
        ai_service.get_embedding("warmup test text")
        print("AI models warmed up successfully")
        return {"message": "AI models warmed up successfully"}
    except Exception as e:
        print(f"Failed to warm up AI models: {e}")
        return {"error": f"Failed to warm up AI models: {str(e)}"}


# --- Email test endpoint ---
@app.post("/test-email")
async def test_email():
    """Test email functionality with hardcoded values"""
    from app.services.email_service import send_status_email

    try:
        await send_status_email(
            recipient="henrylone18@gmail.com", status="accepted", full_name="Test User"
        )
        return {"message": "Email sent successfully"}
    except Exception as e:
        import traceback

        error_details = traceback.format_exc()
        return {"error": str(e), "traceback": error_details}
