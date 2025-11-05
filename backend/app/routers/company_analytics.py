from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import asc, case, desc, func, text
from sqlalchemy.orm import Session

from .. import models
from ..deps import get_current_user, get_db


def _ensure_company_or_admin(user: Any) -> None:
    """
    Allow only company accounts or admins.
    """
    is_admin = bool(getattr(user, "is_admin", False))
    account_type = getattr(user, "account_type", None)
    if not (is_admin or account_type == "company"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company users or admins can access this endpoint.",
        )


router = APIRouter(prefix="/company/analytics", tags=["company-analytics"])


@router.get("/summary")
def company_summary(db: Session = Depends(get_db), user=Depends(get_current_user)):
    _ensure_company_or_admin(user)
    owner_id = None if getattr(user, "is_admin", False) else user.id

    jobs_q = db.query(func.count(models.Job.id))
    open_jobs_q = db.query(func.count(models.Job.id)).filter(
        models.Job.status == "published"
    )
    apps_q = (
        db.query(func.count(models.Application.id))
        .select_from(models.Application)
        .join(models.Job, models.Job.id == models.Application.job_id)
    )
    if owner_id:
        jobs_q = jobs_q.filter(models.Job.owner_user_id == owner_id)
        open_jobs_q = open_jobs_q.filter(models.Job.owner_user_id == owner_id)
        apps_q = apps_q.filter(models.Job.owner_user_id == owner_id)

    jobs = jobs_q.scalar() or 0
    open_jobs = open_jobs_q.scalar() or 0
    applications = apps_q.scalar() or 0

    avg_score_q = (
        db.query(func.avg(models.Application.score))
        .select_from(models.Application)
        .join(models.Job, models.Job.id == models.Application.job_id)
    )
    if owner_id:
        avg_score_q = avg_score_q.filter(models.Job.owner_user_id == owner_id)
    avg_score = avg_score_q.scalar()
    avg_score = float(avg_score) if avg_score is not None else None

    by_status_q = (
        db.query(models.Application.status, func.count(models.Application.id))
        .select_from(models.Application)
        .join(models.Job, models.Job.id == models.Application.job_id)
        .group_by(models.Application.status)
    )
    if owner_id:
        by_status_q = by_status_q.filter(models.Job.owner_user_id == owner_id)
    by_status = {k or "unknown": int(v) for k, v in by_status_q.all()}

    recent_q = (
        db.query(
            models.Application.id,
            models.Application.job_id,
            models.Job.title.label("job_title"),
            models.Application.applied_at,
            models.Application.score,
            models.Application.status,
        )
        .join(models.Job, models.Job.id == models.Application.job_id)
        .order_by(models.Application.applied_at.desc().nullslast())
        .limit(5)
    )
    if owner_id:
        recent_q = recent_q.filter(models.Job.owner_user_id == owner_id)
    recent_apps = [
        dict(
            id=r.id,
            job_id=r.job_id,
            job_title=r.job_title,
            applied_at=r.applied_at,
            score=r.score,
            status=r.status,
        )
        for r in recent_q.all()
    ]

    top_q = (
        db.query(
            models.Application.job_id,
            models.Job.title,
            func.count(models.Application.id).label("apps"),
        )
        .join(models.Job, models.Job.id == models.Application.job_id)
        .group_by(models.Application.job_id, models.Job.title)
        .order_by(func.count(models.Application.id).desc())
        .limit(5)
    )
    if owner_id:
        top_q = top_q.filter(models.Job.owner_user_id == owner_id)
    top_jobs = [
        {"job_id": r.job_id, "title": r.title, "applications": int(r.apps)}
        for r in top_q.all()
    ]

    scope_sql = ""
    params = {}
    if owner_id:
        scope_sql = "JOIN jobs j ON j.id = a.job_id AND j.owner_user_id = :owner_id"
        params["owner_id"] = owner_id

    trend_rows = (
        db.execute(
            text(
                f"""
        WITH series AS (
          SELECT (generate_series(current_date - interval '29 days', current_date, interval '1 day'))::date AS d
        )
        SELECT s.d::text AS date, COALESCE(COUNT(a.id), 0) AS applications
        FROM series s
        LEFT JOIN applications a
          ON date_trunc('day', a.applied_at) = s.d
        {scope_sql}
        GROUP BY s.d
        ORDER BY s.d
        """
            ),
            params,
        )
        .mappings()
        .all()
    )
    trend_30d = [
        {"date": r["date"], "applications": int(r["applications"])} for r in trend_rows
    ]

    bin_expr = case(
        (models.Application.score < 20, 0),
        (models.Application.score < 40, 20),
        (models.Application.score < 60, 40),
        (models.Application.score < 80, 60),
        else_=80,
    ).label("bin")
    hist_q = (
        db.query(bin_expr, func.count(models.Application.id))
        .select_from(models.Application)
        .join(models.Job, models.Job.id == models.Application.job_id)
        .filter(models.Application.score.isnot(None))
        .group_by("bin")
    )
    if owner_id:
        hist_q = hist_q.filter(models.Job.owner_user_id == owner_id)
    hist_rows = hist_q.all()
    bins = [0, 20, 40, 60, 80, 100]
    counts_map = {b: 0 for b in bins[:-1]}
    for b, c in hist_rows:
        counts_map[int(b)] = int(c)
    score_histogram = {"bins": bins, "counts": [counts_map[b] for b in bins[:-1]] + [0]}

    return {
        "jobs": int(jobs),
        "open_jobs": int(open_jobs),
        "applications": int(applications),
        "by_status": by_status,
        "avg_score": avg_score,
        "recent_applications": recent_apps,
        "top_jobs_by_apps": top_jobs,
        "trend_30d": trend_30d,
        "score_histogram": score_histogram,
    }


