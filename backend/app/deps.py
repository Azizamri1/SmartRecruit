"""
FastAPI dependency functions for authentication, authorization, and rate limiting.
Provides reusable dependencies for route protection and user management.
"""

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt
import os
from dotenv import load_dotenv
from typing import Optional

from .database import get_db
from . import models
from .core.ratelimit import allow, remaining

# Load environment variables
load_dotenv()

# JWT configuration
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """Extract and validate the current user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except Exception:
        raise credentials_exception

    user = db.query(models.User).get(user_id)
    if user is None:
        raise credentials_exception

    return user

def get_current_user_optional(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[models.User]:
    """Get current user if token is valid, otherwise return None."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str = payload.get("sub")
        if user_id_str is None:
            return None
        user_id = int(user_id_str)
        user = db.query(models.User).get(user_id)
        return user
    except Exception:
        return None

def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Require admin privileges for the current user."""
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user

def get_current_admin_user(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Get current user only if they have admin privileges."""
    require_admin(current_user)  # Will raise exception if not admin
    return current_user

def rate_limit(limit: int, window_sec: int, key_prefix: str):
    """
    Rate limiting dependency based on IP address.

    Args:
        limit: Maximum requests allowed
        window_sec: Time window in seconds
        key_prefix: Unique prefix for this rate limit

    Returns:
        Dependency function that raises 429 if limit exceeded
    """
    async def _rate_limit_dependency(request: Request):
        client_ip = request.client.host if request.client else "unknown"
        cache_key = f"{key_prefix}:{client_ip}"

        if not allow(cache_key, limit, window_sec):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too Many Requests"
            )
        return True

    return _rate_limit_dependency
