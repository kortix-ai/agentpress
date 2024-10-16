from fastapi import FastAPI, HTTPException, Query, Path
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import asyncio
import json

from agentpress.db import Database
from agentpress.thread_manager import ThreadManager
from agentpress.tool_registry import ToolRegistry
from agentpress.config import Settings

app = FastAPI(
    title="Thread Manager API",
    description="API for managing and running threads with LLM integration",
    version="1.0.0",
)

db = Database()
manager = ThreadManager(db)
tool_registry = ToolRegistry()

class Message(BaseModel):
    role: str = Field(..., description="The role of the message sender (e.g., 'user', 'assistant')")
    content: str = Field(..., description="The content of the message")

class RunThreadRequest(BaseModel):
    system_message: Dict[str, Any] = Field(..., description="The system message to be used for the thread run")
    model_name: str = Field(..., description="The name of the LLM model to be used")
    temperature: float = Field(0.5, description="The sampling temperature for the LLM")
    max_tokens: Optional[int] = Field(None, description="The maximum number of tokens to generate")
    tools: Optional[List[str]] = Field(None, description="The list of tools to be used in the thread run")
    tool_choice: str = Field("auto", description="Controls which tool is called by the model")
    additional_system_message: Optional[str] = Field(None, description="Additional system message to be appended to the existing system message")
    additional_message: Optional[Dict[str, Any]] = Field(None, description="Additional message to be appended at the end of the conversation")
    hide_tool_msgs: bool = Field(False, description="Whether to hide tool messages in the conversation history")
    execute_tools_async: bool = Field(True, description="Whether to execute tools asynchronously")
    use_tool_parser: bool = Field(False, description="Whether to use the tool parser for handling tool calls")
    top_p: Optional[float] = Field(None, description="The nucleus sampling value")
    response_format: Optional[Dict[str, Any]] = Field(None, description="Specifies the format that the model must output")
    autonomous_iterations_amount: Optional[int] = Field(None, description="The number of autonomous iterations to perform")
    continue_instructions: Optional[str] = Field(None, description="Instructions for continuing the conversation in subsequent iterations")
    initializer: Optional[str] = Field(None, description="Name of the initializer function")
    pre_iteration: Optional[str] = Field(None, description="Name of the pre-iteration function")
    after_iteration: Optional[str] = Field(None, description="Name of the after-iteration function")
    finalizer: Optional[str] = Field(None, description="Name of the finalizer function")

@app.post("/threads/", response_model=Dict[str, str], summary="Create a new thread")
async def create_thread():
    """
    Create a new thread and return its ID.
    """
    thread_id = await manager.create_thread()
    return {"thread_id": thread_id}

@app.get("/threads/", response_model=List[Dict[str, Any]], summary="Get all threads")
async def get_threads():
    """
    Retrieve a list of all threads.
    """
    threads = await manager.get_threads()
    return [{"thread_id": thread.thread_id, "created_at": thread.created_at} for thread in threads]

@app.post("/threads/{thread_id}/messages/", response_model=Dict[str, str], summary="Add a message to a thread")
async def add_message(thread_id: str, message: Message):
    """
    Add a new message to the specified thread.
    """
    await manager.add_message(thread_id, message.dict())
    return {"status": "success"}

@app.get("/threads/{thread_id}/messages/", response_model=List[Dict[str, Any]], summary="List messages in a thread")
async def list_messages(thread_id: str):
    """
    Retrieve all messages from the specified thread.
    """
    messages = await manager.list_messages(thread_id)
    return messages

@app.post("/threads/{thread_id}/run/", response_model=Dict[str, Any], summary="Run a thread")
async def run_thread(thread_id: str, request: RunThreadRequest):
    try:
        # Create a new ThreadRun object
        thread_run = await manager.create_thread_run(
            thread_id,
            model_name=request.model_name,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            top_p=request.top_p,
            tool_choice=request.tool_choice,
            execute_tools_async=request.execute_tools_async,
            system_message=json.dumps(request.system_message),
            tools=json.dumps(request.tools),
            response_format=json.dumps(request.response_format),
            autonomous_iterations_amount=request.autonomous_iterations_amount,
            continue_instructions=request.continue_instructions
        )

        # Run the thread with the created ThreadRun object
        result = await manager.run_thread(
            thread_id=thread_id,
            thread_run=thread_run,
            initializer=get_function(request.initializer),
            pre_iteration=get_function(request.pre_iteration),
            after_iteration=get_function(request.after_iteration),
            finalizer=get_function(request.finalizer),
            **request.dict(exclude={'initializer', 'pre_iteration', 'after_iteration', 'finalizer'})
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_function(function_name: Optional[str]):
    if function_name is None:
        return None
    # Implement a way to get the function by name, e.g., from a predefined dictionary of functions
    # For now, we'll return None
    return None

@app.get("/tools/", response_model=Dict[str, Dict[str, Any]], summary="Get available tools")
async def get_tools():
    """
    Retrieve a list of all available tools and their schemas.
    """
    tools = tool_registry.get_all_tools()
    if not tools:
        print("No tools found in the registry")  # Debug print
    return {
        name: {
            "name": name,
            "description": tool_info['schema']['function']['description'],
            "schema": tool_info['schema']
        }
        for name, tool_info in tools.items()
    }

@app.get("/threads/{thread_id}/runs/{run_id}", response_model=Dict[str, Any], summary="Retrieve a run")
async def get_run(
    thread_id: str = Path(..., description="The ID of the thread that was run"),
    run_id: str = Path(..., description="The ID of the run to retrieve")
):
    run = await manager.get_run(thread_id, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return run

@app.post("/threads/{thread_id}/runs/{run_id}/cancel", response_model=Dict[str, Any], summary="Cancel a run")
async def cancel_run(
    thread_id: str = Path(..., description="The ID of the thread to which this run belongs"),
    run_id: str = Path(..., description="The ID of the run to cancel")
):
    """
    Cancels a run that is in_progress.
    """
    run = await manager.cancel_run(thread_id, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return run

@app.get("/threads/{thread_id}/runs", response_model=List[Dict[str, Any]], summary="List runs")
async def list_runs(
    thread_id: str = Path(..., description="The ID of the thread the runs belong to"),
    limit: int = Query(20, ge=1, le=100, description="A limit on the number of objects to be returned")
):
    runs = await manager.list_runs(thread_id, limit)
    return runs

@app.post("/threads/{thread_id}/runs/{run_id}/stop", response_model=Dict[str, Any], summary="Stop a thread run")
async def stop_thread_run(
    thread_id: str = Path(..., description="The ID of the thread"),
    run_id: str = Path(..., description="The ID of the run to stop")
):
    """
    Stops a thread run that is in progress.
    """
    run = await manager.stop_thread_run(thread_id, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found or already completed/stopped")
    return run

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
