"""
Pydantic schemas for FastAPI request/response validation
Handles data validation and serialization for API endpoints
"""

from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional


class UserSignup(BaseModel):
    """
    User signup request schema
    Validates user registration data from the frontend
    """
    name: str = Field(..., min_length=2, max_length=255, description="User's full name")
    email: EmailStr = Field(..., description="User's email address (must be valid and unique)")
    password: str = Field(..., min_length=8, max_length=255, description="User's password (minimum 8 characters)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "email": "john@example.com",
                "password": "SecurePassword123!"
            }
        }


class UserLogin(BaseModel):
    """
    User login request schema
    Validates user login credentials
    """
    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., description="User's password")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "john@example.com",
                "password": "SecurePassword123!"
            }
        }


class UserResponse(BaseModel):
    """
    User response schema
    Returns user data (without sensitive information) to the client
    """
    id: int = Field(..., description="User's unique identifier")
    name: str = Field(..., description="User's full name")
    email: EmailStr = Field(..., description="User's email address")
    is_active: bool = Field(..., description="Account status")
    created_at: datetime = Field(..., description="Account creation timestamp")
    updated_at: datetime = Field(..., description="Last account update timestamp")
    
    class Config:
        from_attributes = True  # Allow ORM model conversion
        json_schema_extra = {
            "example": {
                "id": 1,
                "name": "John Doe",
                "email": "john@example.com",
                "is_active": True,
                "created_at": "2026-05-28T10:30:00Z",
                "updated_at": "2026-05-28T10:30:00Z"
            }
        }


class AuthResponse(BaseModel):
    """
    Authentication response schema
    Returns success message and user details after signup/login
    """
    message: str = Field(..., description="Response message")
    user: Optional[UserResponse] = Field(None, description="User details (optional)")
    access_token: Optional[str] = Field(None, description="JWT access token (for login)")
    token_type: Optional[str] = Field("bearer", description="Token type")
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "Account created successfully!",
                "user": {
                    "id": 1,
                    "name": "John Doe",
                    "email": "john@example.com",
                    "is_active": True,
                    "created_at": "2026-05-28T10:30:00Z",
                    "updated_at": "2026-05-28T10:30:00Z"
                },
                "access_token": None,
                "token_type": "bearer"
            }
        }
