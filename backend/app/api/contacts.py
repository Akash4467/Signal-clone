from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.jwt import get_current_user
from app.db.session import get_db
from app.models.models import User
from app.schemas.schemas import ContactCreate, ContactOut
from app.services.contact_service import ContactService

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("", response_model=list[ContactOut])
def list_contacts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return ContactService(db).list_contacts(user.id)


@router.post("", response_model=ContactOut, status_code=201)
def add_contact(body: ContactCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return ContactService(db).add_contact(user.id, body.identifier)
