from agentpress.tool import ToolResult, openapi_schema, xml_schema
from agent.tools.utils.daytona_sandbox import SandboxToolsBase


class SandboxShellTool(SandboxToolsBase):
    """Tool for executing tasks in a Daytona sandbox with browser-use capabilities."""

    def __init__(self, sandbox_id: str, password: str):
        super().__init__(sandbox_id, password)
        

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "execute_command",
            "description": "Execute a shell command in the workspace directory",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "The shell command to execute"
                    }
                },
                "required": ["command"]
            }
        }
    })
    @xml_schema(
        tag_name="execute-command",
        mappings=[
            {"param_name": "command", "node_type": "content", "path": "."},
        ],
        example='''
        <execute-command>
        npm install package-name
        </execute-command>
        '''
    )
    async def execute_command(self, command: str, folder: str = None) -> ToolResult:
        try:
            folder = folder or self.sandbox.get_user_root_dir()
            response = self.sandbox.process.exec(command, cwd=folder, timeout=60)
            
            if response.exit_code == 0:
                return self.success_response({
                    "output": response.result,
                    "error": "",
                    "exit_code": response.exit_code,
                    "cwd": folder
                })
            else:
                return self.fail_response(f"Command failed with exit code {response.exit_code}: {response.result}")
                
        except Exception as e:
            return self.fail_response(f"Error executing command: {str(e)}")
