from datetime import date
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models.transaction import Transaction
from ..models.user import User
from ..schemas.transaction import BulkConfirm, TransactionOut
from ..services import ocr_service, pdf_service

router = APIRouter(prefix="/upload", tags=["upload"])

OCR_MONTHLY_LIMIT = 50
_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
_ALLOWED_PDF_TYPE = "application/pdf"
_MAX_IMAGE_BYTES = 10 * 1024 * 1024   # 10 MB
_MAX_PDF_BYTES = 50 * 1024 * 1024     # 50 MB


def _maybe_reset_quota(user: User, db: Session) -> None:
    """Reset monthly OCR quota if a new month has started."""
    today = date.today()
    first_of_month = today.replace(day=1)
    if user.ocr_quota_reset_date is None or user.ocr_quota_reset_date < first_of_month:
        user.ocr_quota_used = 0
        user.ocr_quota_reset_date = first_of_month
        db.commit()


@router.post("/slips")
async def upload_slips(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _maybe_reset_quota(current_user, db)

    # Validate content types up-front
    for f in files:
        if f.content_type not in _ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=415,
                detail=f"'{f.filename}' is not a supported image type.",
            )

    remaining = OCR_MONTHLY_LIMIT - current_user.ocr_quota_used
    if remaining <= 0:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="OCR quota exhausted for this month (limit 50 images).",
        )
    if len(files) > remaining:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Batch exceeds remaining OCR quota ({remaining} images left this month).",
        )

    results = []
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
            results.append(result)
            current_user.ocr_quota_used += 1
        except Exception as exc:
            results.append({"filename": f.filename, "error": str(exc), "source": "slip"})
        finally:
            del image_bytes

    db.commit()
    return {"previews": results, "ocr_quota_used": current_user.ocr_quota_used}


@router.post("/pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    password: str = Form(default=""),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
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

    serialisable = [
        {
            **row,
            "date": row["date"].isoformat() if row.get("date") else None,
            "amount": str(row["amount"]) if row.get("amount") else None,
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
    objects = [
        Transaction(**txn.model_dump(), user_id=current_user.id)
        for txn in data.transactions
    ]
    db.add_all(objects)
    db.commit()
    for obj in objects:
        db.refresh(obj)
    return objects
