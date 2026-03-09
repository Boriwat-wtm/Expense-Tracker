from datetime import date, datetime, time
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel

from ..models.transaction import TransactionSource, TransactionType


class TransactionCreate(BaseModel):
    date: date
    transaction_time: Optional[time] = None
    amount: Decimal
    description: Optional[str] = None
    merchant_name: Optional[str] = None
    category: Optional[str] = None
    type: TransactionType
    source: TransactionSource = TransactionSource.manual


class TransactionUpdate(BaseModel):
    date: Optional[date] = None
    transaction_time: Optional[time] = None
    amount: Optional[Decimal] = None
    description: Optional[str] = None
    merchant_name: Optional[str] = None
    category: Optional[str] = None
    type: Optional[TransactionType] = None


class TransactionOut(BaseModel):
    id: UUID
    user_id: UUID
    date: date
    transaction_time: Optional[time]
    amount: Decimal
    description: Optional[str]
    merchant_name: Optional[str]
    category: Optional[str]
    type: TransactionType
    source: TransactionSource
    created_at: datetime

    model_config = {"from_attributes": True}


class TransactionPreview(BaseModel):
    date: Optional[date] = None
    transaction_time: Optional[time] = None
    amount: Optional[Decimal] = None
    description: Optional[str] = None
    merchant_name: Optional[str] = None
    type: Optional[TransactionType] = None
    source: TransactionSource
    filename: Optional[str] = None
    error: Optional[str] = None


class BulkConfirm(BaseModel):
    transactions: List[TransactionCreate]
