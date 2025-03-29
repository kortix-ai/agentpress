from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
import asyncio
import json
import traceback
from datetime import datetime, timezone
import uuid
from typing import Optional
import jwt

from agentpress.thread_manager import ThreadManager
from agentpress.db_connection import DBConnection
from agentpress import redis_manager
from agent.run import run_agent
from gamefarm.backend.utils.auth_utils import get_current_user_id

# Initialize shared resources
router = APIRouter()
thread_manager = None
db = None 
instance_id = None

def initialize(
    _thread_manager: ThreadManager,
    _db: DBConnection
):
    """Initialize the agent API with resources from the main API."""
    global thread_manager, db, instance_id
    thread_manager = _thread_manager
    db = _db
    
    # Generate instance ID
    instance_id = str(uuid.uuid4())[:8]
    
    # Note: Redis will be initialized in the lifespan function in api.py

async def cleanup():
    """Clean up resources and stop running agents on shutdown."""
    # Get Redis client
    redis_client = await redis_manager.get_client()
    
    # Use the instance_id to find and clean up this instance's keys
    running_keys = await redis_client.keys(f"active_run:{instance_id}:*")
    
    for key in running_keys:
        agent_run_id = key.split(":")[-1]
        await stop_agent_run(agent_run_id)
    
    # Close Redis connection
    await redis_manager.close()

