from __future__ import annotations

import os  # ensure these are imported
import shutil
import uuid

from fastapi import (APIRouter, Depends, File, HTTPException, Request,
                     UploadFile)
from sqlalchemy.orm import Session

from .. import models, schemas
from ..deps import get_current_user, get_db

router = APIRouter(prefix="/company", tags=["company"])

UPLOAD_DIR = "uploads/company_logos"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/me", response_model=schemas.UserOut)
def get_company_profile(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    if current_user.account_type != "company":
        raise HTTPException(
            status_code=403, detail="Only company accounts can access this endpoint"
        )
    return current_user


@router.patch("/me", response_model=schemas.UserOut)
def update_company_me(
    payload: schemas.CompanyUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if user.account_type != "company":
        raise HTTPException(403, "Only company accounts can update a company profile")

    if payload.company_name is not None:
        user.company_name = payload.company_name.strip() or None
    if payload.sector is not None:
        user.sector = payload.sector.strip() or None
    if payload.overview is not None:
        # keep consistent: store in company_description
        user.company_description = payload.overview

    if payload.logo_url is not None:
        user.company_logo_url = payload.logo_url or None

    # ✅ persist location + website
    if payload.location_city is not None:
        user.location_city = payload.location_city.strip() or None
    if payload.location_country is not None:
        user.location_country = payload.location_country.strip() or None
    if payload.company_website is not None:
        user.company_website = payload.company_website.strip() or None

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/logo", response_model=schemas.LogoUploadOut)
def upload_company_logo(
    request: Request,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> schemas.LogoUploadOut:
    if current_user.account_type != "company":
        raise HTTPException(
            status_code=403, detail="Only company accounts can access this endpoint"
        )

    allowed_types = {"image/jpeg", "image/png", "image/jpg"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, detail="Only JPEG and PNG images are allowed"
        )

    file_extension = os.path.splitext(file.filename or "")[1].lower()
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Build absolute URL pointing to the static mount
    logo_abs_url = str(request.url_for("company_logos", path=unique_filename))

    current_user.company_logo_url = logo_abs_url
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return schemas.LogoUploadOut(company_logo_url=logo_abs_url)


@router.get("/by-user/{user_id}")
def get_company_by_user_id(user_id: int, db: Session = Depends(get_db)):
    user = (
        db.query(models.User)
        .filter(models.User.id == user_id, models.User.account_type == "company")
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="Company not found")
    return {
        "id": user.id,
        "name": user.company_name or "",
        "logo_url": user.company_logo_url,
        "company_overview": user.company_description or "",
    }
