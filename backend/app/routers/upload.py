from datetime import date, datetime, timedelta
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models.master_quota import get_or_create_master_quota
from ..models.transaction import Transaction, TransactionSource
from ..models.user import User
from ..schemas.transaction import BulkConfirm, TransactionCreate, TransactionOut
from ..services import ocr_service, pdf_service

router = APIRouter(prefix="/upload", tags=["upload"])

_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
_ALLOWED_PDF_TYPE = "application/pdf"
_MAX_IMAGE_BYTES = 10 * 1024 * 1024   # 10 MB
_MAX_PDF_BYTES = 50 * 1024 * 1024     # 50 MB


def _find_duplicate(
    db: Session, user_id: UUID, txn: TransactionCreate
) -> Optional[Transaction]:
    """
    Look for an existing transaction that matches by date + amount + type.
    If both records have a time, they must be within 60 seconds of each other.
    """
    candidates = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user_id,
            Transaction.date == txn.date,
            Transaction.amount == txn.amount,
            Transaction.type == txn.type,
        )
        .all()
    )
    if not candidates:
        return None

    if txn.transaction_time is None:
        # No time on the incoming record — match on date+amount+type
        return candidates[0]

    for existing in candidates:
        if existing.transaction_time is None:
            # Existing has no time — accept as a match
            return existing
        # Both have a time: require ±1 minute
        dt_new = datetime.combine(txn.date, txn.transaction_time)
        dt_ex = datetime.combine(existing.date, existing.transaction_time)
        if abs((dt_new - dt_ex).total_seconds()) <= 60:
            return existing

    return None


def _reset_user_quota_if_new_month(user: User, db: Session) -> None:
    """Reset per-user monthly counter if a new month has started (for per-user tracking)."""
    today = date.today()
    first_of_month = today.replace(day=1)
    reset_date: Optional[date] = user.ocr_quota_reset_date  # type: ignore[assignment]
    if reset_date is None or reset_date < first_of_month:
        user.ocr_quota_used = 0  # type: ignore[assignment]
        user.ocr_quota_reset_date = first_of_month  # type: ignore[assignment]
        db.flush()


@router.post("/slips")
async def upload_slips(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    # Reset per-user counter if new month
    _reset_user_quota_if_new_month(current_user, db)

    # Validate content types up-front
    for f in files:
        if f.content_type not in _ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=415,
                detail=f"'{f.filename}' is not a supported image type.",
            )

    # ── Master quota check (shared pool across all users) ────────────────────
    master = get_or_create_master_quota(db)
    master_remaining: int = master.quota_limit - master.quota_used  # type: ignore[assignment]

    if master_remaining <= 0:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"โควต้า OCR ของระบบหมดแล้วสำหรับเดือนนี้ "
                f"(ขีดจำกัด {master.quota_limit} รูป/เดือน)"
            ),
        )
    if len(files) > master_remaining:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"จำนวนรูปที่ส่งมา ({len(files)}) เกินโควต้าที่เหลืออยู่ในระบบ "
                f"({master_remaining} รูป)"
            ),
        )

    results: list[dict[str, Any]] = []
    for f in files:
        image_bytes = await f.read()
        try:
            if len(image_bytes) > _MAX_IMAGE_BYTES:
                raise ValueError(f"'{f.filename}' exceeds 10 MB limit.")
            result = ocr_service.extract_from_image(image_bytes)
            result["filename"] = f.filename
            # Convert non-serialisable types
            if result.get("date"):
                result["date"] = result["date"].isoformat()
            if result.get("amount"):
                result["amount"] = str(result["amount"])
            if result.get("transaction_time"):
                result["transaction_time"] = result["transaction_time"].isoformat()
            results.append(result)
            # Deduct 1 from both the user counter and the master pool
            current_user.ocr_quota_used = int(current_user.ocr_quota_used) + 1  # type: ignore[assignment]
            master.quota_used = int(master.quota_used) + 1  # type: ignore[assignment]
        except Exception as exc:
            results.append({"filename": f.filename, "error": str(exc), "source": "slip"})
        finally:
            del image_bytes

    db.commit()
    return {
        "previews": results,
        "user_quota_used": current_user.ocr_quota_used,
        "master_quota_remaining": master.quota_limit - master.quota_used,
    }

@router.post("/pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    password: str = Form(default=""),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    if file.content_type not in (_ALLOWED_PDF_TYPE, "application/octet-stream"):
        raise HTTPException(status_code=415, detail="Only PDF files are accepted.")

    file_bytes = await file.read()
    try:
        if len(file_bytes) > _MAX_PDF_BYTES:
            raise HTTPException(status_code=413, detail="PDF exceeds 50 MB limit.")
        rows = pdf_service.extract_from_pdf(file_bytes, password)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=422, detail=f"Failed to parse PDF: {exc}"
        ) from exc
    finally:
        del file_bytes  # Never retain sensitive financial data

    serialisable: list[dict[str, Any]] = [
        {
            **row,
            "date": row["date"].isoformat() if row.get("date") else None,
            "amount": str(row["amount"]) if row.get("amount") else None,
            "transaction_time": row["transaction_time"].isoformat() if row.get("transaction_time") else None,
        }
        for row in rows
    ]
    return {"previews": serialisable}


@router.post("/confirm", response_model=List[TransactionOut], status_code=201)
def confirm_transactions(
    data: BulkConfirm,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    saved: list[Transaction] = []
    for txn_data in data.transactions:
        dup = _find_duplicate(db, current_user.id, txn_data)
        if dup is not None:
            # — Merge: enrich the existing record with data from the new source —
            if txn_data.merchant_name and not dup.merchant_name:
                dup.merchant_name = txn_data.merchant_name
            if txn_data.transaction_time and not dup.transaction_time:
                dup.transaction_time = txn_data.transaction_time
            if txn_data.description and not dup.description:
                dup.description = txn_data.description
            if txn_data.category and not dup.category:
                dup.category = txn_data.category
            dup.source = TransactionSource.merged
            db.flush()
            saved.append(dup)
        else:
            new_txn = Transaction(**txn_data.model_dump(), user_id=current_user.id)
            db.add(new_txn)
            db.flush()
            saved.append(new_txn)
    db.commit()
    for obj in saved:
        db.refresh(obj)
    return saved
