from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.constants import ContentType, MessageStatus
from app.models.models import Message, MessageReaction, MessageReceipt


class MessageRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, message_id: int) -> Message | None:
        return self.db.scalar(
            select(Message)
            .options(
                joinedload(Message.sender),
                joinedload(Message.reply_to).joinedload(Message.sender),
                joinedload(Message.receipts),
                joinedload(Message.reactions),
            )
            .where(Message.id == message_id)
        )

    def get_page(self, conversation_id: int, before_id: int | None, limit: int) -> list[Message]:
        query = (
            select(Message)
            .options(
                joinedload(Message.sender),
                joinedload(Message.reply_to).joinedload(Message.sender),
                joinedload(Message.receipts),
                joinedload(Message.reactions),
            )
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.id.desc())
            .limit(limit)
        )
        if before_id is not None:
            query = query.where(Message.id < before_id)
        messages = list(self.db.scalars(query).unique())
        messages.reverse()
        return messages

    def create(
        self,
        conversation_id: int,
        sender_id: int,
        content: str,
        content_type: ContentType = ContentType.TEXT,
        attachment_url: str | None = None,
        reply_to_id: int | None = None,
    ) -> Message:
        message = Message(
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=content,
            content_type=content_type,
            attachment_url=attachment_url,
            reply_to_id=reply_to_id,
        )
        self.db.add(message)
        self.db.flush()
        return message

    def create_receipts(self, message_id: int, recipient_ids: list[int]) -> None:
        for user_id in recipient_ids:
            self.db.add(MessageReceipt(message_id=message_id, user_id=user_id, status=MessageStatus.SENT))
        self.db.flush()

    def get_receipt(self, message_id: int, user_id: int) -> MessageReceipt | None:
        return self.db.scalar(
            select(MessageReceipt).where(
                MessageReceipt.message_id == message_id, MessageReceipt.user_id == user_id
            )
        )

    def receipts_for_message(self, message_id: int) -> list[MessageReceipt]:
        return list(
            self.db.scalars(select(MessageReceipt).where(MessageReceipt.message_id == message_id))
        )

    def undelivered_for_user(self, user_id: int) -> list[MessageReceipt]:
        return list(
            self.db.scalars(
                select(MessageReceipt)
                .options(joinedload(MessageReceipt.message))
                .where(
                    MessageReceipt.user_id == user_id,
                    MessageReceipt.status == MessageStatus.SENT,
                )
            )
        )

    def unread_in_conversation(self, conversation_id: int, user_id: int) -> list[MessageReceipt]:
        return list(
            self.db.scalars(
                select(MessageReceipt)
                .join(Message, Message.id == MessageReceipt.message_id)
                .where(
                    Message.conversation_id == conversation_id,
                    MessageReceipt.user_id == user_id,
                    MessageReceipt.status != MessageStatus.READ,
                )
            )
        )

    def add_reaction(self, message_id: int, user_id: int, emoji: str) -> MessageReaction | None:
        existing = self.db.scalar(
            select(MessageReaction).where(
                MessageReaction.message_id == message_id,
                MessageReaction.user_id == user_id,
                MessageReaction.emoji == emoji,
            )
        )
        if existing is not None:
            self.db.delete(existing)
            self.db.commit()
            return None
        reaction = MessageReaction(message_id=message_id, user_id=user_id, emoji=emoji)
        self.db.add(reaction)
        self.db.commit()
        return reaction

    def commit(self) -> None:
        self.db.commit()
