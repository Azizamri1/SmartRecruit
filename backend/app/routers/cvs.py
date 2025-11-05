# file: backend/app/routers/cvs.py
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .. import models, schemas
from ..deps import get_current_user, get_db

router = APIRouter(prefix="/cvs", tags=["cvs"])


@router.post("", response_model=schemas.CVRead)  # final path: POST /cvs
async def upload_cv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if file is None:
        raise HTTPException(status_code=400, detail="No file provided")
    # 1) validate extension
    dest_dir = Path("uploads") / "cv"
    dest_dir.mkdir(parents=True, exist_ok=True)

    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".pdf", ".docx", ".txt"}:
        raise HTTPException(
            status_code=400, detail="Only PDF, DOCX or TXT files are accepted"
        )

    # 2) deterministic name & path
    out_name = f"{current_user.id}_{uuid4().hex}{suffix}"
    dest_path = dest_dir / out_name

    # 3) async rewind + chunked copy
    await file.seek(0)
    bytes_written = 0
    with dest_path.open("wb") as out:
        while True:
            chunk = await file.read(1024 * 1024)  # 1 MB
            if not chunk:
                break
            out.write(chunk)
            bytes_written += len(chunk)
    await file.close()

    # 4) zero-byte guard
    if bytes_written == 0 or not dest_path.exists() or dest_path.stat().st_size == 0:
        try:
            dest_path.unlink(missing_ok=True)
        except Exception:
            pass
        raise HTTPException(
            status_code=400, detail="Uploaded file is empty or unreadable"
        )

    # 5) normalize for DB
    stored_path = str(dest_path).replace("\\", "/")

    # 6) persist CV
    cv = models.CV(
        user_id=current_user.id,
        file_path=stored_path,
        uploaded_at=datetime.now(timezone.utc),
    )
    db.add(cv)
    db.commit()
    db.refresh(cv)
    return cv


@router.get("/current", response_model=schemas.CVRead)  # final path: GET /cvs/current
async def get_current_cv(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    cv = (
        db.query(models.CV)
        .filter(models.CV.user_id == current_user.id)
        .order_by(models.CV.uploaded_at.desc())
        .first()
    )
    if not cv:
        raise HTTPException(status_code=404, detail="No CV found")
    return cv


@router.get("/{cv_id}/download")  # final path: GET /cvs/{cv_id}/download
async def download_cv(
    cv_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    cv = (
        db.query(models.CV)
        .filter(models.CV.id == cv_id, models.CV.user_id == current_user.id)
        .first()
    )
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
    p = Path(cv.file_path)
    if not p.exists():
        raise HTTPException(status_code=404, detail="File not found")

    # Display inline in the browser
    headers = {"Content-Disposition": f'inline; filename="{p.name}"'}
    return FileResponse(p, media_type="application/pdf", headers=headers)
