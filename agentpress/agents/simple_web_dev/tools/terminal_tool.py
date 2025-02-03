import os
import asyncio
import subprocess
from agentpress.tool import Tool, ToolResult, openapi_schema, xml_schema
from typing import Optional

class TerminalTool(Tool):
    """Terminal command execution tool for workspace operations."""
    
    def __init__(self, thread_id: Optional[str] = None):
        super().__init__()
        self.workspace = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'workspace')
        os.makedirs(self.workspace, exist_ok=True)

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
            {"param_name": "command", "node_type": "content", "path": "."}
        ],
        example='''
        <execute-command>
        npm install package-name
        </execute-command>
        '''
    )
    async def execute_command(self, command: str) -> ToolResult:
        original_dir = os.getcwd()
        try:
            os.chdir(self.workspace)
            
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.workspace
            )
            stdout, stderr = await process.communicate()
            
            output = stdout.decode() if stdout else ""
            error = stderr.decode() if stderr else ""
            success = process.returncode == 0
            
            if success:
                return self.success_response({
                    "output": output,
                    "error": error,
                    "exit_code": process.returncode,
                    "cwd": self.workspace
                })
            else:
                return self.fail_response(f"Command failed with exit code {process.returncode}: {error}")
                
        except Exception as e:
            return self.fail_response(f"Error executing command: {str(e)}")
        finally:
            os.chdir(original_dir)
