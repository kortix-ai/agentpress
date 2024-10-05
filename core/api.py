from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import asyncio

from core.db import Database
from core.thread_manager import ThreadManager
from core.agent_manager import AgentManager
from core.tools.tool_registry import ToolRegistry
from core.config import Settings

app = FastAPI()
db = Database()
manager = ThreadManager(db)
tool_registry = ToolRegistry()  # Initialize here
agent_manager = AgentManager(db)

# Pydantic models for request and response bodies
class Message(BaseModel):
    role: str
    content: str

class RunThreadRequest(BaseModel):
    system_message: Dict[str, Any]
    model_name: str
    temperature: float = 0.5
    max_tokens: Optional[int] = 500
    tools: Optional[List[str]] = None
    tool_choice: str = "required"
    additional_instructions: Optional[str] = None
    stream: bool = False

class Agent(BaseModel):
    name: str
    model: str
    system_prompt: str
    selected_tools: List[str]
    temperature: float = 0.5

@app.post("/threads/")
async def create_thread():
    thread_id = await manager.create_thread()
    return {"thread_id": thread_id}

@app.get("/threads/")
async def get_threads():
    threads = await manager.get_threads()
    return [{"thread_id": thread.thread_id} for thread in threads]

@app.post("/threads/{thread_id}/messages/")
async def add_message(thread_id: int, message: Message):
    await manager.add_message(thread_id, message.dict())
    return {"status": "success"}

@app.get("/threads/{thread_id}/messages/")
async def list_messages(thread_id: int):
    messages = await manager.list_messages(thread_id)
    return messages

@app.post("/threads/{thread_id}/run/")
async def run_thread(thread_id: int, request: Dict[str, Any]):
    if 'agent_id' in request:
        # Agent-based run
        response_gen = manager.run_thread(
            thread_id=thread_id,
            agent_id=request['agent_id'],
            additional_instructions=request.get('additional_instructions'),
            stream=request.get('stream', False)
        )
    else:
        # Manual configuration run
        response_gen = manager.run_thread(
            thread_id=thread_id,
            system_message=request['system_message'],
            model_name=request['model_name'],
            temperature=request['temperature'],
            max_tokens=request['max_tokens'],
            tools=request['tools'],
            additional_instructions=request.get('additional_instructions'),
            stream=request.get('stream', False)
        )

    if request.get('stream', False):
        raise HTTPException(status_code=501, detail="Streaming is not supported via this endpoint.")
    else:
        response = []
        async for chunk in response_gen:
            response.append(chunk)
        return {"response": response}

@app.get("/threads/{thread_id}/run/status/")
async def get_thread_run_status(thread_id: int):
    try:
        latest_thread_run = await manager.get_latest_thread_run(thread_id)
        if latest_thread_run:
            return {
                "status": latest_thread_run.status,
                "error_message": latest_thread_run.error_message
            }
        else:
            return {"status": "No runs found for this thread."}
    except AttributeError:
        return {"status": "Error", "message": "Unable to retrieve thread run status."}

@app.get("/tools/")
async def get_tools():
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

@app.post("/agents/")
async def create_agent(agent: Agent):
    agent_id = await agent_manager.create_agent(**agent.dict())
    return {"agent_id": agent_id}

@app.get("/agents/")
async def list_agents():
    agents = await agent_manager.list_agents()
    return [
        {
            "id": agent.id,
            "name": agent.name,
            "model": agent.model,
            "system_prompt": agent.system_prompt,
            "selected_tools": agent.selected_tools,
            "temperature": agent.temperature,
            "created_at": agent.created_at
        }
        for agent in agents
    ]

@app.get("/agents/{agent_id}")
async def get_agent(agent_id: int):
    agent = await agent_manager.get_agent(agent_id)
    if agent:
        return {
            "id": agent.id,
            "name": agent.name,
            "model": agent.model,
            "system_prompt": agent.system_prompt,
            "selected_tools": agent.selected_tools,
            "temperature": agent.temperature,
            "created_at": agent.created_at
        }
    raise HTTPException(status_code=404, detail="Agent not found")

@app.put("/agents/{agent_id}")
async def update_agent(agent_id: int, agent: Agent):
    success = await agent_manager.update_agent(agent_id, **agent.dict())
    if success:
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Agent not found")

@app.delete("/agents/{agent_id}")
async def delete_agent(agent_id: int):
    success = await agent_manager.delete_agent(agent_id)
    if success:
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Agent not found")