@router.get("/jobs")
def company_jobs(db: Session = Depends(get_db), user=Depends(get_current_user)):
    _ensure_company_or_admin(user)
    # For admins, show all jobs; for companies, only their own
    q = db.query(
        models.Job.id,
        models.Job.title,
        models.Job.status,
        models.Job.deadline,
        func.count(models.Application.id).label("apps"),
    ).outerjoin(models.Application, models.Application.job_id == models.Job.id)

    if not getattr(user, "is_admin", False):
        q = q.filter(models.Job.owner_user_id == user.id)

    q = q.group_by(
        models.Job.id, models.Job.title, models.Job.status, models.Job.deadline
    ).order_by(models.Job.posted_at.desc())

    rows = q.all()
    return [
        {
            "id": r[0],
            "title": r[1],
            "status": r[2],
            "deadline": r[3],
            "applications": int(r[4] or 0),
        }
        for r in rows
    ]


SORT_MAP = {
    "score_desc": (desc(models.Application.score), desc(models.Application.applied_at)),
    "date_desc": (desc(models.Application.applied_at),),
    "date_asc": (asc(models.Application.applied_at),),
}


@router.get("/jobs/{job_id}/applications")
def company_job_apps(
    job_id: int,
    sort: str = "score_desc",
    status: str | None = None,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ensure_company_or_admin(user)

    # permission: if not admin, ensure this job belongs to the company user
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if not user.is_admin and job.owner_user_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden.")

    A = models.Application
    J = models.Job
    U = models.User

    q = (
        db.query(
            A.id,
            A.job_id,
            A.status,
            A.score,
            A.applied_at,
            A.cv_id,
            J.title.label("job_title"),
            U.email.label("candidate_email"),
        )
        .join(J, J.id == A.job_id)
        .join(U, U.id == A.user_id)
        .filter(A.job_id == job_id)
    )

    if status in {"pending", "accepted", "rejected"}:
        q = q.filter(A.status == status)

    q = q.order_by(*SORT_MAP.get(sort, SORT_MAP["score_desc"]))

    rows = q.all()
    # shape to the frontend's expected keys
    return [
        {
            "id": r[0],
            "job_id": r[1],
            "job_title": r[6],
            "status": r[2],
            "score": r[3],
            "applied_at": r[4].isoformat() if r[4] else None,
            "cv_id": r[5],
            "candidate_email": r[7],
        }
        for r in rows
    ]
