import logging
import traceback
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..schemas.user import Token, UserLogin, UserOut, UserRegister
from ..services.auth_service import (
    create_access_token,
    hash_password,
    verify_password,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: UserRegister, db: Session = Depends(get_db)):
    try:
        if db.query(User).filter(User.username == data.username).first():
            raise HTTPException(status_code=409, detail="Username already taken")
        if db.query(User).filter(User.email == data.email).first():
            raise HTTPException(status_code=409, detail="Email already registered")

        user = User(
            username=data.username,
            email=data.email,
            password_hash=hash_password(data.password),
            ocr_quota_reset_date=date.today().replace(day=1),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Register failed: %s\n%s", exc, traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Register error: {exc}") from exc


@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )
    token = create_access_token(str(user.id))
    return Token(access_token=token, user=UserOut.model_validate(user))
