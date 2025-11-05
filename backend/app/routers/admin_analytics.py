from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, text
from datetime import date
from ..database import get_db
from ..deps import require_admin
from .. import models

router = APIRouter(prefix="/admin", tags=["admin"])

def _summary(db: Session):
    total_jobs = db.query(models.Job).count()
    open_jobs = db.query(models.Job).filter(or_(models.Job.deadline == None, models.Job.deadline >= date.today())).count()
    # Use text() for raw SQL to avoid column selection issues
    total_apps_result = db.execute(text("SELECT COUNT(*) FROM applications")).scalar()
    total_apps = total_apps_result or 0

    # Get status counts
    status_result = db.execute(text("SELECT status, COUNT(*) as count FROM applications GROUP BY status")).fetchall()
    by_status = {str(s) if s else "unknown": int(c) for s, c in status_result}

    # Get scores
    scores_result = db.execute(text("SELECT score FROM applications WHERE score IS NOT NULL")).fetchall()
    scores = [s[0] for s in scores_result if s[0] is not None]

    hist = None
    if scores:
        import numpy as np
        counts, edges = np.histogram(scores, bins=[0,20,40,60,80,100])
        hist = {"bins": [0,20,40,60,80,100], "counts": counts.tolist()}
    return {"jobs": total_jobs, "open_jobs": open_jobs, "applications": total_apps, "by_status": by_status, "score_histogram": hist}

@router.get("/stats")
def stats(db: Session = Depends(get_db), _=Depends(require_admin)):
    return _summary(db)

@router.get("/analytics/summary")
def analytics_summary(db: Session = Depends(get_db), _=Depends(require_admin)):
    return _summary(db)
