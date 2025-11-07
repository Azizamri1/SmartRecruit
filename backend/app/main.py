"""
Main FastAPI application for the job matching platform.
Handles routing, middleware, and core application setup.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv

from . import models
from .database import engine
from .config import settings
from .routers import auth, users, jobs, cvs, applications, admin_analytics, company_analytics, company
from .services.ai_service import compute_deterministic_score
from .core.logging import setup_logging

# Load environment variables
load_dotenv()

# Create database tables in development (use Alembic for production)
if os.getenv("CREATE_TABLES", "false").lower() in {"1", "true", "yes"}:
    models.Base.metadata.create_all(bind=engine)

# Set up application logging
setup_logging(debug=getattr(settings, "DEBUG", False))

# Initialize FastAPI application
app = FastAPI(title="Job Matching API")

@app.on_event("startup")
def _warm_models():
    """Warm up AI models on startup to reduce first-request latency."""
    try:
        from .services.ai_service import get_bi_encoder
        _ = get_bi_encoder()
        _ = compute_deterministic_score("warmup", "warmup")
    except Exception as e:
        # Log warning but don't fail startup
        import logging
        logging.getLogger("smartrecruit").warning("warmup_failed", exc_info=e)

# Add request logging middleware if enabled
if getattr(settings, "ENABLE_REQUEST_LOGS", True):
    from .core.middleware import RequestIdMiddleware, AccessLogMiddleware
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(AccessLogMiddleware)

# Configure CORS settings
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# Allow override via environment variable
env_origins = os.getenv("CORS_ORIGINS")
origins = [o.strip() for o in env_origins.split(",")] if env_origins else default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(jobs.router)
app.include_router(cvs.router)
app.include_router(applications.router)
app.include_router(admin_analytics.router)
app.include_router(company_analytics.router)
app.include_router(company.router)

# Set up static file serving for uploads
if not os.path.exists("uploads"):
    os.makedirs("uploads")
if not os.path.exists("uploads/company_logos"):
    os.makedirs("uploads/company_logos")
if not os.path.exists("uploads/avatars"):
    os.makedirs("uploads/avatars")

app.mount("/static/company_logos", StaticFiles(directory="uploads/company_logos"), name="company_logos")
app.mount("/static/avatars", StaticFiles(directory="uploads/avatars"), name="avatars")

@app.get("/health")
def health():
    """Basic health check endpoint."""
    return {"status": "ok"}

@app.get("/healthz")
def healthz():
    """Detailed health check with service status."""
    ok = True
    ai_ok = True
    try:
        # Test AI model loading and inference
        from .services.ai_service import get_bi_encoder
        _ = get_bi_encoder()
        _ = compute_deterministic_score("ping", "pong")
    except Exception:
        ai_ok = False
        ok = False

    return {
        "status": "ok" if ok else "error",
        "services": {
            "database": "ok",  # Assume DB is healthy if we reach this point
            "ai_service": "ok" if ai_ok else "error"
        },
        "email_config_present": bool(getattr(settings, "SMTP_SERVER", None))
    }

@app.post("/ai/warmup")
def warmup_ai():
    """Manually trigger AI model warmup."""
    try:
        from .services.ai_service import get_bi_encoder
        _ = get_bi_encoder()
        _ = compute_deterministic_score("warmup test text", "warmup job text")
        print("AI models warmed up successfully")
        return {"message": "AI models warmed up successfully"}
    except Exception as e:
        print(f"Failed to warm up AI models: {e}")
        return {"error": f"Failed to warm up AI models: {str(e)}"}

@app.post("/test-email")
async def test_email():
    """Test email functionality with sample data."""
    from app.services.email_service import send_status_email
    try:
        await send_status_email(
            recipient="henrylone18@gmail.com",
            status="accepted",
            full_name="Test User"
        )
        return {"message": "Email sent successfully"}
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        return {"error": str(e), "traceback": error_details}
