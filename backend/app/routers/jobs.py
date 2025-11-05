from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..deps import get_current_user, get_db

# Assume get_current_user_optional exists or define it
try:
    from ..deps import get_current_user_optional
except ImportError:
    from ..deps import get_current_user as get_current_user_optional

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _job_to_out(job: models.Job, has_applied: bool = False) -> dict:
    # robust: owner rel might be named "owner" or "user"
    owner = getattr(job, "owner", None) or getattr(job, "user", None)
    d = schemas.JobOut.from_orm(
        job
    ).dict()  # v2: schemas.JobOut.model_validate(job).model_dump()
    d["company_logo_url"] = getattr(owner, "company_logo_url", None)
    d["has_applied"] = has_applied
    return d


@router.get("", response_model=List[schemas.JobOut])
def list_jobs(
    status: Optional[str] = Query("published"),
    owner: Optional[str] = Query(
        None, description='use "me" to restrict to current user'
    ),
    db: Session = Depends(get_db),
    user: Optional[models.User] = Depends(get_current_user_optional),
):
    q = db.query(models.Job)
    if status:
        q = q.filter(models.Job.status == status)
    else:
        q = q.filter(models.Job.status == "published")

    if owner == "me" and user:
        q = q.filter(models.Job.owner_user_id == user.id)

    # sort rules
    if (status or "published") == "published":
        q = q.order_by(models.Job.posted_at.desc(), models.Job.created_at.desc())
    else:
        q = q.order_by(models.Job.created_at.desc())

    jobs = q.options(selectinload(models.Job.owner)).all()  # avoid N+1

    # defensive coercion (you already added these helpers)
    import json

    for j in jobs:
        if isinstance(j.missions, str):
            try:
                j.missions = json.loads(j.missions)
            except:
                j.missions = []
        if isinstance(j.skills, str):
            try:
                j.skills = json.loads(j.skills)
            except:
                j.skills = []

    # Compute has_applied for each job if user is authenticated
    job_ids = [j.id for j in jobs]
    applied_job_ids = set()
    if user:
        applied_job_ids = set(
            db.query(models.Application.job_id)
            .filter(
                models.Application.user_id == user.id,
                models.Application.job_id.in_(job_ids),
            )
            .all()
        )
        applied_job_ids = {row[0] for row in applied_job_ids}

    return [_job_to_out(j, has_applied=j.id in applied_job_ids) for j in jobs]


@router.get("/{job_id}", response_model=schemas.JobOut)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    user: Optional[models.User] = Depends(get_current_user_optional),
):
    job = (
        db.query(models.Job)
        .options(selectinload(models.Job.owner))
        .filter(models.Job.id == job_id)
        .first()
    )
    if not job:
        raise HTTPException(404, "Job not found")

    # Check if user has applied to this job
    has_applied = False
    if user:
        has_applied = (
            db.query(models.Application)
            .filter(
                models.Application.user_id == user.id,
                models.Application.job_id == job_id,
            )
            .first()
            is not None
        )

    return _job_to_out(job, has_applied=has_applied)


