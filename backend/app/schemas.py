import json
from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import (BaseModel, ConfigDict, EmailStr, Field, constr,
                      field_validator, validator)

from .utils.html import sanitize_html


# Auth/Register
class RegisterIn(BaseModel):
    email: str
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    account_type: Optional[str] = None  # "candidate" | "company"
    company_name: Optional[str] = None
    sector: Optional[str] = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Auth/Login
class LoginIn(BaseModel):
    email: str
    password: str


# Users
class UserOut(BaseModel):
    id: int
    email: str
    is_admin: bool
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    account_type: Optional[str] = None
    company_name: Optional[str] = None
    company_logo_url: Optional[str] = None
    company_description: Optional[str] = None
    sector: Optional[str] = None
    location_city: Optional[str] = None
    location_country: Optional[str] = None
    company_website: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    profile_picture_url: Optional[str] = None

    class Config:
        from_attributes = True


Status = Literal["draft", "published", "archived"]


# Jobs
class JobBase(BaseModel):
    title: str
    company_name: Optional[str] = None
    company_logo_url: Optional[str] = None
    location_city: Optional[str] = None
    location_country: Optional[str] = None

    # NEW: single string field
    experience_min: Optional[str] = None

    employment_type: Optional[str] = None
    work_mode: Optional[str] = None

    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: Optional[str] = None
    salary_is_confidential: bool = False

    education_level: Optional[str] = None

    company_overview: Optional[str] = None
    offer_description: Optional[str] = None
    missions: List[str] = Field(default_factory=list)
    profile_requirements: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    description: Optional[str] = None

    deadline: Optional[date] = None
    status: Status = "published"


class JobCreate(JobBase):
    title: constr(min_length=3, max_length=120)
    missions: List[str] = []
    skills: List[str] = []
    status: Literal["draft", "published", "archived"] = "published"
    deadline: Optional[date] = None

    # Optional: coerce empty arrays/whitespace to clean values
    @validator("missions", "skills", pre=True, always=True)
    def ensure_list(cls, v):
        if v is None:
            return []
        if isinstance(v, list):
            return [str(s).strip() for s in v if str(s).strip()]
        return []

    @field_validator("salary_min", "salary_max", mode="before")
    @classmethod
    def normalize_salary(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, str):
            try:
                return int(float(v))
            except (ValueError, TypeError):
                return None
        if isinstance(v, (int, float)):
            return int(v)
        return None

    @field_validator(
        "company_overview", "offer_description", "profile_requirements", mode="before"
    )
    @classmethod
    def _sanitize_html(cls, v):
        return sanitize_html(v)


class JobUpdate(BaseModel):
    # make everything optional in PATCH
    title: Optional[str] = None
    company_name: Optional[str] = None
    company_logo_url: Optional[str] = None
    location_city: Optional[str] = None
    location_country: Optional[str] = None
    experience_min: Optional[str] = None
    employment_type: Optional[str] = None
    work_mode: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: Optional[str] = None
    salary_is_confidential: Optional[bool] = None
    education_level: Optional[str] = None
    company_overview: Optional[str] = None
    offer_description: Optional[str] = None
    missions: Optional[List[str]] = None
    profile_requirements: Optional[str] = None
    skills: Optional[List[str]] = None
    description: Optional[str] = None
    deadline: Optional[date] = None
    status: Optional[Status] = None

    @field_validator("salary_min", "salary_max", mode="before")
    @classmethod
    def normalize_salary(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, str):
            try:
                return int(float(v))
            except (ValueError, TypeError):
                return None
        if isinstance(v, (int, float)):
            return int(v)
        return None

    @field_validator(
        "company_overview", "offer_description", "profile_requirements", mode="before"
    )
    @classmethod
    def _sanitize_html(cls, v):
        return sanitize_html(v)


class JobStatusUpdate(BaseModel):
    status: Literal["draft", "published", "archived"]


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)  # 👈 important for .from_orm

    id: int
    title: str
    company_name: Optional[str] = None
    company_logo_url: Optional[str] = None
    location_city: Optional[str] = None
    location_country: Optional[str] = None

    experience_min: Optional[str] = None
    employment_type: Optional[str] = None
    work_mode: Optional[str] = None

    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: Optional[str] = None
    salary_is_confidential: bool = False

    education_level: Optional[str] = None
    company_overview: Optional[str] = None
    offer_description: Optional[str] = None

    missions: List[str] = []
    profile_requirements: Optional[str] = None
    skills: List[str] = []

    # description (internal notes) may still exist in DB; keep optional for now
    description: Optional[str] = None

    deadline: Optional[date] = None
    status: Literal["draft", "published", "archived"]

    # Make these Optional so Pydantic v2 won't fail when DB hasn’t filled them yet
    posted_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    owner_user_id: int

    # Whether the current user has applied to this job
    has_applied: bool = False

    @field_validator("missions", "skills", mode="before")
    @classmethod
    def _ensure_list(cls, v):
        if v is None:
            return []
        if isinstance(v, list):
            # trim strings & drop empties
            return [str(x).strip() for x in v if str(x).strip()]
        if isinstance(v, str):
            # DB returned JSON as text → parse
            try:
                parsed = json.loads(v)
            except Exception:
                return []
            if isinstance(parsed, list):
                return [str(x).strip() for x in parsed if str(x).strip()]
            return []
        # any other type → safest fallback
        return []


from typing import Literal


# Applications
class ApplicationCreate(BaseModel):
    job_id: int
    cover_letter: Optional[str] = None
    cv_id: Optional[int] = None


class ApplicationOut(BaseModel):
    id: int
    job_id: int
    cover_letter: Optional[str] = None
    cv_id: Optional[int] = None
    status: Literal["pending", "accepted", "rejected"]
    score: Optional[float] = None
    applied_at: datetime

    class Config:
        from_attributes = True


class MyApplicationRead(BaseModel):
    id: int
    job_id: int
    job_title: str
    status: str
    score: Optional[float] = None
    applied_at: datetime


# --- Company profile update ---
class CompanyUpdate(BaseModel):
    company_name: Optional[str] = Field(None, min_length=2, max_length=120)
    sector: Optional[str] = Field(None, min_length=2, max_length=80)
    overview: Optional[str] = Field(None, max_length=4000)
    logo_url: Optional[str] = None  # if you store url; ignore if you only upload files
    location_city: Optional[str] = Field(None, max_length=120)
    location_country: Optional[str] = Field(None, max_length=120)
    company_website: Optional[str] = None  # NEW


# --- Account / security changes ---
class PasswordChangeIn(BaseModel):
    current_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=8)


class EmailChangeIn(BaseModel):
    password: str = Field(..., min_length=6)
    new_email: EmailStr


# --- Candidate profile update ---
class CandidateUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=120)
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    # you can add headline, location fields later


# Company
class CompanyMe(BaseModel):
    company_name: Optional[str] = None
    company_logo_url: Optional[str] = None
    company_description: Optional[str] = None
    sector: Optional[str] = None


class CompanyUpdateIn(BaseModel):
    company_name: Optional[str] = None
    company_description: Optional[str] = None
    sector: Optional[str] = None


class LogoUploadOut(BaseModel):
    company_logo_url: str


# CV
class CVRead(BaseModel):
    id: int
    file_path: str
    uploaded_at: datetime

    class Config:
        from_attributes = True
