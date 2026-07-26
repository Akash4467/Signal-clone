from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.jwt import get_current_user
from app.db.session import get_db
from app.models.models import User
from app.schemas.schemas import (
    ConversationOut,
    ConversationSummary,
    DirectConversationCreate,
    MessageOut,
)
from app.services.conversation_service import ConversationService
from app.services.message_service import MessageService

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=list[ConversationSummary])
def list_conversations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return ConversationService(db).list_for_user(user.id)


@router.post("", response_model=ConversationOut, status_code=201)
async def create_direct(
    body: DirectConversationCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return await ConversationService(db).get_or_create_direct(user.id, body.user_id)


@router.get("/{conversation_id}", response_model=ConversationOut)
def get_conversation(conversation_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return ConversationService(db).get_detail(conversation_id, user.id)


@router.get("/{conversation_id}/messages", response_model=list[MessageOut])
def get_messages(
    conversation_id: int,
    before_id: int | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return MessageService(db).get_history(conversation_id, user.id, before_id, limit)


@router.post("/{conversation_id}/read", status_code=204)
async def mark_read(conversation_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    await MessageService(db).mark_conversation_read(conversation_id, user.id)
