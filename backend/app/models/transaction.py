import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Numeric, DateTime, Date, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..database import Base


class TransactionType(str, enum.Enum):
    income = "income"
    expense = "expense"


class TransactionSource(str, enum.Enum):
    slip = "slip"
    pdf = "pdf"
    manual = "manual"


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date = Column(Date, nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    description = Column(String(500), nullable=True)
    type = Column(SAEnum(TransactionType), nullable=False)
    source = Column(
        SAEnum(TransactionSource), nullable=False, default=TransactionSource.manual
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="transactions")