@router.post("", response_model=schemas.JobOut)
def create_job(
    payload: schemas.JobCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if not (user.is_admin or getattr(user, "account_type", None) == "company"):
        raise HTTPException(403, "Not allowed")

    # if company fields are missing in the payload, default from user profile
    if not payload.company_name:
        payload.company_name = getattr(user, "company_name", None)
    if not payload.location_city:
        payload.location_city = getattr(user, "location_city", None)
    if not payload.location_country:
        payload.location_country = getattr(user, "location_country", None)
    if not payload.company_logo_url:
        payload.company_logo_url = getattr(user, "company_logo_url", None)

    # IMPORTANT: explicitly map arrays, do NOT rely on server_default for user-provided values
    job = models.Job(
        title=payload.title,
        company_name=payload.company_name,
        company_logo_url=payload.company_logo_url,
        location_city=payload.location_city,
        location_country=payload.location_country,
        experience_min=payload.experience_min,
        employment_type=payload.employment_type,
        work_mode=payload.work_mode,
        salary_min=payload.salary_min,
        salary_max=payload.salary_max,
        salary_currency=payload.salary_currency,
        salary_is_confidential=payload.salary_is_confidential,
        education_level=payload.education_level,
        company_overview=payload.company_overview,
        offer_description=payload.offer_description,
        missions=list(payload.missions or []),  # 👈 ensure arrays are persisted
        profile_requirements=payload.profile_requirements,
        skills=list(payload.skills or []),  # 👈 ensure arrays are persisted
        # description is optional/legacy; if you decided to remove it in FE, it will be None here
        description=payload.description,
        deadline=payload.deadline,
        status=payload.status or "published",
        owner_user_id=user.id,
    )

    # set posted_at only when published
    if job.status == "published":
        job.posted_at = datetime.now(timezone.utc)

    db.add(job)
    db.commit()
    db.refresh(job)

    # Coerce JSON-strings -> Python lists (defensive in case DB driver returns text)
    import json

    if isinstance(job.missions, str):
        try:
            job.missions = json.loads(job.missions)
        except Exception:
            job.missions = []
    if isinstance(job.skills, str):
        try:
            job.skills = json.loads(job.skills)
        except Exception:
            job.skills = []

    # Ensure timestamps exist (some DBs don't materialize server_default until reloads)
    now = datetime.now(timezone.utc)
    if getattr(job, "created_at", None) is None:
        job.created_at = now
    if getattr(job, "updated_at", None) is None:
        job.updated_at = now
    if job.status == "published" and getattr(job, "posted_at", None) is None:
        job.posted_at = now

    return schemas.JobOut.from_orm(job)


@router.patch("/{job_id}/status", response_model=schemas.JobOut)
def update_status(
    job_id: int,
    body: schemas.JobStatusUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    # (Optionally) authorize owner/admin here
    if not (user.is_admin or job.owner_user_id == user.id):
        raise HTTPException(403, "Not allowed")

    new_status = body.status  # "draft" | "published" | "archived"

    # Idempotence: already in this status → return as-is
    if job.status == new_status:
        return _job_to_out(job)

    # Transition rules
    if new_status == "published":
        job.status = "published"
        if job.posted_at is None:
            job.posted_at = func.now()  # set once on first publish
    elif new_status == "archived":
        job.status = "archived"
        # keep posted_at unchanged; updated_at will bump automatically
    elif new_status == "draft":
        job.status = "draft"
    else:
        raise HTTPException(400, "Invalid status")

    db.add(job)
    db.commit()
    db.refresh(job)
    return _job_to_out(job)


@router.patch("/{job_id}", response_model=schemas.JobOut)
def update_job(
    job_id: int,
    payload: schemas.JobUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    job = db.query(models.Job).get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    # company owner or admin
    if not (user.is_admin or job.owner_user_id == user.id):
        raise HTTPException(403, "Not allowed")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(job, k, v)
    db.commit()
    db.refresh(job)
    # Return serialized dict to handle JSONB
    job_dict = {
        "id": job.id,
        "title": job.title,
        "company_name": job.company_name,
        "company_logo_url": job.company_logo_url,
        "location_city": job.location_city,
        "location_country": job.location_country,
        "experience_min": job.experience_min,
        "employment_type": job.employment_type,
        "work_mode": job.work_mode,
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "salary_currency": job.salary_currency,
        "salary_is_confidential": job.salary_is_confidential,
        "education_level": job.education_level,
        "company_overview": job.company_overview,
        "offer_description": job.offer_description,
        "missions": job.missions if isinstance(job.missions, list) else [],
        "profile_requirements": job.profile_requirements,
        "skills": job.skills if isinstance(job.skills, list) else [],
        "description": job.description,
        "deadline": job.deadline,
        "status": job.status,
        "posted_at": job.posted_at,
        "updated_at": job.updated_at,
        "created_at": job.created_at,
        "owner_user_id": job.owner_user_id,
    }
    return job_dict


@router.delete("/{job_id}", status_code=204)
def delete_job(
    job_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    job = db.query(models.Job).get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if not (user.is_admin or job.owner_user_id == user.id):
        raise HTTPException(403, "Not allowed")
    db.delete(job)
    db.commit()
