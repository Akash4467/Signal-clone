from datetime import datetime, timezone

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.models import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, user_id: int) -> User | None:
        return self.db.get(User, user_id)

    def get_by_phone(self, phone: str) -> User | None:
        return self.db.scalar(select(User).where(User.phone == phone))

    def get_by_username(self, username: str) -> User | None:
        return self.db.scalar(select(User).where(User.username == username))

    def get_by_identifier(self, identifier: str) -> User | None:
        return self.db.scalar(
            select(User).where(or_(User.phone == identifier, User.username == identifier))
        )

    def create(self, phone: str, username: str, display_name: str, avatar_color: str) -> User:
        user = User(phone=phone, username=username, display_name=display_name, avatar_color=avatar_color)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update(self, user: User, **fields) -> User:
        for key, value in fields.items():
            if value is not None:
                setattr(user, key, value)
        self.db.commit()
        self.db.refresh(user)
        return user

    def mark_verified(self, user: User) -> None:
        user.is_verified = True
        self.db.commit()

    def set_presence(self, user_id: int, online: bool) -> User | None:
        user = self.db.get(User, user_id)
        if user is None:
            return None
        user.online = online
        if not online:
            user.last_seen = datetime.now(timezone.utc)
        self.db.commit()
        return user
