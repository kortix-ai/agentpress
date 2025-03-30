from fastapi import FastAPI, Request, BackgroundTasks, HTTPException, Depends, Body
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from agentpress.thread_manager import ThreadManager
from services.supabase import DBConnection
from datetime import datetime, timezone
from dotenv import load_dotenv
import asyncio

# Import the agent API module
from agent import api as agent_api

# Load environment variables
load_dotenv()

# Initialize managers
db = DBConnection()
thread_manager = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global thread_manager
    await db.initialize()
    thread_manager = ThreadManager()
    
    # Initialize the agent API with shared resources
    agent_api.initialize(
        thread_manager,
        db
    )
    
    # Initialize Redis before restoring agent runs
    from services import redis
    await redis.initialize_async()
    
    asyncio.create_task(agent_api.restore_running_agent_runs())
    
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

# Include the agent router with a prefix
app.include_router(agent_api.router, prefix="/api")

@app.get("/api/health-check")
async def health_check():
    """Health check endpoint to verify API is working."""
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 