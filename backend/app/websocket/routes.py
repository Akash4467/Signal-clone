from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.auth.jwt import decode_token
from app.db.session import SessionLocal
from app.services.message_service import MessageService
from app.websocket.manager import manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str = Query(...)):
    try:
        user_id = decode_token(token)
    except Exception:
        await ws.close(code=4401)
        return

    await manager.connect(user_id, ws)

    with SessionLocal() as db:
        await MessageService(db).mark_delivered_bulk(user_id)

    try:
        while True:
            data = await ws.receive_json()
            if data.get("type") == "typing":
                conversation_id = data.get("conversation_id")
                if conversation_id is not None:
                    await manager.broadcast_to_conversation(
                        conversation_id,
                        {"type": "typing", "conversation_id": conversation_id, "user_id": user_id},
                        exclude_user_id=user_id,
                    )
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(user_id, ws)
