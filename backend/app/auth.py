from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from app import models, schemas
from app.database import get_db
from app.utils.security import hash_password, verify_password, create_access_token
from app.deps import rate_limit

router = APIRouter()

@router.post("/register", response_model=schemas.UserRead)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = hash_password(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_pw, full_name=user.full_name)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", dependencies=[Depends(rate_limit(limit=10, window_sec=60, key_prefix="login"))])
def login(form_data: schemas.UserCreate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.email).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token_expires = timedelta(minutes=30)
    token = create_access_token(data={"sub": user.email}, expires_delta=token_expires)
    return {"access_token": token, "token_type": "bearer"}
