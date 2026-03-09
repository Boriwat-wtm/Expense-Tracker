import enum
import uuid
from datetime import date
from typing import Optional
from uuid import UUID

from sqlalchemy import Enum, Integer, String, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False, default=UserRole.user)
    ocr_quota_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    ocr_quota_reset_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    transactions = relationship(
        "Transaction", back_populates="user", cascade="all, delete-orphan"
    )
