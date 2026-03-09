from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models.transaction import Transaction, TransactionSource, TransactionType
from ..models.user import User
from ..schemas.transaction import TransactionCreate, TransactionOut, TransactionUpdate

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=List[TransactionOut])
def list_transactions(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    type: Optional[TransactionType] = None,
    source: Optional[TransactionSource] = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if start_date:
        q = q.filter(Transaction.date >= start_date)
    if end_date:
        q = q.filter(Transaction.date <= end_date)
    if type:
        q = q.filter(Transaction.type == type)
    if source:
        q = q.filter(Transaction.source == source)
    return q.order_by(Transaction.date.desc()).offset(skip).limit(limit).all()


@router.post("", response_model=TransactionOut, status_code=201)
def create_transaction(
    data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    txn = Transaction(**data.model_dump(), user_id=current_user.id)
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn


@router.put("/{txn_id}", response_model=TransactionOut)
def update_transaction(
    txn_id: UUID,
    data: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    txn = (
        db.query(Transaction)
        .filter(Transaction.id == txn_id, Transaction.user_id == current_user.id)
        .first()
    )
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(txn, field, value)
    db.commit()
    db.refresh(txn)
    return txn


@router.delete("/{txn_id}", status_code=204)
def delete_transaction(
    txn_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    txn = (
        db.query(Transaction)
        .filter(Transaction.id == txn_id, Transaction.user_id == current_user.id)
        .first()
    )
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(txn)
    db.commit()
