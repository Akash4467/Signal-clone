from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.jwt import get_current_user
from app.db.session import get_db
from app.models.models import User
from app.schemas.schemas import MessageCreate, MessageOut, ReactionCreate
from app.services.message_service import MessageService

router = APIRouter(prefix="/messages", tags=["messages"])


@router.post("", response_model=MessageOut, status_code=201)
async def send_message(body: MessageCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await MessageService(db).send_message(
        sender_id=user.id,
        conversation_id=body.conversation_id,
        content=body.content,
        reply_to_id=body.reply_to_id,
    )


@router.post("/{message_id}/delivered", status_code=204)
async def mark_delivered(message_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    await MessageService(db).mark_delivered(message_id, user.id)


@router.post("/{message_id}/reactions", response_model=MessageOut)
async def toggle_reaction(
    message_id: int, body: ReactionCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return await MessageService(db).toggle_reaction(message_id, user.id, body.emoji)
