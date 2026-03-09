from datetime import date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr

from ..models.user import UserRole


class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: UUID
    username: str
    email: str
    role: UserRole
    ocr_quota_used: int
    ocr_quota_reset_date: Optional[date]

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
