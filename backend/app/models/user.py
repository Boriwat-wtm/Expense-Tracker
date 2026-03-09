import enum
import uuid
from datetime import date

from sqlalchemy import Column, Enum, String, Integer, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.user)
    ocr_quota_used = Column(Integer, default=0, nullable=False)
    ocr_quota_reset_date = Column(Date, nullable=True)

    transactions = relationship(
        "Transaction", back_populates="user", cascade="all, delete-orphan"
    )
