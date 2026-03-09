import enum
import uuid
from datetime import date as dt_date, datetime, time as dt_time
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import Enum as SAEnum, ForeignKey, Numeric, String, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class TransactionType(str, enum.Enum):
    income = "income"
    expense = "expense"


class TransactionSource(str, enum.Enum):
    slip = "slip"
    pdf = "pdf"
    manual = "manual"
    merged = "merged"  # slip reconciled with statement


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date: Mapped[dt_date] = mapped_column(nullable=False)
    transaction_time: Mapped[Optional[dt_time]] = mapped_column(Time, nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    merchant_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    type: Mapped[TransactionType] = mapped_column(SAEnum(TransactionType), nullable=False)
    source: Mapped[TransactionSource] = mapped_column(
        SAEnum(TransactionSource), nullable=False, default=TransactionSource.manual
    )
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="transactions")
