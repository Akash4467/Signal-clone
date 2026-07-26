from app.core.constants import MessageStatus
from app.models.models import Conversation, ConversationMember, Message, User
from app.schemas.schemas import (
    ConversationOut,
    ConversationSummary,
    MemberOut,
    MessageOut,
    ReactionOut,
    ReplyPreview,
    UserOut,
)

_STATUS_ORDER = {MessageStatus.SENT: 0, MessageStatus.DELIVERED: 1, MessageStatus.READ: 2}


def aggregate_status(message: Message) -> MessageStatus | None:
    if not message.receipts:
        return MessageStatus.SENT
    return min((r.status for r in message.receipts), key=_STATUS_ORDER.get)


def serialize_message(message: Message) -> MessageOut:
    reply = None
    if message.reply_to is not None:
        reply = ReplyPreview(
            id=message.reply_to.id,
            sender_name=message.reply_to.sender.display_name,
            content=message.reply_to.content[:120],
        )
    return MessageOut(
        id=message.id,
        conversation_id=message.conversation_id,
        sender=UserOut.model_validate(message.sender),
        content=message.content,
        content_type=message.content_type,
        attachment_url=message.attachment_url,
        reply_to=reply,
        reactions=[ReactionOut(emoji=r.emoji, user_id=r.user_id) for r in message.reactions],
        status=aggregate_status(message),
        created_at=message.created_at,
    )


def _display_fields(conversation: Conversation, members: list[ConversationMember], viewer_id: int):
    if conversation.is_group:
        return conversation.name or "Group", conversation.avatar_color or "#5C6BC0", None
    other = next((m.user for m in members if m.user_id != viewer_id), None)
    if other is None:
        return "Unknown", "#78909C", None
    return other.display_name, other.avatar_color, UserOut.model_validate(other)


def serialize_conversation(conversation: Conversation, members: list[ConversationMember], viewer_id: int) -> ConversationOut:
    name, color, other = _display_fields(conversation, members, viewer_id)
    return ConversationOut(
        id=conversation.id,
        is_group=conversation.is_group,
        name=name,
        avatar_color=color,
        other_user=other,
        members=[
            MemberOut(user=UserOut.model_validate(m.user), is_admin=m.is_admin, joined_at=m.joined_at)
            for m in members
        ],
        created_at=conversation.created_at,
    )


def serialize_summary(
    conversation: Conversation,
    members: list[ConversationMember],
    viewer_id: int,
    last_message: Message | None,
    unread_count: int,
) -> ConversationSummary:
    name, color, other = _display_fields(conversation, members, viewer_id)
    return ConversationSummary(
        id=conversation.id,
        is_group=conversation.is_group,
        name=name,
        avatar_color=color,
        other_user=other,
        last_message=serialize_message(last_message) if last_message else None,
        unread_count=unread_count,
        updated_at=conversation.updated_at,
    )
