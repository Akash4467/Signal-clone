from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.jwt import get_current_user
from app.db.session import get_db
from app.models.models import User
from app.schemas.schemas import (
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    UserOut,
    UserUpdate,
    VerifyOtpRequest,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    return AuthService(db).register(body.phone, body.username, body.display_name)


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    return AuthService(db).login(body.phone)


@router.post("/verify-otp", response_model=AuthResponse)
def verify_otp(body: VerifyOtpRequest, db: Session = Depends(get_db)):
    return AuthService(db).verify_otp(body.phone, body.otp)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(body: UserUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return AuthService(db).update_profile(user, **body.model_dump(exclude_unset=True))
