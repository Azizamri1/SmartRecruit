from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..schemas import RegisterIn, TokenOut, LoginIn
from ..utils.security import create_access_token, hash_password, verify_password  # your existing helpers

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register")
def register(body: RegisterIn, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    user = models.User(
        email=body.email,
        hashed_password=hash_password(body.password),
        first_name=body.first_name,
        last_name=body.last_name,
        phone=body.phone,
        date_of_birth=body.date_of_birth,
        account_type=body.account_type,
        company_name=body.company_name,
        sector=body.sector,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email}

@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Identifiants invalides")
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token}
