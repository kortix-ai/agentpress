import traceback
import requests

from agentpress.tool import ToolResult, openapi_schema, xml_schema
from agent.tools.utils.daytona_sandbox import SandboxToolsBase
from utils.logger import logger


# TODO: might want to be more granular with the tool names:


# browser_click - Click on elements in the current browser page. Use when clicking page elements is needed.
# browser_input - Overwrite text in editable elements on the current browser page. Use when filling content in input fields.
# browser_move_mouse - Move cursor to specified position on the current browser page. Use when simulating user mouse movement.
# browser_press_key - Simulate key press in the current browser page. Use when specific keyboard operations are needed.
# browser_select_option - Select specified option from dropdown list element in the current browser page. Use when selecting dropdown menu options.
# browser_scroll_up - Scroll up the current browser page. Use when viewing content above or returning to page top.
# browser_scroll_down - Scroll down the current browser page. Use when viewing content below or jumping to page bottom.


# browser_view - View content of the current browser page. Use for checking the latest state of previously opened pages.
# browser_navigate - Navigate browser to specified URL. Use when accessing new pages is needed.
# browser_restart - Restart browser and navigate to specified URL. Use when browser state needs to be reset.
# browser_console_exec - Execute JavaScript code in browser console. Use when custom scripts need to be executed.
# browser_console_view - View browser console output. Use when checking JavaScript logs or debugging page errors.


class SandboxBrowseTool(SandboxToolsBase):
    """Tool for executing tasks in a Daytona sandbox with browser-use capabilities."""
    
    def __init__(self, sandbox_id: str, password: str):
        super().__init__(sandbox_id, password)

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "execute_browser_action",
            "description": "Execute a simple browser action in the sandbox environment based on current state",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_description": {
                        "type": "string",
                        "description": "A simple action to do on the browser based on current state"
                    }
                },
                "required": ["task_description"]
            }
        }
    })
    @xml_schema(
        tag_name="execute-browser-action",
        mappings=[
            {"param_name": "task_description", "node_type": "content", "path": "."}
        ],
        example='''
        <execute-browser-action>
        a simple action to do on the browser based on current state
        </execute-browser-action>
        '''
    )
    async def execute_browser_action(self, task_description: str) -> ToolResult:
        """Execute a browser task in the sandbox environment using browser-use
        
        Args:
            task_description (str): The task to execute
            
        Returns:
            dict: Result of the execution
        """
        print(f"\033[95mExecuting browser action: {task_description}\033[0m")
        try:
            
            
            logger.info(f"Making API call to {self.api_url}/run-task with task: {task_description}")
            
            # Make the API call to our FastAPI endpoint
            response = requests.post(
                f"{self.api_url}/run-task",
                json={"task_description": task_description},
                timeout=None
            )
            
            if response.status_code == 200:
                logger.info("API call completed successfully")
                print(response.json())
                return self.success_response(response.json())
            else:
                logger.error(f"API call failed with status code {response.status_code}: {response.text}")
                return self.fail_response(f"API call failed with status code {response.status_code}: {response.text}")

        except Exception as e:
            logger.error(f"Error executing browser action: {e}")
            print(traceback.format_exc())
            return self.fail_response(f"Error executing browser action: {e}")
