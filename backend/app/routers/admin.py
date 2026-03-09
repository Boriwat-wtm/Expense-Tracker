from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_admin
from ..models.master_quota import MasterQuota, get_or_create_master_quota
from ..models.user import User, UserRole
from ..schemas.user import UserOut

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[UserOut])
def list_users(
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all registered users."""
    return db.query(User).order_by(User.username).all()


@router.patch("/users/{user_id}/role", response_model=UserOut)
def change_user_role(
    user_id: str,
    role: UserRole,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Promote or demote a user's role."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.role = role
    db.commit()
    db.refresh(user)
    return user


@router.get("/quota")
def get_master_quota(
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get current master OCR quota status."""
    master = get_or_create_master_quota(db)
    db.commit()
    return {
        "quota_limit": master.quota_limit,
        "quota_used": master.quota_used,
        "quota_remaining": max(0, master.quota_limit - master.quota_used),
        "reset_date": master.reset_date,
    }


@router.post("/quota/reset")
def reset_master_quota(
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Manually reset the master OCR quota to 0 used."""
    master = db.query(MasterQuota).filter(MasterQuota.id == 1).with_for_update().first()
    if not master:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Master quota not found")
    master.quota_used = 0
    master.reset_date = date.today()
    db.commit()
    return {"message": "Master quota reset successfully", "quota_used": 0, "reset_date": master.reset_date}
