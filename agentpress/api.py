from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import asyncio
import json
from typing import Optional, AsyncGenerator
from agentpress.framework.thread_manager import ThreadManager
from agentpress.framework.state_manager import StateManager
from agentpress.framework.db_connection import DBConnection
import os
from agentpress.agent import run_agent

# Initialize managers
store_id = None
state_manager = None
db = DBConnection()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global store_id, state_manager, thread_manager
    await db.initialize()
    store_id = await StateManager.create_store()
    state_manager = StateManager(store_id)
    thread_manager = ThreadManager()
    
    yield
    
    # Shutdown
    await db.disconnect()

app = FastAPI(lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/Users/markokraemer/Projects/agentpress/agentpress/static", StaticFiles(directory="/Users/markokraemer/Projects/agentpress/agentpress/static"), name="static")

@app.get("/")
async def read_root():
    """Serve the main page."""
    return FileResponse("/Users/markokraemer/Projects/agentpress/agentpress/static/index.html")



@app.post("/api/thread")
async def create_thread():
    """Create a new conversation thread."""
    thread_id = await thread_manager.create_thread()
    return {"thread_id": thread_id}

@app.post("/api/thread/{thread_id}/message")
async def add_message(thread_id: str, message: dict):
    """Add a message to a thread."""
    await thread_manager.add_message(thread_id, message)
    return {"status": "success"}

@app.get("/api/thread/{thread_id}/messages")
async def get_messages(thread_id: str, hide_tool_msgs: bool = False):
    """Get messages from a thread."""
    messages = await thread_manager.get_messages(thread_id, hide_tool_msgs=hide_tool_msgs)
    return {"messages": messages}

@app.get("/api/threads")
async def get_threads():
    """Get all threads."""
    prisma = await db.prisma
    threads = await prisma.thread.find_many()
    return {"threads": threads}



@app.post("/api/thread/{thread_id}/agent")
async def run_agent_endpoint(thread_id: str, use_xml: bool = True, stream: bool = True):
    """Run the agent for a specific thread."""
    # Get current workspace state
    state = await state_manager.export_store()
    state_message = {
        "role": "user",
        "content": f"""
Current development environment workspace state:
<current_workspace_state>
{json.dumps(state, indent=2)}
</current_workspace_state>
        """
    }

    if stream:
        return StreamingResponse(
            run_agent(thread_id, stream=True, use_xml=use_xml, state_message=state_message, 
                     thread_manager=thread_manager, state_manager=state_manager, store_id=store_id),
            media_type="text/event-stream"
        )
    else:
        response = await run_agent(thread_id, stream=False, use_xml=use_xml, state_message=state_message,
                                 thread_manager=thread_manager, state_manager=state_manager, store_id=store_id)
        return response


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 