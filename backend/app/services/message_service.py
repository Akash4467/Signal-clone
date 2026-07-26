from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.constants import MessageStatus
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.message_repository import MessageRepository
from app.schemas.schemas import MessageOut
from app.utils.serializers import serialize_message
from app.websocket.manager import manager


class MessageService:
    def __init__(self, db: Session):
        self.db = db
        self.messages = MessageRepository(db)
        self.conversations = ConversationRepository(db)

    def _require_member(self, conversation_id: int, user_id: int) -> None:
        if self.conversations.get_member(conversation_id, user_id) is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of this conversation")

    def get_history(self, conversation_id: int, user_id: int, before_id: int | None, limit: int) -> list[MessageOut]:
        self._require_member(conversation_id, user_id)
        return [serialize_message(m) for m in self.messages.get_page(conversation_id, before_id, limit)]

    async def send_message(
        self, sender_id: int, conversation_id: int, content: str, reply_to_id: int | None = None
    ) -> MessageOut:
        self._require_member(conversation_id, sender_id)
        if reply_to_id is not None:
            reply_target = self.messages.get(reply_to_id)
            if reply_target is None or reply_target.conversation_id != conversation_id:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid reply target")

        message = self.messages.create(
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=content,
            reply_to_id=reply_to_id,
        )
        recipient_ids = [uid for uid in self.conversations.member_ids(conversation_id) if uid != sender_id]
        self.messages.create_receipts(message.id, recipient_ids)
        self.conversations.touch(conversation_id)
        self.messages.commit()

        message = self.messages.get(message.id)
        payload = serialize_message(message).model_dump(mode="json")
        await manager.broadcast_to_conversation(
            conversation_id, {"type": "new_message", "message": payload}, exclude_user_id=sender_id
        )
        return serialize_message(message)

    async def mark_delivered(self, message_id: int, user_id: int) -> None:
        receipt = self.messages.get_receipt(message_id, user_id)
        if receipt is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "No receipt for this message")
        if receipt.status != MessageStatus.SENT:
            return
        receipt.status = MessageStatus.DELIVERED
        self.messages.commit()
        message = self.messages.get(message_id)
        await manager.send_to_user(
            message.sender_id,
            {
                "type": "message_delivered",
                "message_id": message_id,
                "conversation_id": message.conversation_id,
                "status": serialize_message(message).status,
            },
        )

    async def mark_delivered_bulk(self, user_id: int) -> None:
        receipts = self.messages.undelivered_for_user(user_id)
        if not receipts:
            return
        touched: dict[int, int] = {}
        for receipt in receipts:
            receipt.status = MessageStatus.DELIVERED
            touched[receipt.message_id] = receipt.message.sender_id
        self.messages.commit()
        for message_id, sender_id in touched.items():
            message = self.messages.get(message_id)
            await manager.send_to_user(
                sender_id,
                {
                    "type": "message_delivered",
                    "message_id": message_id,
                    "conversation_id": message.conversation_id,
                    "status": serialize_message(message).status,
                },
            )

    async def mark_conversation_read(self, conversation_id: int, user_id: int) -> None:
        self._require_member(conversation_id, user_id)
        receipts = self.messages.unread_in_conversation(conversation_id, user_id)
        if not receipts:
            return
        message_ids = []
        for receipt in receipts:
            receipt.status = MessageStatus.READ
            message_ids.append(receipt.message_id)
        self.messages.commit()
        await manager.broadcast_to_conversation(
            conversation_id,
            {
                "type": "message_read",
                "conversation_id": conversation_id,
                "message_ids": message_ids,
                "reader_id": user_id,
            },
            exclude_user_id=user_id,
        )

    async def toggle_reaction(self, message_id: int, user_id: int, emoji: str) -> MessageOut:
        message = self.messages.get(message_id)
        if message is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Message not found")
        self._require_member(message.conversation_id, user_id)
        self.messages.add_reaction(message_id, user_id, emoji)
        message = self.messages.get(message_id)
        payload = serialize_message(message).model_dump(mode="json")
        await manager.broadcast_to_conversation(
            message.conversation_id, {"type": "message_updated", "message": payload}
        )
        return serialize_message(message)
