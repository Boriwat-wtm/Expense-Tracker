from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models.transaction import Transaction, TransactionType
from ..models.user import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

OCR_MONTHLY_LIMIT = 50


@router.get("/summary")
def get_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    income = db.query(
        func.coalesce(func.sum(Transaction.amount), 0)
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == TransactionType.income,
    ).scalar()

    expense = db.query(
        func.coalesce(func.sum(Transaction.amount), 0)
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == TransactionType.expense,
    ).scalar()

    return {
        "total_income": float(income),
        "total_expense": float(expense),
        "balance": float(income) - float(expense),
        "ocr_quota_used": current_user.ocr_quota_used,
        "ocr_quota_limit": OCR_MONTHLY_LIMIT,
        "ocr_quota_remaining": max(0, OCR_MONTHLY_LIMIT - current_user.ocr_quota_used),
    }


@router.get("/monthly")
def get_monthly(
    year: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
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

    monthly: dict[int, dict] = {}
    for row in rows:
        m = int(row.month)
        if m not in monthly:
            monthly[m] = {"month": m, "income": 0.0, "expense": 0.0}
        monthly[m][row.type.value] = float(row.total)

    return {"year": year, "data": sorted(monthly.values(), key=lambda x: x["month"])}
