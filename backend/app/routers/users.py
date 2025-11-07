from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import get_current_user
from .. import schemas, models
from ..utils.security import verify_password, hash_password
import os, uuid, shutil

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=schemas.UserOut)
def me(user = Depends(get_current_user)):
    return user

@router.post("/me/change-password")
def change_password(body: schemas.PasswordChangeIn, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if verify_password(body.new_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="New password must be different")
    user.hashed_password = hash_password(body.new_password)
    db.add(user); db.commit()
    return {"status": "ok"}

@router.post("/me/change-email")
def change_email(body: schemas.EmailChangeIn, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Password is incorrect")
    # enforce uniqueness
    exists = db.query(models.User).filter(models.User.email == body.new_email, models.User.id != user.id).first()
    if exists:
        raise HTTPException(status_code=400, detail="Email already in use")
    user.email = body.new_email
    db.add(user); db.commit(); db.refresh(user)
    # (Optional) send a confirmation email; your async mailer exists already
    return {"status": "ok", "email": user.email}

@router.patch("/me", response_model=schemas.UserOut)
def update_me(
    payload: schemas.CandidateUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    # Candidate & company both allowed; we only set candidate-relevant bits here
    if payload.full_name is not None:
        user.full_name = payload.full_name.strip() or None
    if payload.linkedin_url is not None:
        user.linkedin_url = payload.linkedin_url.strip() or None
    if payload.github_url is not None:
        user.github_url = payload.github_url.strip() or None

    db.add(user); db.commit(); db.refresh(user)
    return user

AVATAR_DIR = "uploads/avatars"
os.makedirs(AVATAR_DIR, exist_ok=True)

@router.post("/me/avatar", response_model=dict)
def upload_avatar(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    allowed_types = {"image/jpeg", "image/png", "image/jpg", "image/webp", "image/svg+xml"}
    if file.content_type not in allowed_types:
        raise HTTPException(400, "Only image files are allowed")
    ext = os.path.splitext(file.filename or "")[1].lower()
    fname = f"{uuid.uuid4()}{ext}"
    dest = os.path.join(AVATAR_DIR, fname)
    with open(dest, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    avatar_url = str(request.url_for("avatars", path=fname))  # requires mount in main.py
    user.profile_picture_url = avatar_url
    db.add(user); db.commit(); db.refresh(user)
    return {"profile_picture_url": avatar_url}
