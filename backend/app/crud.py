# app/crud.py
from typing import Iterable, Sequence, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import date

from app import models

# ---------- Users ----------
def get_user_by_email(db: Session, *, email: str) -> models.User | None:
    return db.execute(
        select(models.User).where(models.User.email == email)
    ).scalar_one_or_none()

# ---------- Jobs ----------
def list_jobs(db: Session) -> Sequence[models.Job]:
    return db.execute(select(models.Job)).scalars().all()

def get_job(db: Session, *, job_id: int) -> Optional[models.Job]:
    return db.get(models.Job, job_id)

def create_job(
    db: Session,
    *,
    title: str,
    description: str,
    location: Optional[str],
    duration: Optional[str],
    requirements: Optional[List[str]],
    deadline: Optional[date],
    contract_type: Optional[str],
) -> models.Job:
    obj = models.Job(
        title=title,
        description=description,
        location=location,
        duration=duration,
        requirements=requirements,
        deadline=deadline,
        contract_type=contract_type,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def update_job(
    db: Session,
    *,
    job: models.Job,
    title: str,
    description: str,
    location: Optional[str],
    duration: Optional[str],
    requirements: Optional[List[str]],
    deadline: Optional[date],
    contract_type: Optional[str],
) -> models.Job:
    job.title = title
    job.description = description
    job.location = location
    job.duration = duration
    job.requirements = requirements
    job.deadline = deadline
    job.contract_type = contract_type
    db.commit()
    db.refresh(job)
    return job

def delete_job(db: Session, *, job: models.Job) -> None:
    db.delete(job)
    db.commit()

# ---------- CVs ----------
def create_cv(db: Session, *, owner_id: int, file_path: str) -> models.CV:
    cv = models.CV(owner_id=owner_id, file_path=file_path)
    db.add(cv)
    db.commit()
    db.refresh(cv)
    return cv

def list_user_cvs(db: Session, *, owner_id: int) -> Sequence[models.CV]:
    stmt = select(models.CV).where(models.CV.owner_id == owner_id).order_by(models.CV.uploaded_at.desc())
    return db.execute(stmt).scalars().all()

def get_cv(db: Session, *, cv_id: int) -> models.CV | None:
    return db.get(models.CV, cv_id)

# ---------- Applications ----------
def create_application(
    db: Session,
    *,
    user_id: int,
    job_id: int,
    full_name: str,
    phone_number: str,
    education_level: str,
    years_experience: int,
    linkedin_url: str | None = None,
    cover_letter: str,
    score: float | None = None
) -> models.Application:
    app = models.Application(
        user_id=user_id,
        job_id=job_id,
        full_name=full_name,
        phone_number=phone_number,
        education_level=education_level,
        years_experience=years_experience,
        linkedin_url=linkedin_url,
        cover_letter=cover_letter,
        score=score
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app

def list_user_applications(db: Session, *, user_id: int) -> Sequence[models.Application]:
    stmt = select(models.Application).where(models.Application.user_id == user_id).order_by(models.Application.applied_at.desc())
    return db.execute(stmt).scalars().all()

def list_all_applications(db: Session) -> Sequence[models.Application]:
    stmt = select(models.Application).join(models.User).join(models.Job).order_by(models.Application.applied_at.desc())
    return db.execute(stmt).scalars().all()

def update_application_status_db(db: Session, *, application: models.Application, status: str) -> models.Application:
    application.status = status
    db.commit()
    db.refresh(application)
    return application

def get_application(db: Session, *, application_id: int) -> Optional[models.Application]:
    return db.get(models.Application, application_id)
