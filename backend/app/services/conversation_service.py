from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.constants import AVATAR_COLORS
from app.models.models import Conversation, ConversationMember
from app.repositories.contact_repository import ContactRepository
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.user_repository import UserRepository
from app.schemas.schemas import ConversationOut, ConversationSummary
from app.utils.serializers import serialize_conversation, serialize_summary
from app.websocket.manager import manager


class ConversationService:
    def __init__(self, db: Session):
        self.db = db
        self.conversations = ConversationRepository(db)
        self.contacts = ContactRepository(db)
        self.users = UserRepository(db)

    def _require_member(self, conversation_id: int, user_id: int) -> ConversationMember:
        member = self.conversations.get_member(conversation_id, user_id)
        if member is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of this conversation")
        return member

    def _require_conversation(self, conversation_id: int) -> Conversation:
        conversation = self.conversations.get(conversation_id)
        if conversation is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found")
        return conversation

    def list_for_user(self, user_id: int) -> list[ConversationSummary]:
        conversations = self.conversations.list_for_user(user_id)
        ids = [c.id for c in conversations]
        last_messages = self.conversations.last_messages_by_conversation(ids)
        unread = self.conversations.unread_counts_for_user(user_id, ids)
        return [
            serialize_summary(
                c,
                self.conversations.list_members(c.id),
                user_id,
                last_messages.get(c.id),
                unread.get(c.id, 0),
            )
            for c in conversations
        ]

    def get_detail(self, conversation_id: int, user_id: int) -> ConversationOut:
        conversation = self._require_conversation(conversation_id)
        self._require_member(conversation_id, user_id)
        members = self.conversations.list_members(conversation_id)
        return serialize_conversation(conversation, members, user_id)

    async def get_or_create_direct(self, user_id: int, other_user_id: int) -> ConversationOut:
        if other_user_id == user_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot start a conversation with yourself")
        if self.users.get(other_user_id) is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
        if not self.contacts.exists(user_id, other_user_id):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Add this user as a contact first")

        existing = self.conversations.find_direct_between(user_id, other_user_id)
        if existing is not None:
            members = self.conversations.list_members(existing.id)
            return serialize_conversation(existing, members, user_id)

        conversation = self.conversations.create(is_group=False)
        self.conversations.add_member(conversation.id, user_id)
        self.conversations.add_member(conversation.id, other_user_id)
        self.conversations.commit()

        members = self.conversations.list_members(conversation.id)
        await manager.send_to_user(
            other_user_id,
            {
                "type": "conversation_created",
                "conversation": serialize_conversation(conversation, members, other_user_id).model_dump(mode="json"),
            },
        )
        return serialize_conversation(conversation, members, user_id)

    async def create_group(self, creator_id: int, name: str, member_ids: list[int]) -> ConversationOut:
        unique_ids = [uid for uid in dict.fromkeys(member_ids) if uid != creator_id]
        if not unique_ids:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "A group needs at least one other member")
        for uid in unique_ids:
            if self.users.get(uid) is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, f"User {uid} not found")

        color = AVATAR_COLORS[hash(name) % len(AVATAR_COLORS)]
        conversation = self.conversations.create(is_group=True, name=name, avatar_color=color)
        self.conversations.add_member(conversation.id, creator_id, is_admin=True)
        for uid in unique_ids:
            self.conversations.add_member(conversation.id, uid)
        self.conversations.commit()

        members = self.conversations.list_members(conversation.id)
        for uid in unique_ids:
            await manager.send_to_user(
                uid,
                {
                    "type": "conversation_created",
                    "conversation": serialize_conversation(conversation, members, uid).model_dump(mode="json"),
                },
            )
        return serialize_conversation(conversation, members, creator_id)

    async def add_group_member(self, conversation_id: int, acting_user_id: int, new_user_id: int) -> ConversationOut:
        conversation = self._require_conversation(conversation_id)
        if not conversation.is_group:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Not a group conversation")
        actor = self._require_member(conversation_id, acting_user_id)
        if not actor.is_admin:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Only admins can add members")
        if self.users.get(new_user_id) is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
        if self.conversations.get_member(conversation_id, new_user_id) is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "User is already a member")

        self.conversations.add_member(conversation_id, new_user_id)
        self.conversations.commit()

        members = self.conversations.list_members(conversation_id)
        await manager.send_to_user(
            new_user_id,
            {
                "type": "conversation_created",
                "conversation": serialize_conversation(conversation, members, new_user_id).model_dump(mode="json"),
            },
        )
        await manager.broadcast_to_conversation(
            conversation_id,
            {"type": "members_changed", "conversation_id": conversation_id},
            exclude_user_id=new_user_id,
        )
        return serialize_conversation(conversation, members, acting_user_id)

    async def remove_group_member(self, conversation_id: int, acting_user_id: int, target_user_id: int) -> ConversationOut:
        conversation = self._require_conversation(conversation_id)
        if not conversation.is_group:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Not a group conversation")
        actor = self._require_member(conversation_id, acting_user_id)
        if not actor.is_admin and acting_user_id != target_user_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Only admins can remove members")
        target = self.conversations.get_member(conversation_id, target_user_id)
        if target is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "User is not a member")

        self.conversations.remove_member(target)

        await manager.send_to_user(
            target_user_id, {"type": "removed_from_conversation", "conversation_id": conversation_id}
        )
        await manager.broadcast_to_conversation(
            conversation_id, {"type": "members_changed", "conversation_id": conversation_id}
        )
        members = self.conversations.list_members(conversation_id)
        return serialize_conversation(conversation, members, acting_user_id)
