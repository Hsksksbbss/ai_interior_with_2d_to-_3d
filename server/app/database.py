"""
Database configuration and setup for AI Interior Designer API
Handles SQLAlchemy engine, session management, and database connection
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from typing import Generator

# Database URL Configuration
# For Development: Using SQLite
DATABASE_URL = "sqlite:///./interior_designer.db"

# For Production PostgreSQL: Uncomment and configure
# DATABASE_URL = "postgresql://user:password@localhost:5432/interior_designer_db"

# Create SQLAlchemy Engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    echo=False,  # Set to True to see SQL queries in logs
)

# Create SessionLocal for database sessions
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Create Base class for ORM models
Base = declarative_base()


def get_db() -> Generator:
    """
    Dependency function to get database session for endpoints
    
    Usage in FastAPI endpoints:
        @app.get("/users")
        async def get_users(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database tables
    Call this function when the application starts
    """
    Base.metadata.create_all(bind=engine)
