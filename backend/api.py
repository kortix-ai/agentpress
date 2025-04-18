from fastapi import FastAPI, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from agentpress.thread_manager import ThreadManager
from services.supabase import DBConnection
from datetime import datetime, timezone
from dotenv import load_dotenv
import asyncio
from utils.logger import logger
import uuid

# Import the agent API module
from agent import api as agent_api
from sandbox.api import router as sandbox_router
from services.thread_service import generate_thread_name_async # Import the new service

# Load environment variables
load_dotenv()

# Initialize managers
db = DBConnection()
thread_manager = None
instance_id = str(uuid.uuid4())[:8]  # Generate instance ID at module load time

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global thread_manager
    logger.info(f"Starting up FastAPI application with instance ID: {instance_id}")
    await db.initialize()
    thread_manager = ThreadManager()
    
    # Initialize the agent API with shared resources
    agent_api.initialize(
        thread_manager,
        db,
        instance_id  # Pass the instance_id to agent_api
    )
    
    # Initialize Redis before restoring agent runs
    from services import redis
    await redis.initialize_async()
    
    asyncio.create_task(agent_api.restore_running_agent_runs())
    
    yield
    
    # Clean up agent resources (including Redis)
    logger.info("Cleaning up agent resources")
    await agent_api.cleanup()
    
    # Clean up database connection
    logger.info("Disconnecting from database")
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

# Include the sandbox router with a prefix
app.include_router(sandbox_router, prefix="/api")

# Endpoint for generating thread name
@app.post("/api/threads/generate-name")
async def generate_thread_name_endpoint(payload: dict = Body(...)):
    """Generates a concise thread name based on the provided message."""
    message = payload.get("message")
    if not message:
        raise HTTPException(status_code=400, detail="'message' field is required in the request body.")
    
    logger.info(f"Received request to generate thread name for message starting with: {message[:30]}...")
    try:
        thread_name = await generate_thread_name_async(message)
        logger.info(f"Generated thread name: {thread_name}")
        return {"name": thread_name}
    except Exception as e:
        logger.error(f"Error generating thread name via endpoint: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate thread name.")

@app.get("/api/health-check")
async def health_check():
    """Health check endpoint to verify API is working."""
    logger.info("Health check endpoint called")
    return {
        "status": "ok", 
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "instance_id": instance_id
    }

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting server on 0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000) 