async def stop_agent_run(agent_run_id: str):
    """Update database and publish stop signal to Redis."""
    client = await db.client
    redis_client = await redis_manager.get_client()
    
    # Update the agent run status to stopped
    await client.table('agent_runs').update({
        "status": "stopped",
        "completed_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", agent_run_id).execute()
    
    # Publish stop signal to the agent run channel as a string
    await redis_client.publish(f"agent_run:{agent_run_id}:control", "STOP")

async def restore_running_agent_runs():
    """Restore any agent runs that were still marked as running in the database."""
    client = await db.client
    running_agent_runs = await client.table('agent_runs').select('*').eq("status", "running").execute()

    for run in running_agent_runs.data:
        await client.table('agent_runs').update({
            "status": "failed", 
            "error": "Server restarted while agent was running",
            "completed_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", run['id']).execute()

@router.post("/thread/{thread_id}/agent/start")
async def start_agent(thread_id: str, user_id: str = Depends(get_current_user_id)):
    """Start an agent for a specific thread in the background."""
    client = await db.client
    redis_client = await redis_manager.get_client()
    
    # Verify user has access to this thread
    thread = await client.table('threads').select('thread_id').eq('thread_id', thread_id).eq('user_id', user_id).execute()
    
    if not thread.data or len(thread.data) == 0:
        raise HTTPException(status_code=403, detail="Not authorized to access this thread")
    
    # Create a new agent run
    agent_run = await client.table('agent_runs').insert({
        "thread_id": thread_id,
        "status": "running",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "responses": "[]"  # Initialize with empty array
    }).execute()
    
    agent_run_id = agent_run.data[0]['id']
    
    # Register this run in Redis with TTL
    await redis_client.set(
        f"active_run:{instance_id}:{agent_run_id}", 
        "running", 
        ex=redis_manager.REDIS_KEY_TTL
    )
    
    # Run the agent in the background
    task = asyncio.create_task(
        run_agent_background(agent_run_id, thread_id, instance_id)
    )
    
    # Set a callback to clean up when task is done
    task.add_done_callback(
        lambda _: asyncio.create_task(
            _cleanup_agent_run(agent_run_id)
        )
    )
    
    return {"agent_run_id": agent_run_id, "status": "running"}

async def _cleanup_agent_run(agent_run_id: str):
    """Clean up Redis keys when an agent run is done."""
    redis_client = await redis_manager.get_client()
    await redis_client.delete(f"active_run:{instance_id}:{agent_run_id}")

@router.post("/agent-run/{agent_run_id}/stop")
async def stop_agent(agent_run_id: str, user_id: str = Depends(get_current_user_id)):
    """Stop a running agent."""
    client = await db.client
    
    # Check if agent run exists and verify user has access to the thread
    agent_run = await client.table('agent_runs').select('*').eq('id', agent_run_id).execute()
    
    if not agent_run.data or len(agent_run.data) == 0:
        raise HTTPException(status_code=404, detail="Agent run not found")
    
    thread_id = agent_run.data[0]['thread_id']
    
    # Verify user has access to this thread
    thread = await client.table('threads').select('thread_id').eq('thread_id', thread_id).eq('user_id', user_id).execute()
    
    if not thread.data or len(thread.data) == 0:
        raise HTTPException(status_code=403, detail="Not authorized to access this agent run")
    
    # Stop the agent run
    await stop_agent_run(agent_run_id)
    
    return {"status": "stopped"}

@router.get("/agent-run/{agent_run_id}/stream")
async def stream_agent_run(
    agent_run_id: str, 
    token: Optional[str] = None,
    request: Request = None,
    user_id: Optional[str] = None
):
    """Stream the responses of an agent run from where they left off."""
    client = await db.client
    redis_client = await redis_manager.get_client()
    
    # Try to get user_id from token in query param (for EventSource which can't set headers)
    if not user_id and token:
        try:
            # For Supabase JWT, we just need to decode and extract the user ID
            payload = jwt.decode(token, options={"verify_signature": False})
            user_id = payload.get('sub')
        except Exception as e:
            raise HTTPException(
                status_code=401,
                detail="Invalid token in query parameter",
                headers={"WWW-Authenticate": "Bearer"}
            )
    
    # If still no user_id, try to get it from the Authorization header
    if not user_id and request:
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            try:
                # Extract token from header
                header_token = auth_header.split(' ')[1]
                payload = jwt.decode(header_token, options={"verify_signature": False})
                user_id = payload.get('sub')
            except Exception:
                pass
    
    # If we still don't have a user_id, return authentication error
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="No valid authentication credentials found",
            headers={"WWW-Authenticate": "Bearer"}
        )
        
    # Get agent run data
    agent_run = await client.table('agent_runs').select('*').eq('id', agent_run_id).execute()
    
    if not agent_run.data or len(agent_run.data) == 0:
        raise HTTPException(status_code=404, detail="Agent run not found")
        
    agent_run_data = agent_run.data[0]
    thread_id = agent_run_data['thread_id']
    
    # Verify user has access to this thread
    thread = await client.table('threads').select('thread_id').eq('thread_id', thread_id).eq('user_id', user_id).execute()
    
    if not thread.data or len(thread.data) == 0:
        raise HTTPException(status_code=403, detail="Not authorized to access this agent run")
    
    responses = json.loads(agent_run_data['responses']) if agent_run_data['responses'] else []
    
    # Create a pubsub to listen for new responses
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(f"agent_run:{agent_run_id}:responses")
    
    # Define the streaming generator
    async def event_generator():
        try:
            # First send any existing responses
            for response in responses:
                yield f"data: {json.dumps(response)}\n\n"
            
            # Then stream new responses
            while True:
                message = await pubsub.get_message(timeout=0.1)  # Reduced timeout for faster response
                if message and message["type"] == "message":
                    data = message["data"]
                    
                    # Check if this is the end marker
                    end_stream_marker = "END_STREAM"
                    if data == end_stream_marker or data == end_stream_marker.encode('utf-8'):
                        break
                    
                    # Handle both string and bytes data
                    if isinstance(data, bytes):
                        data_str = data.decode('utf-8')
                    else:
                        data_str = str(data)
                        
                    # Don't add extra formatting to already JSON-formatted data
                    yield f"data: {data_str}\n\n"
                    
                # Check if agent is still running
                current_run = await client.table('agent_runs').select('status').eq('id', agent_run_id).execute()
                if not current_run.data or current_run.data[0]['status'] != 'running':
                    # Send final status update
                    yield f"data: {json.dumps({'type': 'status', 'status': current_run.data[0]['status'] if current_run.data else 'unknown'})}\n\n"
                    break
                
                await asyncio.sleep(0.01)  # Minimal sleep to prevent CPU spinning
                    
        except asyncio.CancelledError:
            pass
        finally:
            await pubsub.unsubscribe()
    
    # Return a StreamingResponse with the correct headers for SSE
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Content-Type": "text/event-stream",
            "Access-Control-Allow-Origin": "*"  # Add CORS header for EventSource
        }
    )

@router.get("/thread/{thread_id}/agent-runs")
async def get_agent_runs(thread_id: str, user_id: str = Depends(get_current_user_id)):
    """Get all agent runs for a thread."""
    client = await db.client
    
    # Verify user has access to this thread
    thread = await client.table('threads').select('thread_id').eq('thread_id', thread_id).eq('user_id', user_id).execute()
    
    if not thread.data or len(thread.data) == 0:
        raise HTTPException(status_code=403, detail="Not authorized to access this thread")
    
    agent_runs = await client.table('agent_runs').select('*').eq("thread_id", thread_id).execute()
    return {"agent_runs": agent_runs.data}

