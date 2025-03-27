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
from datetime import datetime, timezone
from typing import Dict, List, Optional, AsyncGenerator
from agentpress.agent import run_agent

# Initialize managers
store_id = None
state_manager = None
db = DBConnection()
# Dictionary to store active agent runs
active_runs: Dict[str, asyncio.Task] = {}
# Dictionary to store response channels (queue per agent run)
response_channels: Dict[str, asyncio.Queue] = {}

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
    allow_origins=["*"],
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



@app.post("/api/thread/{thread_id}/agent/start")
async def start_agent(thread_id: str, use_xml: bool = True):
    """Start an agent for a specific thread in the background."""
    prisma = await db.prisma
    
    # Create a new agent run
    agent_run = await prisma.agentrun.create(
        data={
            "threadId": thread_id,
            "status": "running"
        }
    )
    
    # Create a response channel (queue) for this agent run
    response_channels[agent_run.id] = asyncio.Queue()
    
    # Run the agent in the background
    task = asyncio.create_task(
        run_agent_background(agent_run.id, thread_id, use_xml)
    )
    active_runs[agent_run.id] = task
    
    return {"agent_run_id": agent_run.id, "status": "running"}

@app.post("/api/agent-run/{agent_run_id}/stop")
async def stop_agent(agent_run_id: str):
    """Stop a running agent."""
    prisma = await db.prisma
    
    # Check if agent run exists
    agent_run = await prisma.agentrun.find_unique(
        where={"id": agent_run_id}
    )
    
    if not agent_run:
        raise HTTPException(status_code=404, detail="Agent run not found")
    
    # If the agent is still running in active_runs, cancel its task
    if agent_run_id in active_runs and active_runs[agent_run_id]:
        active_runs[agent_run_id].cancel()
        del active_runs[agent_run_id]
    
    # Update the agent run status to stopped
    await prisma.agentrun.update(
        where={"id": agent_run_id},
        data={
            "status": "stopped",
            "completedAt": datetime.now(timezone.utc).isoformat()  # ISO format without Z suffix
        }
    )
    
    # Close the response channel if it exists
    if agent_run_id in response_channels:
        # Add None to signal end of stream
        await response_channels[agent_run_id].put(None)
    
    return {"status": "stopped"}

@app.get("/api/agent-run/{agent_run_id}/stream")
async def stream_agent_run(agent_run_id: str):
    """Stream the responses of an agent run from where they left off."""
    prisma = await db.prisma
    agent_run = await prisma.agentrun.find_unique(
        where={"id": agent_run_id}
    )
    
    if not agent_run:
        raise HTTPException(status_code=404, detail="Agent run not found")
    
    # Return the existing responses as a stream
    async def stream_existing_responses():
        # First, send all existing responses
        responses = agent_run.responses
        if isinstance(responses, str):
            responses = json.loads(responses)
        
        for response in responses:
            yield f"data: {json.dumps(response)}\n\n"
        
        # If the agent is still running, subscribe to the response channel
        if agent_run.status == "running":
            # Create a channel if it doesn't exist (in case of reconnection)
            if agent_run_id not in response_channels:
                response_channels[agent_run_id] = asyncio.Queue()
            
            try:
                # Wait for new responses from the channel
                while True:
                    # Use a timeout to allow for checking channel status
                    try:
                        response = await asyncio.wait_for(
                            response_channels[agent_run_id].get(),
                            timeout=30.0  # 30 second timeout
                        )
                        
                        # None is our signal to stop streaming
                        if response is None:
                            break
                            
                        yield f"data: {json.dumps(response)}\n\n"
                    except asyncio.TimeoutError:
                        # Check if agent is still running
                        current_agent_run = await prisma.agentrun.find_unique(
                            where={"id": agent_run_id}
                        )
                        
                        if current_agent_run.status != "running":
                            break
                            
                        # Send a ping to keep connection alive
                        yield f"data: {json.dumps({'type': 'ping'})}\n\n"
            finally:
                # If client disconnects, clear this consumer but keep the channel
                pass
    
    return StreamingResponse(
        stream_existing_responses(),
        media_type="text/event-stream"
    )

@app.get("/api/thread/{thread_id}/agent-runs")
async def get_agent_runs(thread_id: str):
    """Get all agent runs for a thread."""
    prisma = await db.prisma
    agent_runs = await prisma.agentrun.find_many(
        where={"threadId": thread_id}
    )
    return {"agent_runs": agent_runs}

@app.get("/api/agent-run/{agent_run_id}")
async def get_agent_run(agent_run_id: str):
    """Get agent run status and responses."""

    prisma = await db.prisma
    agent_run = await prisma.agentrun.find_unique(
        where={"id": agent_run_id}
    )
    
    if not agent_run:
        raise HTTPException(status_code=404, detail="Agent run not found")
     
    responses = agent_run.responses
    if isinstance(responses, str):
        responses = json.loads(responses)
    
    return {
        "id": agent_run.id,
        "threadId": agent_run.threadId,
        "status": agent_run.status,
        "startedAt": agent_run.startedAt,
        "completedAt": agent_run.completedAt,
        "responses": responses,
        "error": agent_run.error
    }

async def run_agent_background(agent_run_id: str, thread_id: str, use_xml: bool):
    """Run the agent in the background and store responses."""
    prisma = await db.prisma
    
    try:
        # Create a buffer to store response chunks
        responses = []
        
        # Run the agent and collect responses
        async for chunk in run_agent(thread_id, stream=True, use_xml=use_xml, 
                        thread_manager=thread_manager, state_manager=state_manager, store_id=store_id):
            if chunk.startswith("data: "):
                data = json.loads(chunk[6:])
                responses.append(data)
                
                # Update the agent run with the latest responses
                await prisma.agentrun.update(
                    where={"id": agent_run_id},
                    data={"responses": json.dumps(responses)}  # Explicitly convert to JSON string
                )
                
                # Send to response channel if it exists (for live streaming)
                if agent_run_id in response_channels:
                    await response_channels[agent_run_id].put(data)
        
        # Mark the agent run as completed
        await prisma.agentrun.update(
            where={"id": agent_run_id},
            data={
                "status": "completed", 
                "completedAt": datetime.now(timezone.utc).isoformat()  # ISO format without Z suffix
            }
        )
        
    except Exception as e:
        # Mark the agent run as failed
        await prisma.agentrun.update(
            where={"id": agent_run_id},
            data={
                "status": "failed", 
                "error": str(e),
                "completedAt": datetime.now(timezone.utc).isoformat()  # ISO format without Z suffix
            }
        )
    finally:
        # Signal end of stream to any listeners
        if agent_run_id in response_channels:
            await response_channels[agent_run_id].put(None)
            
        # Remove from active runs
        if agent_run_id in active_runs:
            del active_runs[agent_run_id]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 