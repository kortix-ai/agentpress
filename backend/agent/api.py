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
from services.supabase import DBConnection
from services import redis
from agent.run import run_agent
from services.auth_utils import get_current_user_id, get_user_id_from_stream_auth, verify_thread_access, verify_agent_run_access
from agentpress.logger import logger

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
    logger.info(f"Initialized agent API with instance ID: {instance_id}")
    
    # Note: Redis will be initialized in the lifespan function in api.py

async def cleanup():
    """Clean up resources and stop running agents on shutdown."""
    logger.info("Starting cleanup of agent API resources")
    # Get Redis client
    redis_client = await redis.get_client()
    
    # Use the instance_id to find and clean up this instance's keys
    running_keys = await redis_client.keys(f"active_run:{instance_id}:*")
    logger.info(f"Found {len(running_keys)} running agent runs to clean up")
    
    for key in running_keys:
        agent_run_id = key.split(":")[-1]
        await stop_agent_run(agent_run_id)
    
    # Close Redis connection
    await redis.close()
    logger.info("Completed cleanup of agent API resources")

async def stop_agent_run(agent_run_id: str):
    """Update database and publish stop signal to Redis."""
    logger.info(f"Stopping agent run: {agent_run_id}")
    client = await db.client
    redis_client = await redis.get_client()
    
    # Update the agent run status to stopped
    await client.table('agent_runs').update({
        "status": "stopped",
        "completed_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", agent_run_id).execute()
    
    # Publish stop signal to the agent run channel as a string
    await redis_client.publish(f"agent_run:{agent_run_id}:control", "STOP")
    logger.info(f"Successfully stopped agent run: {agent_run_id}")

async def restore_running_agent_runs():
    """Restore any agent runs that were still marked as running in the database."""
    logger.info("Restoring running agent runs after server restart")
    client = await db.client
    running_agent_runs = await client.table('agent_runs').select('*').eq("status", "running").execute()

    for run in running_agent_runs.data:
        logger.warning(f"Found running agent run {run['id']} from before server restart")
        await client.table('agent_runs').update({
            "status": "failed", 
            "error": "Server restarted while agent was running",
            "completed_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", run['id']).execute()

@router.post("/thread/{thread_id}/agent/start")
async def start_agent(thread_id: str, user_id: str = Depends(get_current_user_id)):
    """Start an agent for a specific thread in the background."""
    logger.info(f"Starting new agent for thread: {thread_id}")
    client = await db.client
    redis_client = await redis.get_client()
    
    # Verify user has access to this thread
    await verify_thread_access(client, thread_id, user_id)
    
    # Create a new agent run
    agent_run = await client.table('agent_runs').insert({
        "thread_id": thread_id,
        "status": "running",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "responses": "[]"  # Initialize with empty array
    }).execute()
    
    agent_run_id = agent_run.data[0]['id']
    logger.info(f"Created new agent run: {agent_run_id}")
    
    # Register this run in Redis with TTL
    await redis_client.set(
        f"active_run:{instance_id}:{agent_run_id}", 
        "running", 
        ex=redis.REDIS_KEY_TTL
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
    logger.debug(f"Cleaning up Redis keys for agent run: {agent_run_id}")
    redis_client = await redis.get_client()
    await redis_client.delete(f"active_run:{instance_id}:{agent_run_id}")

@router.post("/agent-run/{agent_run_id}/stop")
async def stop_agent(agent_run_id: str, user_id: str = Depends(get_current_user_id)):
    """Stop a running agent."""
    logger.info(f"Stopping agent run: {agent_run_id}")
    client = await db.client
    
    # Verify user has access to the agent run
    await verify_agent_run_access(client, agent_run_id, user_id)
    
    # Stop the agent run
    await stop_agent_run(agent_run_id)
    
    return {"status": "stopped"}

@router.get("/agent-run/{agent_run_id}/stream")
async def stream_agent_run(
    agent_run_id: str, 
    token: Optional[str] = None,
    request: Request = None
):
    """Stream the responses of an agent run from where they left off."""
    logger.info(f"Starting stream for agent run: {agent_run_id}")
    client = await db.client
    redis_client = await redis.get_client()
    
    # Get user ID using the streaming auth function
    user_id = await get_user_id_from_stream_auth(request, token)
    
    # Verify user has access to the agent run and get run data
    agent_run_data = await verify_agent_run_access(client, agent_run_id, user_id)
    
    responses = json.loads(agent_run_data['responses']) if agent_run_data['responses'] else []
    logger.debug(f"Found {len(responses)} existing responses for agent run: {agent_run_id}")
    
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
                        logger.debug(f"Received end stream marker for agent run: {agent_run_id}")
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
            logger.info(f"Stream cancelled for agent run: {agent_run_id}")
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
    logger.info(f"Fetching agent runs for thread: {thread_id}")
    client = await db.client
    
    # Verify user has access to this thread
    await verify_thread_access(client, thread_id, user_id)
    
    agent_runs = await client.table('agent_runs').select('*').eq("thread_id", thread_id).execute()
    logger.debug(f"Found {len(agent_runs.data)} agent runs for thread: {thread_id}")
    return {"agent_runs": agent_runs.data}

@router.get("/agent-run/{agent_run_id}")
async def get_agent_run(agent_run_id: str, user_id: str = Depends(get_current_user_id)):
    """Get agent run status and responses."""
    logger.info(f"Fetching agent run details: {agent_run_id}")
    client = await db.client
    
    # Verify user has access to the agent run and get run data
    agent_run_data = await verify_agent_run_access(client, agent_run_id, user_id)
    
    responses = json.loads(agent_run_data['responses']) if agent_run_data['responses'] else []
    logger.debug(f"Found {len(responses)} responses for agent run: {agent_run_id}")
    
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
    logger.info(f"Starting background agent run: {agent_run_id} for thread: {thread_id}")
    client = await db.client
    redis_client = await redis.get_client()
    
    # Create a buffer to store response chunks
    responses = []
    batch = []
    last_db_update = datetime.now(timezone.utc)
    total_responses = 0
    start_time = datetime.now(timezone.utc)
    
    # Create a pubsub to listen for control messages
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(f"agent_run:{agent_run_id}:control")
    logger.debug(f"Subscribed to control channel for agent run: {agent_run_id}")
    
    # Start a background task to check for stop signals
    stop_signal_received = False
    
    async def check_for_stop_signal():
        nonlocal stop_signal_received
        while True:
            message = await pubsub.get_message(timeout=0.1)  # Reduced timeout
            if message and message["type"] == "message":
                stop_signal = "STOP"
                if message["data"] == stop_signal or message["data"] == stop_signal.encode('utf-8'):
                    logger.info(f"Received stop signal for agent run: {agent_run_id}")
                    stop_signal_received = True
                    break
            await asyncio.sleep(0.01)  # Minimal sleep
            if stop_signal_received:
                break
    
    # Start the stop signal checker
    stop_checker = asyncio.create_task(check_for_stop_signal())
    logger.debug(f"Started stop signal checker for agent run: {agent_run_id}")
    
    try:
        # Run the agent and collect responses
        logger.debug(f"Initializing agent generator for thread: {thread_id}")
        agent_gen = run_agent(thread_id, stream=True, 
                      thread_manager=thread_manager)
        
        async for response in agent_gen:
            # Check if stop signal received
            if stop_signal_received:
                logger.info(f"Agent run stopped due to stop signal: {agent_run_id}")
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
            total_responses += 1
            
            # Log response type for debugging
            # logger.debug(f"Received response type '{formatted_response.get('type', 'unknown')}' for agent run: {agent_run_id}")
            
            # Immediately publish the response to Redis
            await redis_client.publish(
                f"agent_run:{agent_run_id}:responses", 
                json.dumps(formatted_response)
            )
            
            # Update database less frequently to reduce overhead
            now = datetime.now(timezone.utc)
            if (now - last_db_update).total_seconds() >= 2.0 and batch:  # Increased interval
                # logger.debug(f"Batch update for agent run {agent_run_id}: {len(batch)} responses")
                await client.table('agent_runs').update({
                    "responses": json.dumps(responses)
                }).eq("id", agent_run_id).execute()
                
                batch = []
                last_db_update = now
            
            # No sleep needed here - let it run as fast as possible
            
        # Final update to database with all responses
        if batch:
            logger.debug(f"Final batch update for agent run {agent_run_id}: {len(batch)} responses")
            await client.table('agent_runs').update({
                "responses": json.dumps(responses)
            }).eq("id", agent_run_id).execute()
            
        # Signal all done if we weren't stopped
        if not stop_signal_received:
            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            logger.info(f"Agent run completed successfully: {agent_run_id} (duration: {duration:.2f}s, total responses: {total_responses})")
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
            logger.debug(f"Sent END_STREAM signal for agent run: {agent_run_id}")
            
    except Exception as e:
        # Log the error and update the agent run
        error_message = str(e)
        traceback_str = traceback.format_exc()
        duration = (datetime.now(timezone.utc) - start_time).total_seconds()
        logger.error(f"Error in agent run {agent_run_id} after {duration:.2f}s: {error_message}\n{traceback_str}")
        
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
        logger.debug(f"Sent END_STREAM signal after error for agent run: {agent_run_id}")
    finally:
        # Ensure we always clean up the pubsub and stop checker
        stop_checker.cancel()
        await pubsub.unsubscribe()
        logger.debug(f"Cleaned up pubsub and stop checker for agent run: {agent_run_id}")
        
        # Make sure we mark the run as completed or failed if it was still running
        current_run = await client.table('agent_runs').select('status').eq("id", agent_run_id).execute()
        if current_run.data and current_run.data[0]['status'] == 'running':
            final_status = "failed" if stop_signal_received else "completed"
            logger.info(f"Marking agent run {agent_run_id} as {final_status} in cleanup")
            await client.table('agent_runs').update({
                "status": final_status,
                "completed_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", agent_run_id).execute()
