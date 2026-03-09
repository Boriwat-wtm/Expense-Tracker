from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel

from ..models.transaction import TransactionSource, TransactionType


class TransactionCreate(BaseModel):
    date: date
    amount: Decimal
    description: Optional[str] = None
    type: TransactionType
    source: TransactionSource = TransactionSource.manual


class TransactionUpdate(BaseModel):
    date: Optional[date] = None
    amount: Optional[Decimal] = None
    description: Optional[str] = None
    type: Optional[TransactionType] = None


class TransactionOut(BaseModel):
    id: UUID
    user_id: UUID
    date: date
    amount: Decimal
    description: Optional[str]
    type: TransactionType
    source: TransactionSource
    created_at: datetime

    model_config = {"from_attributes": True}


class TransactionPreview(BaseModel):
    date: Optional[date] = None
    amount: Optional[Decimal] = None
    description: Optional[str] = None
    type: Optional[TransactionType] = None
    source: TransactionSource
    filename: Optional[str] = None
    error: Optional[str] = None


class BulkConfirm(BaseModel):
    transactions: List[TransactionCreate]
