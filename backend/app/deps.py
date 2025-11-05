# app/deps.py
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
import os
from dotenv import load_dotenv
from typing import Optional

from app.database import get_db
from app import models
from .core.ratelimit import allow, remaining

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")

# tokenUrl must match your login route
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if sub is None:
            raise credentials_exc
        user_id = int(sub)  # 👈 we store user.id in "sub"
    except Exception:
        raise credentials_exc

    user = db.query(models.User).get(user_id)
    if user is None:
        raise credentials_exc
    return user

def get_current_user_optional(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[models.User]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if sub is None:
            return None
        user_id = int(sub)
        user = db.query(models.User).get(user_id)
        return user
    except Exception:
        return None

def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user

def get_current_admin_user(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Same as require_admin but can be used in contexts that expect the user object"""
    require_admin(current_user)  # This will raise an exception if not admin
    return current_user

def rate_limit(limit: int, window_sec: int, key_prefix: str):
    async def _dep(request: Request):
        ip = request.client.host if request.client else "unknown"
        key = f"{key_prefix}:{ip}"
        if not allow(key, limit, window_sec):
            rem = remaining(key, limit, window_sec)
            raise HTTPException(status_code=429, detail="Too Many Requests")
        return True
    return _dep
