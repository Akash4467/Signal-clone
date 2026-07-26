from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.jwt import get_current_user
from app.db.session import get_db
from app.models.models import User
from app.schemas.schemas import ConversationOut, GroupCreate, GroupMemberAdd
from app.services.conversation_service import ConversationService

router = APIRouter(prefix="/groups", tags=["groups"])


@router.post("", response_model=ConversationOut, status_code=201)
async def create_group(body: GroupCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await ConversationService(db).create_group(user.id, body.name, body.member_ids)


@router.post("/{conversation_id}/members", response_model=ConversationOut)
async def add_member(
    conversation_id: int, body: GroupMemberAdd, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return await ConversationService(db).add_group_member(conversation_id, user.id, body.user_id)


@router.delete("/{conversation_id}/members/{user_id}", response_model=ConversationOut)
async def remove_member(
    conversation_id: int, user_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return await ConversationService(db).remove_group_member(conversation_id, user.id, user_id)
