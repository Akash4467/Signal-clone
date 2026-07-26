from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.auth.jwt import create_access_token
from app.core.config import settings
from app.core.constants import AVATAR_COLORS
from app.models.models import User
from app.repositories.user_repository import UserRepository
from app.schemas.schemas import AuthResponse, UserOut


class AuthService:
    def __init__(self, db: Session):
        self.users = UserRepository(db)

    def register(self, phone: str, username: str, display_name: str) -> dict:
        if self.users.get_by_phone(phone) is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Phone number already registered")
        if self.users.get_by_username(username) is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Username already taken")
        avatar_color = AVATAR_COLORS[hash(phone) % len(AVATAR_COLORS)]
        self.users.create(phone=phone, username=username, display_name=display_name, avatar_color=avatar_color)
        return {"message": "OTP sent", "otp_hint": settings.mock_otp}

    def login(self, phone: str) -> dict:
        if self.users.get_by_phone(phone) is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "No account found for this phone number")
        return {"message": "OTP sent", "otp_hint": settings.mock_otp}

    def verify_otp(self, phone: str, otp: str) -> AuthResponse:
        user = self.users.get_by_phone(phone)
        if user is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "No account found for this phone number")
        if otp != settings.mock_otp:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid OTP")
        if not user.is_verified:
            self.users.mark_verified(user)
        return AuthResponse(token=create_access_token(user.id), user=UserOut.model_validate(user))

    def update_profile(self, user: User, **fields) -> UserOut:
        updated = self.users.update(user, **fields)
        return UserOut.model_validate(updated)
