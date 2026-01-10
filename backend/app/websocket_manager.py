from fastapi import WebSocket
from typing import Dict, List

class WebSocketManager:
    def __init__(self):
        self.connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, endpoint_id: str):
        await websocket.accept()
        self.connections.setdefault(endpoint_id, []).append(websocket)

    def disconnect(self, websocket: WebSocket, endpoint_id: str):
        if endpoint_id in self.connections:
            self.connections[endpoint_id].remove(websocket)
            if not self.connections[endpoint_id]:
                del self.connections[endpoint_id]

    async def broadcast(self, endpoint_id: str, data: dict):
        for ws in self.connections.get(endpoint_id, []):
            await ws.send_json(data)

manager = WebSocketManager()
