from agentpress.tool import ToolResult, openapi_schema, xml_schema
from agent.tools.utils.daytona_sandbox import SandboxToolsBase

# TODO: might want to be more granular with the tool names:
# file_read - Read file content. Use for checking file contents, analyzing logs, or reading configuration files.
# file_write - Overwrite or append content to a file. Use for creating new files, appending content, or modifying existing files.
# file_str_replace - Replace specified string in a file. Use for updating specific content in files or fixing errors in code.
# file_find_in_content - Search for matching text within file content. Use for finding specific content or patterns in files.
# file_find_by_name - Find files by name pattern in specified directory. Use for locating files with specific naming patterns.
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
