"""
Database configuration and connection management.
Handles SQLAlchemy setup, connection pooling, and session management.
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

# Fall back to local SQLite for development if no URL provided
if not DATABASE_URL:
    import sqlite3
    print("⚠️  No DATABASE_URL found, falling back to local SQLite database")
    DATABASE_URL = "sqlite:///./dev.db"

# Configure database engine with appropriate settings
try:
    if "neon.tech" in DATABASE_URL:
        # Special configuration for Neon hosted PostgreSQL
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            connect_args={
                "sslmode": "require",
                "connect_timeout": 10,
            }
        )
    else:
        # Standard configuration for SQLite or other databases
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            connect_args={} if DATABASE_URL.startswith("sqlite") else {}
        )

    # Test the connection immediately
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
        print("✅ Database connection successful!")

except OperationalError as e:
    print(f"❌ Database connection failed: {e}")
    print("🔄 Falling back to SQLite...")
    DATABASE_URL = "sqlite:///./dev.db"
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        connect_args={}
    )

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all database models
Base = declarative_base()

def get_db():
    """Database session dependency for FastAPI routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
