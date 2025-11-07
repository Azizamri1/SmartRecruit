from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from ..database import SessionLocal
from ..utils.cv_text import extract_text_from_file, clean_extracted_text
from ..services.ai_service import score_cv_to_job, score_components, parse_profile_requirements, _tok, _canonize_tokens, LEN_TIER_HARD, LEN_TIER_SOFT, MUST_CAP_NO_HIT
# import relative
from ..deps import get_db, get_current_user
from .. import models, schemas
from datetime import datetime, timezone
from pathlib import Path
import re
from ..services.email_service import send_email, tpl_submission, tpl_decision

# helper to normalize any shape -> list[str]
def _as_list(value):
    if value is None:
        return []
    if isinstance(value, (list, tuple, set)):
        return [str(x).strip() for x in value if str(x).strip()]
    if isinstance(value, str):
        # try split on common separators; fallback to one-item list
        if any(sep in value for sep in [",", ";", "\n", "•", "|", "/"]):
            parts = re.split(r"[,\n;\u2022\|/]+", value)  # \u2022 = •
            return [p.strip(" -•\t") for p in parts if p.strip(" -•\t")]
        return [value.strip()] if value.strip() else []
    # unknown types -> stringified single item
    return [str(value).strip()] if str(value).strip() else []

def _resolve_cv_full_path(file_path: str) -> Path:
    """
    Normalize and absolutize the stored CV path so pypdf gets a real file.
    Works regardless of mixed slashes or current working dir.
    """
    # 1) normalize weird slashes
    normalized = file_path.replace("\\", "/").strip()

    p = Path(normalized)
    if not p.is_absolute():
        # base dir: two parents up from this file => project backend/ root
        base_dir = Path(__file__).resolve().parents[2]   # (app/routers/..) -> backend/
        p = (base_dir / normalized).resolve()

    return p

def background_compute_and_save_score(db_session_factory, app_id: int) -> None:
    db: Session = db_session_factory()
    try:
        app = db.query(models.Application).get(app_id)
        if not app:
            return

        cv = db.query(models.CV).get(app.cv_id)
        job = db.query(models.Job).get(app.job_id)
        if not cv or not job:
            return

        full_cv_path = _resolve_cv_full_path(cv.file_path)
        try:
            size = full_cv_path.stat().st_size
        except FileNotFoundError:
            print(f"[SCORING][background] failed: CV file missing at {full_cv_path}")
            return

        print(f"[SCORING] reading {full_cv_path} size={size}")
        if size == 0:
            print("[SCORING][background] failed: Cannot read an empty file")
            return

        # Extract & clean CV text
        raw_cv = extract_text_from_file(str(full_cv_path))
        cv_text = clean_extracted_text(raw_cv)

        skills_txt = " ".join(sorted(set(job.skills or [])))
        missions_txt = " ".join(sorted(set(job.missions or [])))

        job_text = " ".join(filter(None, [
            job.title,
            job.offer_description,
            job.description,
            f"Skills: {skills_txt}" if skills_txt else "",
            f"Missions: {missions_txt}" if missions_txt else "",
            job.profile_requirements or "",
        ]))

        # Parse profile_requirements WITH job.skills context
        parsed = parse_profile_requirements(job.profile_requirements or "", job_skills=(job.skills or []))

        skills   = list(sorted(set(job.skills or [])))

        # For requirements, include:
        #  - missions (FR lines will match after accent fold)
        requirements = list(sorted(set((job.missions or [])))) + parsed["must_haves"]

        profile  = parsed["profile"]
        langs    = parsed["languages"]
        musts    = parsed["must_haves"]   # tech-only musts now

        score = score_cv_to_job(
            cv_text, job_text,
            skills=skills,
            requirements=requirements,
            profile=profile,
            languages=langs,
            must_haves=musts,
        )
        app.score = round(float(score), 2)
        db.commit()
    except Exception as e:
        print("[SCORING][background] failed:", e)
    finally:
        db.close()

router = APIRouter(prefix="/applications", tags=["applications"])

@router.post("", response_model=schemas.ApplicationOut)
def create_application(payload: schemas.ApplicationCreate,
                       background: BackgroundTasks,
                       db: Session = Depends(get_db),
                       user=Depends(get_current_user)):
    # Only candidates apply (admins optional)
    if not (getattr(user, "account_type", None) == "candidate" or getattr(user, "is_admin", False)):
        raise HTTPException(403, "Only candidates can apply")

    job = db.query(models.Job).get(payload.job_id)
    if not job or job.status != "published":
        raise HTTPException(404, "Job not found or not open")

    # Require a CV to exist (simple policy)
    if payload.cv_id is None:
        raise HTTPException(400, "Please provide cv_id")

    app = models.Application(
        user_id=user.id,
        job_id=payload.job_id,
        cover_letter=payload.cover_letter,
        cv_id=payload.cv_id,
        status="pending",
        applied_at=datetime.now(timezone.utc)
    )
    try:
        db.add(app)
        db.commit()
        db.refresh(app)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "You have already applied to this job")

    # compute and save score (background)
    try:
        background.add_task(background_compute_and_save_score, SessionLocal, app.id)
    except Exception as e:
        print("[SCORE][compute] enqueue failed:", e)

    # send submission email (background)
    try:
        subj, html, txt = tpl_submission(user.email, job.title)
        background.add_task(send_email, user.email, subj, html, txt)
    except Exception as e:
        print("[EMAIL][submission] enqueue failed:", e)

    return app

