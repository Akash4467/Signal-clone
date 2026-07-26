from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.contact_repository import ContactRepository
from app.repositories.user_repository import UserRepository
from app.schemas.schemas import ContactOut, UserOut


class ContactService:
    def __init__(self, db: Session):
        self.contacts = ContactRepository(db)
        self.users = UserRepository(db)

    def list_contacts(self, user_id: int) -> list[ContactOut]:
        return [
            ContactOut(id=c.id, user=UserOut.model_validate(c.contact_user), created_at=c.created_at)
            for c in self.contacts.list_for_user(user_id)
        ]

    def add_contact(self, user_id: int, identifier: str) -> ContactOut:
        target = self.users.get_by_identifier(identifier.strip())
        if target is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "No user found with that phone or username")
        if target.id == user_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot add yourself as a contact")
        if self.contacts.exists(user_id, target.id):
            raise HTTPException(status.HTTP_409_CONFLICT, "Contact already exists")
        contact = self.contacts.create(user_id, target.id)
        return ContactOut(id=contact.id, user=UserOut.model_validate(target), created_at=contact.created_at)
