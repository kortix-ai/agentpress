import os
import asyncio
import subprocess
from agentpress.tool import Tool, ToolResult, openapi_schema, xml_schema
from agentpress.state_manager import StateManager

class TerminalTool(Tool):
    """Terminal command execution tool for workspace operations."""
    
    def __init__(self):
        super().__init__()
        self.workspace = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'workspace')
        os.makedirs(self.workspace, exist_ok=True)
        self.state_manager = StateManager("state.json")
        
    async def _update_command_history(self, command: str, output: str, success: bool):
        """Update command history in state"""
        history = await self.state_manager.get("terminal_history") or []
        history.append({
            "command": command,
            "output": output,
            "success": success,
            "cwd": os.path.relpath(os.getcwd(), self.workspace)
        })
        await self.state_manager.set("terminal_history", history)

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
            
            await self._update_command_history(
                command=command,
                output=output + error,
                success=success
            )
            
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
            await self._update_command_history(
                command=command,
                output=str(e),
                success=False
            )
            return self.fail_response(f"Error executing command: {str(e)}")
        finally:
            os.chdir(original_dir)
