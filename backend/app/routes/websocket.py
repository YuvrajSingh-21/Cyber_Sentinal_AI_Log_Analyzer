from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.websocket_manager import manager

router = APIRouter()

@router.websocket("/ws/alerts")
async def websocket_endpoint(
    websocket: WebSocket,
    endpoint_id: str = Query(...)
):
    await manager.connect(websocket, endpoint_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, endpoint_id)
