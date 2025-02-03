"""WebSocket management system for real-time updates."""

import logging
from typing import Dict, List
from fastapi import WebSocket, WebSocketDisconnect

class WebSocketManager:
    """Manages WebSocket connections for real-time thread updates."""
    
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, thread_id: str):
        """Connect a WebSocket to a thread."""
        await websocket.accept()
        if thread_id not in self.active_connections:
            self.active_connections[thread_id] = []
        self.active_connections[thread_id].append(websocket)

    def disconnect(self, websocket: WebSocket, thread_id: str):
        """Disconnect a WebSocket from a thread."""
        if thread_id in self.active_connections:
            self.active_connections[thread_id].remove(websocket)
            if not self.active_connections[thread_id]:
                del self.active_connections[thread_id]

    async def broadcast_to_thread(self, thread_id: str, message: dict):
        """Broadcast a message to all connections in a thread."""
        if thread_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[thread_id]:
                try:
                    await connection.send_json(message)
                except WebSocketDisconnect:
                    disconnected.append(connection)
                except Exception as e:
                    logging.warning(f"Failed to send message to websocket: {e}")
                    disconnected.append(connection)
            
            # Clean up disconnected connections
            for connection in disconnected:
                self.disconnect(connection, thread_id)

# Global WebSocket manager instance
ws_manager = WebSocketManager() 