@router.get("/me", response_model=list[schemas.MyApplicationRead])
def my_applications(db: Session = Depends(get_db), user=Depends(get_current_user)):
    rows = (
        db.query(
            models.Application.id,
            models.Application.job_id,
            models.Application.status,
            models.Application.score,
            models.Application.applied_at,
            models.Job.title.label("job_title"),
        )
        .join(models.Job, models.Job.id == models.Application.job_id)
        .filter(models.Application.user_id == user.id)
        .order_by(models.Application.applied_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "job_id": r.job_id,
            "job_title": r.job_title,
            "status": r.status,
            "score": r.score,
            "applied_at": r.applied_at,
        }
        for r in rows
    ]

@router.patch("/{application_id}/status")
def update_application_status(application_id: int, payload: dict,
                              background: BackgroundTasks,
                              db: Session = Depends(get_db), user=Depends(get_current_user)):
    """
    Body: { "status": "accepted" | "rejected" }
    Only job owner or admin can change status. Sends decision email.
    """
    new_status = (payload or {}).get("status")
    if new_status not in {"accepted", "rejected"}:
        raise HTTPException(400, "Invalid status")

    app = db.query(models.Application).get(application_id)
    if not app:
        raise HTTPException(404, "Application not found")

    job = db.query(models.Job).get(app.job_id)
    if not job:
        raise HTTPException(404, "Job not found")

    if not (getattr(user, "is_admin", False) or job.owner_user_id == user.id):
        raise HTTPException(403, "Not allowed")

    app.status = new_status
    db.commit()
    db.refresh(app)

    # email candidate (background)
    try:
        candidate = db.query(models.User).get(app.user_id)
        if candidate and candidate.email:
            subj, html, txt = tpl_decision(candidate.email, job.title, new_status)
            background.add_task(send_email, candidate.email, subj, html, txt)
    except Exception as e:
        print("[EMAIL][decision] enqueue failed:", e)

    return {"id": app.id, "status": app.status}

@router.post("/_debug/score", tags=["admin"])
def debug_score(cv_id: int, job_id: int, db: Session = Depends(get_db),
                current_user: models.User = Depends(get_current_user)):
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(403, "Admin only")

    job = db.query(models.Job).get(job_id)
    cv = db.query(models.CV).get(cv_id)
    full_cv_path = _resolve_cv_full_path(cv.file_path)
    cv_text = clean_extracted_text(extract_text_from_file(str(full_cv_path)))

    skills_txt = " ".join(sorted(set(job.skills or [])))
    missions_txt = " ".join(sorted(set(job.missions or [])))

    job_text = " ".join(filter(None, [
        job.title,
        job.offer_description,
        job.description,
        f"Skills: {skills_txt}" if skills_txt else "",
        f"Missions: {missions_txt}" if missions_txt else "",
        job.profile_requirements or "",
    ]))

    parsed = parse_profile_requirements(job.profile_requirements or "", job_skills=(job.skills or []))

    skills       = list(sorted(set(job.skills or [])))
    missions     = list(sorted(set(job.missions or [])))
    profile      = parsed["profile"]
    musts        = parsed["must_haves"]
    langs        = parsed["languages"]

    comps = score_components(
        cv_text, job_text,
        skills=skills,
        requirements=(missions + musts),   # both lists now
        profile=profile,
        languages=langs,
        must_haves=musts,
    )
    canon_count = len(_canonize_tokens(_tok(cv_text)))
    return {
        "cv_id": cv_id,
        "job_id": job_id,
        "components": comps,
        "derived": {
            "token_count_words": len(cv_text.split()),
            "token_count_canon": canon_count,
            "len_penalty_tier": (
                "NONE" if canon_count >= LEN_TIER_SOFT else
                "SOFT" if canon_count >= LEN_TIER_HARD else
                "HARD"
            ),
            "must_cap_applied": comps["must_cap"] is not None,
            "must_cap_value": comps["must_cap"],
            "must_cap_reason": None if comps["must_cap"] is None else "no must-have tokens matched",
        },
        "preview": cv_text[:500] if cv_text else "",
    }
