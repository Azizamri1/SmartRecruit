import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError

load_dotenv()  # load .env

DATABASE_URL = os.getenv("DATABASE_URL")

# Fallback to SQLite for development
if not DATABASE_URL:
    import sqlite3
    print("⚠️  No DATABASE_URL found, falling back to local SQLite database")
    DATABASE_URL = "sqlite:///./dev.db"

# Configure engine with connection pooling and SSL handling
try:
    if "neon.tech" in DATABASE_URL:
        # Neon database with SSL
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            connect_args={
                "sslmode": "require",
                "connect_timeout": 10,
            }
        )
    else:
        # Local SQLite or other databases
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            connect_args={} if DATABASE_URL.startswith("sqlite") else {}
        )

    # Test connection immediately
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

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency for routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
