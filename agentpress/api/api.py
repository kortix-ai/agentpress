from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, HTTPException, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel
from agentpress.thread_manager import ThreadManager
import asyncio
import uvicorn
import logging
from agentpress.api.ws import ws_manager
from agentpress.api.api_factory import (
    app as thread_task_app, 
    register_thread_task_api,
    discover_tasks,
    thread_manager as task_thread_manager
)
# from agentpress.api_factory import app as api_app, discover_tasks

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
    
    # Share thread_manager with task API
    global task_thread_manager
    task_thread_manager = thread_manager
    
    # Wait for DB initialization
    db = thread_manager.db
    if db._initialization_task:
        await db._initialization_task
    
    # Run task discovery during startup
    discover_tasks()
    
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

# # Import and mount the API Factory app
# try:
#     # Run task discovery
#     # discover_tasks()
#     logger.info("Task discovery completed")
    
#     # Mount the API Factory app at /tasks instead of root
#     app.mount("/tasks", api_app)
#     logger.info("Mounted API Factory app at /tasks")
# except Exception as e:
#     logger.error(f"Error setting up API Factory: {e}")
#     raise

# Pydantic models for request/response validation
class MessageCreate(BaseModel):
    """Model for creating messages in a thread."""
    message_data: Union[str, Dict[str, Any]]
    images: Optional[List[Dict[str, Any]]] = None
    include_in_llm_message_history: bool = True
    message_type: Optional[str] = None

# REST API Endpoints
@app.post("/threads", response_model=dict, status_code=201)
async def create_thread():
    """Create a new thread."""
    thread_id = await thread_manager.create_thread()
    return {"thread_id": thread_id}

@app.post("/threads/{thread_id}/messages", response_model=dict, status_code=201)
async def create_message(thread_id: str, message: MessageCreate, background_tasks: BackgroundTasks):
    """Create a new message in a thread."""
    if not await thread_manager.thread_exists(thread_id):
        raise HTTPException(status_code=404, detail="Thread not found")
        
    try:
        await thread_manager.add_message(
            thread_id=thread_id,
            message_data=message.message_data,
            images=message.images,
            include_in_llm_message_history=message.include_in_llm_message_history,
            message_type=message.message_type
        )
        
        # Broadcast to WebSocket connections
        background_tasks.add_task(
            ws_manager.broadcast_to_thread,
            thread_id,
            {"type": "message_created", "message": message.dict()}
        )
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# TODO: BROKEN FOR SOME REASON – RETURNS [] SHOULD RETURN, LLM MESSAGE STYLE
@app.get("/threads/{thread_id}/llm_history_messages")
async def get_thread_llm_messages(
    thread_id: str,
    hide_tool_msgs: bool = False,
    only_latest_assistant: bool = False,
):
    """Get messages from a thread with filtering options."""
    if not await thread_manager.thread_exists(thread_id):
        raise HTTPException(status_code=404, detail="Thread not found")
        
    messages = await thread_manager.get_llm_history_messages(
        thread_id=thread_id,
        hide_tool_msgs=hide_tool_msgs,
        only_latest_assistant=only_latest_assistant,
    )
    return {"messages": messages}

@app.get("/threads/{thread_id}/messages")
async def get_thread_messages(
    thread_id: str,
    message_types: Optional[List[str]] = None,
    limit: Optional[int] = 50,
    offset: Optional[int] = 0,
    before_timestamp: Optional[str] = None,
    after_timestamp: Optional[str] = None,
    include_in_llm_message_history: Optional[bool] = None,
    order: str = "asc"
):
    """
    Get messages from a thread with comprehensive filtering options.
    
    Args:
        thread_id: Thread identifier
        message_types: Optional list of message types to filter by
        limit: Maximum number of messages to return (default: 50)
        offset: Number of messages to skip for pagination
        before_timestamp: Optional filter for messages before timestamp
        after_timestamp: Optional filter for messages after timestamp
        include_in_llm_message_history: Optional filter for LLM history inclusion
        order: Sort order - "asc" or "desc"
    """
    if not await thread_manager.thread_exists(thread_id):
        raise HTTPException(status_code=404, detail="Thread not found")
        
    try:
        messages = await thread_manager.get_messages(
            thread_id=thread_id,
            message_types=message_types,
            limit=limit,
            offset=offset,
            before_timestamp=before_timestamp,
            after_timestamp=after_timestamp,
            include_in_llm_message_history=include_in_llm_message_history,
            order=order
        )
        return {"messages": messages}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# TODO ONLY SEND POLLING UPDATES (IN EVEN HIGHER FREQUENCY THEN 1per sec) - IF THEY ARE ANY ACTIVE TASKS FOR THAT THREAD. AS LONG AS THEY ARE ACTIVE TASKS  START & STOP THE POLLING BASED ON WHETHER THERE IS AN ACTIVE TASK FOR THE THREAD. IMPLEMENT in API_FACTORY as well to broadcast this ofc & trigger/disable the polling.

# WebSocket Endpoint
@app.websocket("/threads/{thread_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    thread_id: str,
    message_types: Optional[List[str]] = None,
    limit: Optional[int] = 50,
    offset: Optional[int] = 0,
    before_timestamp: Optional[str] = None,
    after_timestamp: Optional[str] = None,
    include_in_llm_message_history: Optional[bool] = None,
    order: str = "desc"
):
    """
    WebSocket endpoint for real-time thread updates with filtering and pagination.
    
    Query Parameters:
        message_types: Optional list of message types to filter by
        limit: Maximum number of messages to return (default: 50)
        offset: Number of messages to skip (for pagination)
        before_timestamp: Optional timestamp to filter messages before
        after_timestamp: Optional timestamp to filter messages after
        include_in_llm_message_history: Optional bool to filter messages by LLM history inclusion
        order: Sort order - "asc" or "desc" (default: desc)
    """
    try:
        if not await thread_manager.thread_exists(thread_id):
            await websocket.close(code=4004, reason="Thread not found")
            return
            
        await ws_manager.connect(websocket, thread_id)
        
        while True:
            try:
                # Get messages with all filters
                result = await thread_manager.get_messages(
                    thread_id=thread_id,
                    message_types=message_types,
                    limit=limit,
                    offset=offset,
                    before_timestamp=before_timestamp,
                    after_timestamp=after_timestamp,
                    include_in_llm_message_history=include_in_llm_message_history,
                    order=order
                )
                
                # Send messages and pagination info
                await websocket.send_json({
                    "type": "messages",
                    "data": result
                })
                
                # Poll every second
                await asyncio.sleep(1)
                
            except WebSocketDisconnect:
                ws_manager.disconnect(websocket, thread_id)
                break
            except Exception as e:
                logging.error(f"WebSocket error: {e}")
                await websocket.send_json({
                    "type": "error",
                    "data": str(e)
                })
                ws_manager.disconnect(websocket, thread_id)
                break
                
    except Exception as e:
        logging.error(f"WebSocket connection error: {e}")
        try:
            await websocket.close(code=1011, reason=str(e))
        except:
            pass

# Update the mounting of thread_task_app
app.mount("/tasks", thread_task_app)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 