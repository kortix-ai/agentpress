from fastapi import FastAPI, Request, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from agentpress.framework.thread_manager import ThreadManager
from agentpress.framework.state_manager import StateManager
from agentpress.framework.db_connection import DBConnection
import os
import json
import asyncio
import traceback
from datetime import datetime, timezone
from typing import Dict, List, Optional, AsyncGenerator
from dotenv import load_dotenv

# Import the agent API module
from agentpress.agent import api as agent_api

# Load environment variables
load_dotenv()

# Initialize managers
store_id = None
state_manager = None
db = DBConnection()
thread_manager = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global store_id, state_manager, thread_manager
    await db.initialize()
    store_id = await StateManager.create_store()
    state_manager = StateManager(store_id)
    thread_manager = ThreadManager()
    
    # Initialize the agent API with shared resources
    agent_api.initialize(
        thread_manager,
        state_manager,
        store_id,
        db
    )
    
    # Restore any still-running agent runs from database (recovery after restart)
    await agent_api.restore_running_agent_runs()
    
    yield
    
    # Clean up agent resources (including Redis)
    await agent_api.cleanup()
    
    # Clean up database connection
    await db.disconnect()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/Users/markokraemer/Projects/agentpress/agentpress/static", StaticFiles(directory="/Users/markokraemer/Projects/agentpress/agentpress/static"), name="static")

# Include the agent router with a prefix
app.include_router(agent_api.router, prefix="/api")

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 