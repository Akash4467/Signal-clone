from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import AVATAR_COLORS, MessageStatus
from app.models.models import (
    Contact,
    Conversation,
    ConversationMember,
    Message,
    MessageReceipt,
    User,
)

NOW = datetime.now(timezone.utc)

USERS = [
    ("alice", "+15550000001", "Alice Johnson", "Signal is my happy place"),
    ("bob", "+15550000002", "Bob Martinez", "Hey there! I am using Signal."),
    ("carol", "+15550000003", "Carol Chen", "Privacy first 🔒"),
    ("dave", "+15550000004", "Dave Okafor", "Building things"),
    ("erin", "+15550000005", "Erin Park", "Away from keyboard"),
]


def seed(db: Session) -> None:
    if db.scalar(select(User.id).limit(1)) is not None:
        return

    users = []
    for i, (username, phone, display_name, about) in enumerate(USERS):
        user = User(
            username=username,
            phone=phone,
            display_name=display_name,
            about=about,
            avatar_color=AVATAR_COLORS[i * 3 % len(AVATAR_COLORS)],
            is_verified=True,
            last_seen=NOW - timedelta(minutes=5 * (i + 1)),
        )
        db.add(user)
        users.append(user)
    db.flush()
    alice, bob, carol, dave, erin = users

    contact_pairs = [
        (alice, bob), (alice, carol), (alice, dave), (alice, erin),
        (bob, alice), (bob, carol),
        (carol, alice), (carol, bob),
        (dave, alice),
        (erin, alice),
    ]
    for owner, target in contact_pairs:
        db.add(Contact(user_id=owner.id, contact_user_id=target.id))
    db.flush()

    def direct(user_a: User, user_b: User, updated_at: datetime) -> Conversation:
        conversation = Conversation(is_group=False, created_at=updated_at - timedelta(days=2), updated_at=updated_at)
        db.add(conversation)
        db.flush()
        db.add(ConversationMember(conversation_id=conversation.id, user_id=user_a.id))
        db.add(ConversationMember(conversation_id=conversation.id, user_id=user_b.id))
        db.flush()
        return conversation

    def message(conversation: Conversation, sender: User, content: str, minutes_ago: int,
                statuses: dict[int, MessageStatus]) -> Message:
        msg = Message(
            conversation_id=conversation.id,
            sender_id=sender.id,
            content=content,
            created_at=NOW - timedelta(minutes=minutes_ago),
        )
        db.add(msg)
        db.flush()
        for user_id, receipt_status in statuses.items():
            db.add(MessageReceipt(message_id=msg.id, user_id=user_id, status=receipt_status))
        db.flush()
        return msg

    convo_ab = direct(alice, bob, NOW - timedelta(minutes=2))
    message(convo_ab, bob, "Hey Alice! Did you check out that new coffee place?", 45, {alice.id: MessageStatus.READ})
    message(convo_ab, alice, "Not yet! Is it the one on 5th street?", 43, {bob.id: MessageStatus.READ})
    message(convo_ab, bob, "Yeah, their cold brew is incredible", 40, {alice.id: MessageStatus.READ})
    message(convo_ab, alice, "Let's go tomorrow morning?", 38, {bob.id: MessageStatus.READ})
    message(convo_ab, bob, "Perfect, 9am works for me ☕", 2, {alice.id: MessageStatus.DELIVERED})

    convo_ac = direct(alice, carol, NOW - timedelta(minutes=30))
    message(convo_ac, carol, "Did you finish the design review?", 90, {alice.id: MessageStatus.READ})
    message(convo_ac, alice, "Almost done, sending it tonight", 85, {carol.id: MessageStatus.READ})
    message(convo_ac, carol, "No rush! Also — lunch on Friday?", 30, {alice.id: MessageStatus.DELIVERED})

    convo_ad = direct(alice, dave, NOW - timedelta(hours=5))
    message(convo_ad, dave, "The deployment went smoothly 🚀", 300, {alice.id: MessageStatus.READ})
    message(convo_ad, alice, "Great work! Zero downtime?", 295, {dave.id: MessageStatus.READ})
    message(convo_ad, dave, "Zero downtime. Metrics look clean", 290, {alice.id: MessageStatus.READ})

    group = Conversation(
        is_group=True,
        name="Weekend Hikers",
        avatar_color="#26A69A",
        created_at=NOW - timedelta(days=7),
        updated_at=NOW - timedelta(minutes=10),
    )
    db.add(group)
    db.flush()
    db.add(ConversationMember(conversation_id=group.id, user_id=alice.id, is_admin=True))
    for member in (bob, carol, erin):
        db.add(ConversationMember(conversation_id=group.id, user_id=member.id))
    db.flush()

    message(group, alice, "Who's in for the trail this Saturday?", 120,
            {bob.id: MessageStatus.READ, carol.id: MessageStatus.READ, erin.id: MessageStatus.DELIVERED})
    message(group, bob, "Count me in! 🥾", 115,
            {alice.id: MessageStatus.READ, carol.id: MessageStatus.READ, erin.id: MessageStatus.DELIVERED})
    message(group, carol, "Same! Weather looks perfect", 110,
            {alice.id: MessageStatus.READ, bob.id: MessageStatus.READ, erin.id: MessageStatus.DELIVERED})
    message(group, alice, "Meet at the north trailhead, 8am", 10,
            {bob.id: MessageStatus.DELIVERED, carol.id: MessageStatus.SENT, erin.id: MessageStatus.SENT})

    db.commit()
