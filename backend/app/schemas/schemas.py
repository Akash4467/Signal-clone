from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.constants import ContentType, MessageStatus


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    phone: str
    display_name: str
    avatar_color: str
    avatar_url: str | None
    about: str
    online: bool
    last_seen: datetime | None


class UserUpdate(BaseModel):
    display_name: str | None = Field(None, min_length=1, max_length=100)
    about: str | None = Field(None, max_length=200)
    avatar_color: str | None = None


class RegisterRequest(BaseModel):
    phone: str = Field(min_length=6, max_length=20)
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_.]+$")
    display_name: str = Field(min_length=1, max_length=100)


class LoginRequest(BaseModel):
    phone: str


class VerifyOtpRequest(BaseModel):
    phone: str
    otp: str


class AuthResponse(BaseModel):
    token: str
    user: UserOut


class ContactCreate(BaseModel):
    identifier: str


class ContactOut(BaseModel):
    id: int
    user: UserOut
    created_at: datetime


class DirectConversationCreate(BaseModel):
    user_id: int


class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    member_ids: list[int] = Field(min_length=1)


class GroupMemberAdd(BaseModel):
    user_id: int


class MemberOut(BaseModel):
    user: UserOut
    is_admin: bool
    joined_at: datetime


class ReactionOut(BaseModel):
    emoji: str
    user_id: int


class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender: UserOut
    content: str
    content_type: ContentType
    attachment_url: str | None
    reply_to: "ReplyPreview | None"
    reactions: list[ReactionOut]
    status: MessageStatus | None  # aggregate across recipients; None for received messages
    created_at: datetime


class ReplyPreview(BaseModel):
    id: int
    sender_name: str
    content: str


class MessageCreate(BaseModel):
    conversation_id: int
    content: str = Field(min_length=1, max_length=4000)
    reply_to_id: int | None = None


class ReactionCreate(BaseModel):
    emoji: str = Field(min_length=1, max_length=16)


class ConversationSummary(BaseModel):
    id: int
    is_group: bool
    name: str
    avatar_color: str
    other_user: UserOut | None  # set for direct conversations
    last_message: MessageOut | None
    unread_count: int
    updated_at: datetime


class ConversationOut(BaseModel):
    id: int
    is_group: bool
    name: str
    avatar_color: str
    other_user: UserOut | None
    members: list[MemberOut]
    created_at: datetime


MessageOut.model_rebuild()
