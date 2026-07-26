from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.models import Contact


class ContactRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_for_user(self, user_id: int) -> list[Contact]:
        return list(
            self.db.scalars(
                select(Contact)
                .options(joinedload(Contact.contact_user))
                .where(Contact.user_id == user_id)
            )
        )

    def exists(self, user_id: int, contact_user_id: int) -> bool:
        return (
            self.db.scalar(
                select(Contact.id).where(
                    Contact.user_id == user_id, Contact.contact_user_id == contact_user_id
                )
            )
            is not None
        )

    def create(self, user_id: int, contact_user_id: int) -> Contact:
        contact = Contact(user_id=user_id, contact_user_id=contact_user_id)
        self.db.add(contact)
        self.db.commit()
        self.db.refresh(contact)
        return contact
