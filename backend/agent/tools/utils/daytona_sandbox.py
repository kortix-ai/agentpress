import os
import requests
from time import sleep

from daytona_sdk import Daytona, DaytonaConfig, CreateSandboxParams, SessionExecuteRequest
from dotenv import load_dotenv

from agentpress.tool import Tool
from utils.logger import logger

load_dotenv()

config = DaytonaConfig(
    api_key=os.getenv("DAYTONA_API_KEY"),
    server_url=os.getenv("DAYTONA_SERVER_URL"),
    target=os.getenv("DAYTONA_TARGET")
)
daytona = Daytona(config)


sandbox_browser_api = b'''
import traceback
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from browser_use import Agent, Browser
from browser_use.browser.context import BrowserContextConfig, BrowserContextWindowSize
from langchain_openai import ChatOpenAI
import uvicorn
from contextlib import asynccontextmanager
import logging
import logging.handlers
import os

# Configure logging
log_dir = "/var/log/kortix"
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, "kortix_api.log")

logger = logging.getLogger("kortix_api")
logger.setLevel(logging.INFO)

# Create rotating file handler
file_handler = logging.handlers.RotatingFileHandler(
    log_file,
    maxBytes=10485760,  # 10MB
    backupCount=5
)
file_handler.setFormatter(
    logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
)
logger.addHandler(file_handler)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize browser on startup
    global browser
    try:
        browser = Browser()
        logger.info("Browser initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing browser: {str(e)}")
        logger.error(traceback.format_exc())
    yield
    # Clean up resources at shutdown if needed

app = FastAPI(lifespan=lifespan)

# Global variables to maintain browser state
browser = None
browser_context = None
agent = None

class TaskRequest(BaseModel):
    task_description: str

@app.post("/run-task")
async def run_task(request: TaskRequest):
    global browser, browser_context, agent
    
    if not browser:
        try:
            browser = Browser()
        except Exception as e:
            error_msg = f"Failed to initialize browser: {str(e)}"
            logger.error(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)
    
    try:
        # Create a browser context if it doesn't exist
        if not browser_context:
            browser_context = await browser.new_context(
                config=BrowserContextConfig(
                    browser_window_size=BrowserContextWindowSize(
                        width=1280, height=800
                    ),
                )
            )
            logger.info("Created new browser context")
        
        # Create a new agent for each task
        agent = Agent(
            task=request.task_description,
            llm=ChatOpenAI(model="gpt-4o"),
            browser=browser,
            browser_context=browser_context
        )
        logger.info(f"Starting task: {request.task_description}")
        
        result = await agent.run()
        
        # Format the history for response
        history = []
        for h in result.history:
            logger.debug(f"Task history entry: {h}")
            history.append(str(h))
            
        logger.info("Task completed successfully")
        return {
            "status": "success", 
            "history": history
        }
        
    except Exception as e:
        error_traceback = traceback.format_exc()
        logger.error(f"Error during task execution: {str(e)}")
        logger.error(error_traceback)
        raise HTTPException(
            status_code=500, 
            detail={
                "status": "error", 
                "error": str(e), 
                "traceback": error_traceback
            }
        )

@app.get("/health")
async def health_check():
    status = {
        "status": "healthy",
        "browser_initialized": browser is not None,
        "context_initialized": browser_context is not None
    }
    logger.debug(f"Health check: {status}")
    return status

if __name__ == "__main__":
    logger.info("Starting Kortix API server")
    uvicorn.run(app, host="0.0.0.0", port=8000)
'''

sandbox_website_server = b'''
import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
import logging
import logging.handlers

# Configure logging
log_dir = "/var/log/kortix"
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, "website_server.log")

logger = logging.getLogger("website_server")
logger.setLevel(logging.INFO)

# Create rotating file handler
file_handler = logging.handlers.RotatingFileHandler(
    log_file, 
    maxBytes=10485760,  # 10MB
    backupCount=5
)
file_handler.setFormatter(
    logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
)
logger.addHandler(file_handler)

app = FastAPI()

# Create site directory if it doesn't exist
site_dir = "/workspace/site"
os.makedirs(site_dir, exist_ok=True)

# Mount the static files directory
app.mount("/", StaticFiles(directory=site_dir, html=True), name="site")

@app.get("/health")
async def health_check():
    status = {
        "status": "healthy"
    }
    logger.debug(f"Health check: {status}")
    return status

if __name__ == "__main__":
    logger.info("Starting website server")
    uvicorn.run(app, host="0.0.0.0", port=8080)
'''


