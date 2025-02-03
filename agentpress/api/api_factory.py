"""
Thread Task API Factory for registering and managing thread-associated long-running tasks.
"""

import sys
import os
import inspect
import uuid
import asyncio
import logging
import importlib
from functools import wraps
from typing import Callable, Dict, Any, Optional, List, ForwardRef
from fastapi import FastAPI, HTTPException, Request
from pydantic import create_model
from agentpress.thread_manager import ThreadManager
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize managers at module level
thread_manager: Optional[ThreadManager] = None
_decorated_functions: Dict[str, Callable] = {}
_running_tasks: Dict[str, Dict[str, Any]] = {}

def find_project_root():
    """Find the project root by looking for pyproject.toml"""
    current = os.path.abspath(os.path.dirname(__file__))
    while current != '/':
        if os.path.exists(os.path.join(current, 'pyproject.toml')):
            return current
        current = os.path.dirname(current)
    return None

def discover_tasks():
    """
    Discover all decorated functions in the project.
    Scans from the project root (where pyproject.toml is located).
    """
    logger.info("Starting task discovery")
    
    # Find project root
    project_root = find_project_root()
    logger.info(f"Project root found at: {project_root}")
    
    # Add project root to Python path if not already there
    if project_root not in sys.path:
        sys.path.insert(0, project_root)
    
    # Walk through all Python files in the project
    for root, _, files in os.walk(project_root):
        for file in files:
            if file.endswith('.py'):
                module_path = os.path.join(root, file)
                module_name = os.path.relpath(module_path, project_root)
                module_name = os.path.splitext(module_name)[0].replace(os.path.sep, '.')
                
                try:
                    logger.info(f"Attempting to import module: {module_name}")
                    module = importlib.import_module(module_name)
                    
                    # Inspect all module members
                    for name, obj in inspect.getmembers(module):
                        if inspect.isfunction(obj):
                            # Check if this function has been decorated with register_thread_task_api
                            if hasattr(obj, '__closure__') and obj.__closure__:
                                for cell in obj.__closure__:
                                    if cell.cell_contents in _decorated_functions.values():
                                        path = next(
                                            p for p, f in _decorated_functions.items()
                                            if f == cell.cell_contents
                                        )
                                        _decorated_functions[path] = obj
                                        logger.info(f"Registered function: {obj.__name__} at path: {path}")
                                    
                except Exception as e:
                    logger.error(f"Error importing {module_name}: {e}")

    logger.info(f"Task discovery complete. Registered paths: {list(_decorated_functions.keys())}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for FastAPI application."""
    global thread_manager
    
    # Initialize ThreadManager if not already initialized
    if thread_manager is None:
        thread_manager = ThreadManager()
        # Wait for DB initialization
        if thread_manager.db._initialization_task:
            await thread_manager.db._initialization_task
    
    # Run task discovery during startup
    discover_tasks()
    
    yield
    # Cleanup if needed

# Create FastAPI app
app = FastAPI(
    title="Thread Task API",
    description="API for managing thread-associated long-running tasks",
    openapi_tags=[{
        "name": "Generated Thread Tasks",
        "description": "Dynamically generated endpoints for thread-associated tasks"
    }],
    lifespan=lifespan
)

# Add middleware to ensure thread_manager is available
@app.middleware("http")
async def ensure_thread_manager(request: Request, call_next):
    """Ensure thread_manager is initialized before handling requests."""
    global thread_manager
    if thread_manager is None:
        thread_manager = ThreadManager()
        if thread_manager.db._initialization_task:
            await thread_manager.db._initialization_task
    return await call_next(request)

def register_thread_task_api(path: str):
    """
    Decorator to register a function as a thread-associated task API endpoint.
    The decorated function must have thread_id as its first parameter.
    """
    def decorator(func: Callable):
        logger.info(f"Registering thread task API endpoint: {path} for function {func.__name__}")
        _decorated_functions[path] = func
        
        # Validate that thread_id is the first parameter
        params = inspect.signature(func).parameters
        if 'thread_id' not in params:
            raise ValueError(f"Function {func.__name__} must have thread_id as a parameter")
        
        # Create Pydantic model for function parameters
        model_fields = {}
        for name, param in params.items():
            if name == 'self':  # Skip self parameter for methods
                continue
                
            annotation = param.annotation
            if annotation == inspect.Parameter.empty:
                annotation = Any
            
            # Convert string annotations to ForwardRef
            if isinstance(annotation, str):
                annotation = ForwardRef(annotation)
                
            default = ... if param.default == inspect.Parameter.empty else param.default
            model_fields[name] = (annotation, default)
            
        RequestModel = create_model(f'{func.__name__}Request', **model_fields)
        
        # Register the start endpoint
        @app.post(
            f"{path}/start", 
            response_model=dict,
            summary=f"Start {func.__name__}",
            description=f"Start a new {func.__name__} task associated with a thread",
            tags=["Generated Thread Tasks"]
        )
        async def start_task(params: RequestModel):
            logger.info(f"Starting task at {path}/start")
            
            # Validate thread exists
            if not await thread_manager.thread_exists(params.thread_id):
                raise HTTPException(status_code=404, detail="Thread not found")
            
            task_id = str(uuid.uuid4())
            kwargs = params.dict()
            
            # Create the task
            task = asyncio.create_task(func(**kwargs))
            
            # Store task with thread association
            _running_tasks[task_id] = {
                "thread_id": params.thread_id,
                "task": task,
                "status": "running",
                "path": path,
                "started_at": asyncio.get_event_loop().time()
            }
            
            # Add task info to thread messages
            await thread_manager.add_message(
                thread_id=params.thread_id,
                message_data={
                    "type": "task_started",
                    "task_id": task_id,
                    "path": path,
                    "status": "running"
                },
                message_type="task_status",
                include_in_llm_message_history=False
            )
            
            return {"task_id": task_id}
            
        # Register the stop endpoint
        @app.post(
            f"{path}/stop/{{task_id}}", 
            response_model=dict,
            summary=f"Stop {func.__name__}",
            description=f"Stop a running {func.__name__} task",
            tags=["Generated Thread Tasks"]
        )
        async def stop_task(task_id: str):
            if task_id not in _running_tasks:
                raise HTTPException(status_code=404, detail="Task not found")
            
            task_info = _running_tasks[task_id]
            task_info["task"].cancel()
            task_info["status"] = "cancelled"
            
            # Update thread with task cancellation
            await thread_manager.add_message(
                thread_id=task_info["thread_id"],
                message_data={
                    "type": "task_stopped",
                    "task_id": task_id,
                    "path": task_info["path"],
                    "status": "cancelled"
                },
                message_type="task_status",
                include_in_llm_message_history=False
            )
            
            return {"status": "stopped"}
            
        # Register the status endpoint
        @app.get(
            f"{path}/status/{{task_id}}", 
            response_model=dict,
            summary=f"Get {func.__name__} status",
            description=f"Get the status of a {func.__name__} task",
            tags=["Generated Thread Tasks"]
        )
        async def get_status(task_id: str):
            if task_id not in _running_tasks:
                raise HTTPException(status_code=404, detail="Task not found")
                
            task_info = _running_tasks[task_id]
            task = task_info["task"]
            
            if task.done():
                try:
                    result = task.result()
                    status = "completed"
                    if hasattr(result, '__aiter__'):
                        status = "streaming"
                    
                    # Update thread with task completion
                    await thread_manager.add_message(
                        thread_id=task_info["thread_id"],
                        message_data={
                            "type": "task_completed",
                            "task_id": task_id,
                            "path": task_info["path"],
                            "status": status,
                            "result": result if status == "completed" else None
                        },
                        message_type="task_status",
                        include_in_llm_message_history=False
                    )
                    
                    return {
                        "status": status,
                        "result": result if status == "completed" else None
                    }
                    
                except asyncio.CancelledError:
                    return {"status": "cancelled"}
                except Exception as e:
                    error_status = {
                        "status": "failed",
                        "error": str(e)
                    }
                    
                    # Update thread with task failure
                    await thread_manager.add_message(
                        thread_id=task_info["thread_id"],
                        message_data={
                            "type": "task_failed",
                            "task_id": task_id,
                            "path": task_info["path"],
                            "status": "failed",
                            "error": str(e)
                        },
                        message_type="task_status",
                        include_in_llm_message_history=False
                    )
                    
                    return error_status
                    
            return {"status": "running"}

        @wraps(func)
        async def wrapper(*args, **kwargs):
            return await func(*args, **kwargs)
        return wrapper
    return decorator

@app.get("/threads/{thread_id}/tasks")
async def get_thread_tasks(thread_id: str):
    """Get all tasks associated with a thread."""
    if not await thread_manager.thread_exists(thread_id):
        raise HTTPException(status_code=404, detail="Thread not found")
        
    thread_tasks = {
        task_id: {
            "path": info["path"],
            "status": info["status"],
            "started_at": info["started_at"]
        }
        for task_id, info in _running_tasks.items()
        if info["thread_id"] == thread_id
    }
    
    return {"tasks": thread_tasks}

@app.delete("/threads/{thread_id}/tasks")
async def stop_thread_tasks(thread_id: str):
    """Stop all tasks associated with a thread."""
    if not await thread_manager.thread_exists(thread_id):
        raise HTTPException(status_code=404, detail="Thread not found")
        
    stopped_tasks = []
    for task_id, info in list(_running_tasks.items()):
        if info["thread_id"] == thread_id:
            info["task"].cancel()
            info["status"] = "cancelled"
            stopped_tasks.append(task_id)
            
    # Update thread with task cancellations
    if stopped_tasks:
        await thread_manager.add_message(
            thread_id=thread_id,
            message_data={
                "type": "tasks_stopped",
                "task_ids": stopped_tasks,
                "status": "cancelled"
            },
            message_type="task_status",
            include_in_llm_message_history=False
        )
    
    return {"stopped_tasks": stopped_tasks} 