from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.constants import MessageStatus
from app.models.models import Conversation, ConversationMember, Message, MessageReceipt


class ConversationRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, conversation_id: int) -> Conversation | None:
        return self.db.get(Conversation, conversation_id)

    def get_member(self, conversation_id: int, user_id: int) -> ConversationMember | None:
        return self.db.scalar(
            select(ConversationMember).where(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == user_id,
            )
        )

    def list_members(self, conversation_id: int) -> list[ConversationMember]:
        return list(
            self.db.scalars(
                select(ConversationMember)
                .options(joinedload(ConversationMember.user))
                .where(ConversationMember.conversation_id == conversation_id)
                .order_by(ConversationMember.joined_at)
            )
        )

    def member_ids(self, conversation_id: int) -> list[int]:
        return list(
            self.db.scalars(
                select(ConversationMember.user_id).where(
                    ConversationMember.conversation_id == conversation_id
                )
            )
        )

    def create(self, is_group: bool, name: str | None = None, avatar_color: str | None = None) -> Conversation:
        conversation = Conversation(is_group=is_group, name=name, avatar_color=avatar_color)
        self.db.add(conversation)
        self.db.flush()
        return conversation

    def add_member(self, conversation_id: int, user_id: int, is_admin: bool = False) -> ConversationMember:
        member = ConversationMember(conversation_id=conversation_id, user_id=user_id, is_admin=is_admin)
        self.db.add(member)
        self.db.flush()
        return member

    def remove_member(self, member: ConversationMember) -> None:
        self.db.delete(member)
        self.db.commit()

    def find_direct_between(self, user_a_id: int, user_b_id: int) -> Conversation | None:
        a = select(ConversationMember.conversation_id).where(ConversationMember.user_id == user_a_id)
        b = select(ConversationMember.conversation_id).where(ConversationMember.user_id == user_b_id)
        return self.db.scalar(
            select(Conversation).where(
                Conversation.is_group.is_(False),
                Conversation.id.in_(a),
                Conversation.id.in_(b),
            )
        )

    def list_ids_for_user(self, user_id: int) -> list[int]:
        return list(
            self.db.scalars(
                select(ConversationMember.conversation_id).where(ConversationMember.user_id == user_id)
            )
        )

    def list_for_user(self, user_id: int) -> list[Conversation]:
        return list(
            self.db.scalars(
                select(Conversation)
                .join(ConversationMember, ConversationMember.conversation_id == Conversation.id)
                .where(ConversationMember.user_id == user_id)
                .order_by(Conversation.updated_at.desc())
            )
        )

    def last_messages_by_conversation(self, conversation_ids: list[int]) -> dict[int, Message]:
        if not conversation_ids:
            return {}
        latest = (
            select(Message.conversation_id, func.max(Message.id).label("max_id"))
            .where(Message.conversation_id.in_(conversation_ids))
            .group_by(Message.conversation_id)
            .subquery()
        )
        messages = self.db.scalars(
            select(Message)
            .options(joinedload(Message.sender))
            .join(latest, Message.id == latest.c.max_id)
        )
        return {m.conversation_id: m for m in messages}

    def unread_counts_for_user(self, user_id: int, conversation_ids: list[int]) -> dict[int, int]:
        if not conversation_ids:
            return {}
        rows = self.db.execute(
            select(Message.conversation_id, func.count(MessageReceipt.id))
            .join(MessageReceipt, MessageReceipt.message_id == Message.id)
            .where(
                Message.conversation_id.in_(conversation_ids),
                MessageReceipt.user_id == user_id,
                MessageReceipt.status != MessageStatus.READ,
            )
            .group_by(Message.conversation_id)
        ).all()
        return {conversation_id: count for conversation_id, count in rows}

    def touch(self, conversation_id: int) -> None:
        conversation = self.db.get(Conversation, conversation_id)
        if conversation is not None:
            conversation.updated_at = datetime.now(timezone.utc)
            self.db.flush()

    def commit(self) -> None:
        self.db.commit()
