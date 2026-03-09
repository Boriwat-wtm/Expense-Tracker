from datetime import date
from typing import Any, Optional
from fastapi import APIRouter, Depends
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models.master_quota import get_or_create_master_quota
from ..models.transaction import Transaction, TransactionType
from ..models.user import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_summary(
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    base_q = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.user_id == current_user.id,
    )
    if month and year:
        base_q = base_q.filter(
            extract("month", Transaction.date) == month,
            extract("year", Transaction.date) == year,
        )

    income = base_q.filter(Transaction.type == TransactionType.income).scalar()
    expense = base_q.filter(Transaction.type == TransactionType.expense).scalar()

    master = get_or_create_master_quota(db)
    db.commit()

    return {
        "total_income": float(income),
        "total_expense": float(expense),
        "balance": float(income) - float(expense),
        "ocr_quota_used": current_user.ocr_quota_used,
        "master_quota_limit": master.quota_limit,
        "master_quota_used": master.quota_used,
        "master_quota_remaining": max(0, master.quota_limit - master.quota_used),
    }


@router.get("/monthly")
def get_monthly(
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    if not year:
        year = date.today().year

    rows = (
        db.query(
            extract("month", Transaction.date).label("month"),
            Transaction.type,
            func.sum(Transaction.amount).label("total"),
        )
        .filter(
            Transaction.user_id == current_user.id,
            extract("year", Transaction.date) == year,
        )
        .group_by("month", Transaction.type)
        .order_by("month")
        .all()
    )

    monthly: dict[int, dict[str, Any]] = {}
    for row in rows:
        m = int(row.month)
        if m not in monthly:
            monthly[m] = {"month": m, "income": 0.0, "expense": 0.0}
        monthly[m][row.type.value] = float(row.total)

    return {"year": year, "data": sorted(monthly.values(), key=lambda x: x["month"])}


@router.get("/recent")
def get_recent(
    month: Optional[int] = None,
    year: Optional[int] = None,
    limit: int = 5,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    q = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if month and year:
        q = q.filter(
            extract("month", Transaction.date) == month,
            extract("year", Transaction.date) == year,
        )
    rows = (
        q.order_by(Transaction.date.desc(), Transaction.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": str(r.id),
            "date": str(r.date),
            "description": r.description,
            "amount": float(r.amount),
            "type": r.type.value,
            "category": r.category,
        }
        for r in rows
    ]


@router.get("/category-breakdown")
def get_category_breakdown(
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    q = (
        db.query(
            Transaction.category,
            func.sum(Transaction.amount).label("total"),
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == TransactionType.expense,
        )
    )
    if month and year:
        q = q.filter(
            extract("month", Transaction.date) == month,
            extract("year", Transaction.date) == year,
        )
    rows = q.group_by(Transaction.category).all()
    return [
        {"category": r.category or "ไม่ระบุ", "total": float(r.total)}
        for r in rows
    ]