def create_sandbox(password: str):
    sandbox = daytona.create(CreateSandboxParams(
        image="adamcohenhillel/kortix-browser-use:0.0.1",
        env_vars={
            "CHROME_PERSISTENT_SESSION": "true",
            "RESOLUTION": "1920x1080x24",
            "RESOLUTION_WIDTH": "1920",
            "RESOLUTION_HEIGHT": "1080",
            "VNC_PASSWORD": password,
            "OPENAI_ENDPOINT": "https://api.openai.com/v1",
            "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
            "ANTHROPIC_API_KEY": "",
            "ANTHROPIC_ENDPOINT": "https://api.anthropic.com",
            "GOOGLE_API_KEY": "",
            "AZURE_OPENAI_ENDPOINT": "",
            "AZURE_OPENAI_API_KEY": "",
            "AZURE_OPENAI_API_VERSION": "2025-01-01-preview",
            "DEEPSEEK_ENDPOINT": "https://api.deepseek.com",
            "DEEPSEEK_API_KEY": "",
            "OLLAMA_ENDPOINT": "http://localhost:11434",
            "ANONYMIZED_TELEMETRY": "false",
            "BROWSER_USE_LOGGING_LEVEL": "info",
            "CHROME_PATH": "",
            "CHROME_USER_DATA": "",
            "CHROME_DEBUGGING_PORT": "9222",
            "CHROME_DEBUGGING_HOST": "localhost",
            "CHROME_CDP": ""
        },
        ports=[
            7788,  # Gradio default port
            6080,  # noVNC web interface
            5901,  # VNC port
            9222,  # Chrome remote debugging port
            8000,  # FastAPI port
            8080   # HTTP website port
        ]
    ))
    sandbox.fs.upload_file(sandbox.get_user_root_dir() + "/browser_api.py", sandbox_browser_api)
    sandbox.fs.upload_file(sandbox.get_user_root_dir() + "/website_server.py", sandbox_website_server)
    sandbox.process.create_session('sandbox_browser_api')
    sandbox.process.create_session('sandbox_website_server')
    rsp = sandbox.process.execute_session_command('sandbox_browser_api', SessionExecuteRequest(
        command="python " + sandbox.get_user_root_dir() + "/browser_api.py",
        var_async=True
    ))
    rsp2 = sandbox.process.execute_session_command('sandbox_website_server', SessionExecuteRequest(
        command="python " + sandbox.get_user_root_dir() + "/website_server.py",
        var_async=True
    ))
    times = 0
    success = False
    api_url = sandbox.get_preview_link(8000)
    while times < 10:
        times += 1
        logger.info(f"Waiting for API to be ready...")
        # Make the API call to our FastAPI endpoint
        response = requests.get(f"{api_url}/health")
        if response.status_code == 200:
            logger.info(f"API call completed successfully")
            success = True
            break
        else:
            sleep(1)

    if not success:
        raise Exception("API call failed")
    
    logger.info(f"Executed command {rsp}")
    logger.info(f"Executed command {rsp2}")
    logger.info(f"Created kortix_browser_use_api session `kortix_browser_use_api`")
    return sandbox


class SandboxToolsBase(Tool):
    """Tool for executing tasks in a Daytona sandbox with browser-use capabilities."""
    
    def __init__(self, sandbox_id: str, password: str):
        super().__init__()
        self.sandbox = None
        self.daytona = daytona

        self.sandbox_id = sandbox_id
        try:
            self.sandbox = self.daytona.get_current_sandbox(self.sandbox_id)
        except Exception as e:
            logger.error(f"Error getting sandbox: {e}")
            raise e

        self.api_url = self.sandbox.get_preview_link(8000)
        
        print("\033[95m***")
        print(self.sandbox.get_preview_link(6080))
        print(self.sandbox.get_preview_link(8080))
        print("***\033[0m")