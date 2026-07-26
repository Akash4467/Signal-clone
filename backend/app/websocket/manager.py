from fastapi import WebSocket

from app.db.session import SessionLocal
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.user_repository import UserRepository
from app.schemas.schemas import UserOut


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, set[WebSocket]] = {}

    def is_online(self, user_id: int) -> bool:
        return bool(self.active_connections.get(user_id))

    async def connect(self, user_id: int, ws: WebSocket) -> None:
        await ws.accept()
        first_connection = user_id not in self.active_connections or not self.active_connections[user_id]
        self.active_connections.setdefault(user_id, set()).add(ws)
        if first_connection:
            await self._update_presence(user_id, online=True)

    async def disconnect(self, user_id: int, ws: WebSocket) -> None:
        connections = self.active_connections.get(user_id)
        if connections is None:
            return
        connections.discard(ws)
        if not connections:
            del self.active_connections[user_id]
            await self._update_presence(user_id, online=False)

    async def send_to_user(self, user_id: int, event: dict) -> None:
        for ws in list(self.active_connections.get(user_id, set())):
            try:
                await ws.send_json(event)
            except Exception:
                self.active_connections.get(user_id, set()).discard(ws)

    async def broadcast_to_conversation(
        self, conversation_id: int, event: dict, exclude_user_id: int | None = None
    ) -> None:
        with SessionLocal() as db:
            member_ids = ConversationRepository(db).member_ids(conversation_id)
        for user_id in member_ids:
            if user_id != exclude_user_id:
                await self.send_to_user(user_id, event)

    async def _update_presence(self, user_id: int, online: bool) -> None:
        with SessionLocal() as db:
            user = UserRepository(db).set_presence(user_id, online)
            if user is None:
                return
            payload = UserOut.model_validate(user).model_dump(mode="json")
        event = {"type": "presence_update", "user": payload}
        for other_id in list(self.active_connections.keys()):
            if other_id != user_id:
                await self.send_to_user(other_id, event)


manager = ConnectionManager()
