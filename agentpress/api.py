from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, HTTPException, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from agentpress.thread_manager import ThreadManager
import asyncio
import json
import uvicorn
import logging
import importlib
from agentpress.api_factory import app as api_app, discover_tasks

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global managers
thread_manager: Optional[ThreadManager] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for FastAPI application."""
    # Startup
    global thread_manager
    thread_manager = ThreadManager()
    await thread_manager.initialize()
    
    yield
    
    # Shutdown
    # Add any cleanup code here if needed

# Create FastAPI app
app = FastAPI(title="AgentPress API", lifespan=lifespan)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and mount the API Factory app
try:
    # Run task discovery
    discover_tasks()
    logger.info("Task discovery completed")
    
    # Mount the API Factory app at /tasks instead of root
    app.mount("/tasks", api_app)
    logger.info("Mounted API Factory app at /tasks")
except Exception as e:
    logger.error(f"Error setting up API Factory: {e}")
    raise

# WebSocket connection manager
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
            for connection in self.active_connections[thread_id]:
                try:
                    await connection.send_json(message)
                except WebSocketDisconnect:
                    self.disconnect(connection, thread_id)

# Initialize WebSocket manager
ws_manager = WebSocketManager()

# Pydantic models for request/response validation
class EventCreate(BaseModel):
    event_type: str
    content: Dict[str, Any]
    include_in_llm_message_history: bool = False
    llm_message: Optional[Dict[str, Any]] = None

class EventUpdate(BaseModel):
    content: Optional[Dict[str, Any]] = None
    include_in_llm_message_history: Optional[bool] = None
    llm_message: Optional[Dict[str, Any]] = None

class ThreadEvents(BaseModel):
    only_llm_messages: bool = False
    event_types: Optional[List[str]] = None
    order_by: str = "created_at"
    order: str = "ASC"

# REST API Endpoints
@app.post("/threads", response_model=dict, status_code=201)
async def create_thread():
    """Create a new thread."""
    thread_id = await thread_manager.create_thread()
    return {"thread_id": thread_id}

@app.delete("/threads/{thread_id}", status_code=204)
async def delete_thread(thread_id: str):
    """Delete a thread and all its events."""
    success = await thread_manager.delete_thread(thread_id)
    if not success:
        raise HTTPException(status_code=404, detail="Thread not found")
    return None

@app.post("/threads/{thread_id}/events", response_model=dict, status_code=201)
async def create_event(thread_id: str, event: EventCreate, background_tasks: BackgroundTasks):
    """Create a new event in a thread."""
    # First verify thread exists
    if not await thread_manager.thread_exists(thread_id):
        raise HTTPException(status_code=404, detail="Thread not found")
        
    try:
        event_id = await thread_manager.create_event(
            thread_id=thread_id,
            event_type=event.event_type,
            content=event.content,
            include_in_llm_message_history=event.include_in_llm_message_history,
            llm_message=event.llm_message
        )
        # Broadcast to WebSocket connections
        background_tasks.add_task(
            ws_manager.broadcast_to_thread,
            thread_id,
            {"type": "event_created", "event_id": event_id, "event": event.dict()}
        )
        return {"event_id": event_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/threads/{thread_id}/events/{event_id}", status_code=204)
async def delete_event(thread_id: str, event_id: str, background_tasks: BackgroundTasks):
    """Delete a specific event."""
    # First verify thread exists
    if not await thread_manager.thread_exists(thread_id):
        raise HTTPException(status_code=404, detail="Thread not found")
        
    # Then verify event exists and belongs to thread
    if not await thread_manager.event_belongs_to_thread(event_id, thread_id):
        raise HTTPException(status_code=404, detail="Event not found in this thread")
        
    success = await thread_manager.delete_event(event_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete event")
        
    # Broadcast to WebSocket connections
    background_tasks.add_task(
        ws_manager.broadcast_to_thread,
        thread_id,
        {"type": "event_deleted", "event_id": event_id}
    )
    return None

@app.patch("/threads/{thread_id}/events/{event_id}", status_code=200)
async def update_event(thread_id: str, event_id: str, event: EventUpdate, background_tasks: BackgroundTasks):
    """Update an existing event."""
    # First verify thread exists
    if not await thread_manager.thread_exists(thread_id):
        raise HTTPException(status_code=404, detail="Thread not found")
        
    # Then verify event exists and belongs to thread
    if not await thread_manager.event_belongs_to_thread(event_id, thread_id):
        raise HTTPException(status_code=404, detail="Event not found in this thread")
        
    success = await thread_manager.update_event(
        event_id=event_id,
        thread_id=thread_id,
        content=event.content,
        include_in_llm_message_history=event.include_in_llm_message_history,
        llm_message=event.llm_message
    )
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update event")
        
    # Broadcast to WebSocket connections
    background_tasks.add_task(
        ws_manager.broadcast_to_thread,
        thread_id,
        {"type": "event_updated", "event_id": event_id, "updates": event.dict(exclude_unset=True)}
    )
    return {"status": "success"}

@app.get("/threads/{thread_id}/events")
async def get_thread_events(
    thread_id: str,
    only_llm_messages: bool = False,
    event_types: Optional[List[str]] = None,
    order_by: str = "created_at",
    order: str = "ASC"
):
    """Get events from a thread with filtering options."""
    if not await thread_manager.thread_exists(thread_id):
        raise HTTPException(status_code=404, detail="Thread not found")
        
    events = await thread_manager.get_thread_events(
        thread_id=thread_id,
        only_llm_messages=only_llm_messages,
        event_types=event_types,
        order_by=order_by,
        order=order
    )
    return {"events": events}

@app.get("/threads/{thread_id}/messages")
async def get_thread_messages(thread_id: str):
    """Get LLM-formatted messages from thread events."""
    if not await thread_manager.thread_exists(thread_id):
        raise HTTPException(status_code=404, detail="Thread not found")
        
    messages = await thread_manager.get_thread_llm_messages(thread_id)
    return {"messages": messages}

# WebSocket Endpoint
@app.websocket("/ws/threads/{thread_id}")
async def websocket_endpoint(websocket: WebSocket, thread_id: str):
    """WebSocket endpoint for real-time thread updates."""
    # Verify thread exists before accepting connection
    if not await thread_manager.thread_exists(thread_id):
        await websocket.close(code=4004, reason="Thread not found")
        return
        
    await ws_manager.connect(websocket, thread_id)
    try:
        while True:
            await websocket.receive_json()
            
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, thread_id)
    except Exception as e:
        await websocket.send_json({"type": "error", "detail": str(e)})
        ws_manager.disconnect(websocket, thread_id)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 