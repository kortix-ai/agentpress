"""
API Factory for registering and managing FastAPI endpoints.
"""

import sys
import inspect
import importlib
import pkgutil
import uuid
import asyncio
import logging
import os
from functools import wraps
from typing import Callable, Dict, Any, Optional, List
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import create_model, BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
_decorated_functions: Dict[str, Callable] = {}
_running_tasks: Dict[str, asyncio.Task] = {}

def register_api_endpoint(path: str):
    """Decorator to register a function as an API endpoint with task management."""
    def decorator(func: Callable):
        logger.info(f"Registering API endpoint: {path} for function {func.__name__}")
        _decorated_functions[path] = func
        
        # Create Pydantic model for function parameters
        params = inspect.signature(func).parameters
        model_fields = {
            name: (param.annotation if param.annotation != inspect.Parameter.empty else Any, ... if param.default == inspect.Parameter.empty else param.default)
            for name, param in params.items()
            if name != 'self'  # Skip self parameter for methods
        }
        RequestModel = create_model(f'{func.__name__}Request', **model_fields)
        
        # Register the start endpoint
        @app.post(f"{path}/start", response_model=dict)
        async def start_task(params: Optional[RequestModel] = None):
            logger.info(f"Starting task at {path}/start")
            task_id = str(uuid.uuid4())
            kwargs = params.dict() if params else {}
            _running_tasks[task_id] = asyncio.create_task(func(**kwargs))
            return {"task_id": task_id}
            
        # Register the stop endpoint
        @app.post(f"{path}/stop/{{task_id}}")
        async def stop_task(task_id: str):
            if task_id not in _running_tasks:
                raise HTTPException(status_code=404, detail="Task not found")
            _running_tasks[task_id].cancel()
            return {"status": "stopped"}
            
        # Register the status endpoint
        @app.get(f"{path}/status/{{task_id}}")
        async def get_status(task_id: str):
            if task_id not in _running_tasks:
                raise HTTPException(status_code=404, detail="Task not found")
            task = _running_tasks[task_id]
            
            if task.done():
                try:
                    result = task.result()
                    # Check if this is a streaming response
                    if hasattr(result, '__aiter__') or (
                        isinstance(result, dict) and (
                            any(hasattr(v, '__aiter__') for v in result.values()) or
                            # Check for streaming responses in iterations
                            (
                                'iterations' in result and 
                                result['iterations'] and 
                                any(hasattr(r.get('response'), '__aiter__') for r in result['iterations'])
                            )
                        )
                    ):
                        return {"status": "streaming"}
                    return {"status": "completed", "result": result}
                except asyncio.CancelledError:
                    return {"status": "cancelled"}
                except Exception as e:
                    return {"status": "failed", "error": str(e)}
            return {"status": "running"}
            
        # Also register a direct endpoint for simple calls
        @app.post(path)
        async def direct_call(background_tasks: BackgroundTasks, params: Optional[RequestModel] = None):
            kwargs = params.dict() if params else {}
            task_id = str(uuid.uuid4())
            task = asyncio.create_task(func(**kwargs))
            _running_tasks[task_id] = task
            return {"task_id": task_id}
        
        logger.info(f"Successfully registered all endpoints for {path}")
        
        @wraps(func)
        async def wrapper(*args, **kwargs):
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def find_project_root() -> str:
    """Find the project root by looking for pyproject.toml."""
    current = os.path.abspath(os.path.dirname(__file__))
    while current != '/':
        if os.path.exists(os.path.join(current, 'pyproject.toml')):
            return current
        current = os.path.dirname(current)
    return os.path.dirname(__file__)  # Fallback to current directory

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
                            # Check if this function has been decorated with @task
                            if any(
                                path for path, func in _decorated_functions.items()
                                if func.__name__ == obj.__name__ and func.__module__ == obj.__module__
                            ):
                                logger.info(f"Found already registered function: {obj.__name__}")
                                continue
                                
                            # Check for our decorator in the function's closure
                            if hasattr(obj, '__closure__') and obj.__closure__:
                                for cell in obj.__closure__:
                                    if cell.cell_contents in _decorated_functions.values():
                                        # Found a decorated function that wasn't registered
                                        path = next(
                                            p for p, f in _decorated_functions.items()
                                            if f == cell.cell_contents
                                        )
                                        _decorated_functions[path] = obj
                                        logger.info(f"Registered function: {obj.__name__} at path: {path}")
                                    
                except Exception as e:
                    logger.error(f"Error importing {module_name}: {e}")

    logger.info(f"Task discovery complete. Registered paths: {list(_decorated_functions.keys())}")

# Auto-discover tasks on import
discover_tasks() 