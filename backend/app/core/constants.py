import enum


class MessageStatus(str, enum.Enum):
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"


class ContentType(str, enum.Enum):
    TEXT = "text"
    IMAGE = "image"


AVATAR_COLORS = [
    "#EF5350", "#EC407A", "#AB47BC", "#7E57C2", "#5C6BC0",
    "#42A5F5", "#29B6F6", "#26A69A", "#66BB6A", "#9CCC65",
    "#FFA726", "#FF7043", "#8D6E63", "#78909C",
]
