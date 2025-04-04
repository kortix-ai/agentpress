import os
import asyncio
from agentpress.tool import Tool, ToolResult, openapi_schema, xml_schema
from typing import Optional

class TerminalTool(Tool):
    """Terminal command execution tool for workspace operations."""
    
    def __init__(self):
        super().__init__()
        self.workspace = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'workspace')
        os.makedirs(self.workspace, exist_ok=True)

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "execute_command",
            "description": "Request to execute a CLI command on the system. Use this when you need to perform system operations or run specific commands to accomplish any step in the user's task.",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "The CLI command to execute. This should be valid for the current operating system. Ensure the command is properly formatted and does not contain any harmful instructions."
                    },
                    "requires_approval": {
                        "type": "boolean",
                        "description": "A boolean indicating whether this command requires explicit user approval before execution in case the user has auto-approve mode enabled. Set to 'true' for potentially impactful operations like installing/uninstalling packages, deleting/overwriting files, system configuration changes, network operations, or any commands that could have unintended side effects. Set to 'false' for safe operations like reading files/directories, running development servers, building projects, and other non-destructive operations."
                    }
                },
                "required": ["command", "requires_approval"]
            }
        }
    })
    @xml_schema(
        tag_name="execute_command",
        mappings=[
            {"param_name": "command", "node_type": "element", "path": "command"},
            {"param_name": "requires_approval", "node_type": "element", "path": "requires_approval"}
        ],
        example='''
        <execute_command>
        <command>npm install react</command>
        <requires_approval>true</requires_approval>
        </execute_command>
        '''
    )
    async def execute_command(self, command: str, requires_approval: bool) -> ToolResult:
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
            