@router.get("/agent-run/{agent_run_id}")
async def get_agent_run(agent_run_id: str, user_id: str = Depends(get_current_user_id)):
    """Get agent run status and responses."""
    client = await db.client
    agent_run = await client.table('agent_runs').select('*').eq('id', agent_run_id).execute()
    
    if not agent_run.data or len(agent_run.data) == 0:
        raise HTTPException(status_code=404, detail="Agent run not found")
        
    agent_run_data = agent_run.data[0]
    thread_id = agent_run_data['thread_id']
    
    # Verify user has access to this thread
    thread = await client.table('threads').select('thread_id').eq('thread_id', thread_id).eq('user_id', user_id).execute()
    
    if not thread.data or len(thread.data) == 0:
        raise HTTPException(status_code=403, detail="Not authorized to access this agent run")
    
    responses = json.loads(agent_run_data['responses']) if agent_run_data['responses'] else []
    
    return {
        "id": agent_run_data['id'],
        "threadId": agent_run_data['thread_id'],
        "status": agent_run_data['status'],
        "startedAt": agent_run_data['started_at'],
        "completedAt": agent_run_data['completed_at'],
        "responses": responses,
        "error": agent_run_data['error']
    }

async def run_agent_background(agent_run_id: str, thread_id: str, instance_id: str):
    """Run the agent in the background and store responses."""
    client = await db.client
    redis_client = await redis_manager.get_client()
    
    # Create a buffer to store response chunks
    responses = []
    batch = []
    last_db_update = datetime.now(timezone.utc)
    
    # Create a pubsub to listen for control messages
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(f"agent_run:{agent_run_id}:control")
    
    # Start a background task to check for stop signals
    stop_signal_received = False
    
    async def check_for_stop_signal():
        nonlocal stop_signal_received
        while True:
            message = await pubsub.get_message(timeout=0.1)  # Reduced timeout
            if message and message["type"] == "message":
                stop_signal = "STOP"
                if message["data"] == stop_signal or message["data"] == stop_signal.encode('utf-8'):
                    stop_signal_received = True
                    break
            await asyncio.sleep(0.01)  # Minimal sleep
            if stop_signal_received:
                break
    
    # Start the stop signal checker
    stop_checker = asyncio.create_task(check_for_stop_signal())
    
    try:
        # Run the agent and collect responses
        agent_gen = run_agent(thread_id, stream=True, 
                      thread_manager=thread_manager)
        
        async for response in agent_gen:
            # Check if stop signal received
            if stop_signal_received:
                break
                
            # Format the response properly
            formatted_response = None
            
            # Handle different types of responses
            if isinstance(response, str):
                formatted_response = {"type": "content", "content": response}
            elif isinstance(response, dict):
                if "type" in response:
                    formatted_response = response
                else:
                    formatted_response = {"type": "content", **response}
            else:
                formatted_response = {"type": "content", "content": str(response)}
                
            # Add response to batch and responses list
            responses.append(formatted_response)
            batch.append(formatted_response)
            
            # Immediately publish the response to Redis
            await redis_client.publish(
                f"agent_run:{agent_run_id}:responses", 
                json.dumps(formatted_response)
            )
            
            # Update database less frequently to reduce overhead
            now = datetime.now(timezone.utc)
            if (now - last_db_update).total_seconds() >= 2.0 and batch:  # Increased interval
                await client.table('agent_runs').update({
                    "responses": json.dumps(responses)
                }).eq("id", agent_run_id).execute()
                
                batch = []
                last_db_update = now
            
            # No sleep needed here - let it run as fast as possible
            
        # Final update to database with all responses
        if batch:
            await client.table('agent_runs').update({
                "responses": json.dumps(responses)
            }).eq("id", agent_run_id).execute()
            
        # Signal all done if we weren't stopped
        if not stop_signal_received:
            await client.table('agent_runs').update({
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", agent_run_id).execute()
            
            # Send END_STREAM signal
            end_stream_marker = "END_STREAM"
            await redis_client.publish(
                f"agent_run:{agent_run_id}:responses", 
                end_stream_marker
            )
            
    except Exception as e:
        # Log the error and update the agent run
        error_message = str(e)
        traceback_str = traceback.format_exc()
        print(f"Error in agent run {agent_run_id}: {error_message}\n{traceback_str}")
        
        # Update the agent run with the error
        await client.table('agent_runs').update({
            "status": "failed",
            "error": f"{error_message}\n{traceback_str}",
            "completed_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", agent_run_id).execute()
        
        # Send END_STREAM signal
        end_stream_marker = "END_STREAM"
        await redis_client.publish(
            f"agent_run:{agent_run_id}:responses", 
            end_stream_marker
        )
    finally:
        # Ensure we always clean up the pubsub and stop checker
        stop_checker.cancel()
        await pubsub.unsubscribe()
        
        # Make sure we mark the run as completed or failed if it was still running
        current_run = await client.table('agent_runs').select('status').eq("id", agent_run_id).execute()
        if current_run.data and current_run.data[0]['status'] == 'running':
            await client.table('agent_runs').update({
                "status": "failed" if stop_signal_received else "completed",
                "completed_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", agent_run_id).execute()
