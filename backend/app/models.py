from sqlalchemy import Column, Integer, String, Text, Boolean, Date, DateTime, ForeignKey, Float, text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    date_of_birth = Column(Date, nullable=True)
    account_type = Column(String, nullable=True)   # "candidate" | "company"
    company_name = Column(String, nullable=True)
    company_logo_url = Column(Text, nullable=True)
    company_description = Column(Text, nullable=True)
    sector = Column(String, nullable=True)
    company_website = Column(Text, nullable=True)  # NEW

    # NEW: persist company location on the user (company) profile
    location_city = Column(String(120), nullable=True)
    location_country = Column(String(120), nullable=True)
    linkedin_url = Column(Text, nullable=True)
    github_url = Column(Text, nullable=True)
    profile_picture_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True))

    applications = relationship("Application", back_populates="user", cascade="all,delete")
    cvs = relationship("CV", back_populates="user", cascade="all,delete")

class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(Text, nullable=False)

    company_name = Column(Text, nullable=True)
    company_logo_url = Column(Text, nullable=True)

    location_city = Column(Text, nullable=True)
    location_country = Column(Text, nullable=True)

    # NEW: single string field
    experience_min = Column(Text, nullable=True)

    employment_type = Column(Text, nullable=True)
    work_mode = Column(Text, nullable=True)

    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)
    salary_currency = Column(Text, nullable=True)
    salary_is_confidential = Column(Boolean, nullable=False, server_default="false")

    education_level = Column(Text, nullable=True)

    company_overview = Column(Text, nullable=True)
    offer_description = Column(Text, nullable=True)
    missions = Column(
        JSONB(astext_type=Text()),  # ensures ORM returns Python types
        nullable=False,
        server_default=text("'[]'::jsonb")
    )
    profile_requirements = Column(Text, nullable=True)
    skills = Column(
        JSONB(astext_type=Text()),
        nullable=False,
        server_default=text("'[]'::jsonb")
    )

    description = Column(Text, nullable=True)
    deadline = Column(Date, nullable=True)

    # status: draft | published | archived
    status = Column(Text, nullable=False, server_default="published")

    posted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text('now()'))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text('now()'), onupdate=text('now()'))

    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    owner = relationship("User", foreign_keys=[owner_user_id])

    applications = relationship("Application", back_populates="job", cascade="all,delete")

class Application(Base):
    __tablename__ = "applications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    cover_letter = Column(Text, nullable=True)
    cv_id = Column(Integer, ForeignKey("cvs.id"), nullable=False)
    status = Column(String, nullable=False, default="pending")
    score = Column(Float, nullable=True)
    applied_at = Column(DateTime(timezone=True), server_default=text('now()'))

    user = relationship("User", back_populates="applications")
    job = relationship("Job", back_populates="applications")

    # Unique constraint to prevent duplicate applications per user-job pair
    __table_args__ = (
        UniqueConstraint('user_id', 'job_id', name='unique_user_job_application'),
    )

class CV(Base):
    __tablename__ = "cvs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String, nullable=False)
    uploaded_at = Column(DateTime(timezone=True))

    user = relationship("User", back_populates="cvs")
