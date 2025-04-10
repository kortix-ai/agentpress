from agentpress.tool import ToolResult, openapi_schema, xml_schema
from agent.tools.utils.daytona_sandbox import SandboxToolsBase

# TODO: might want to be more granular with the tool names:
# shell_exec - Execute commands in a specified shell session. Use for running code, installing packages, or managing files.
# shell_view - View the content of a specified shell session. Use for checking command execution results or monitoring output.
# shell_wait - Wait for the running process in a specified shell session to return. Use after running commands that require longer runtime.
# shell_write_to_process - Write input to a running process in a specified shell session. Use for responding to interactive command prompts.
# shell_kill_process - Terminate a running process in a specified shell session. Use for stopping long-running processes or handling frozen commands.



class SandboxShellTool(SandboxToolsBase):
    """Tool for executing tasks in a Daytona sandbox with browser-use capabilities."""

    def __init__(self, sandbox_id: str, password: str):
        super().__init__(sandbox_id, password)
        

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "execute_command",
            "description": "Execute a shell command in the workspace directory. Working directory is the workspace directory.",
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
            folder = folder or self.workspace_path
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



async def test_shell_tool():
    shell_tool = SandboxShellTool(
        sandbox_id="sandbox-15a2c059",
        password="vvv"
    )
    print("1)", "*"*10)  
    res = await shell_tool.execute_command("ls -l")
    print(res)
