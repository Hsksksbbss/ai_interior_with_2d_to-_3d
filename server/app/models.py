"""
SQLAlchemy ORM models for AI Interior Designer API
Defines database table schemas and relationships
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    """
    User model for storing user account information
    
    Attributes:
        id: Unique user identifier (Primary Key)
        name: User's full name
        email: User's email address (Unique)
        password: Hashed user password
        is_active: Account status flag
        created_at: Timestamp when account was created
        updated_at: Timestamp when account was last updated
    """
    
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self) -> str:
        """String representation of User object"""
        return f"<User(id={self.id}, name='{self.name}', email='{self.email}')>"
