from daytona_sdk.process import SessionExecuteRequest

from agentpress.tool import ToolResult, openapi_schema, xml_schema
from agent.tools.utils.daytona_sandbox import SandboxToolsBase, Sandbox

class SandboxWebsiteTool(SandboxToolsBase):
    """Tool for executing tasks in a Daytona sandbox with browser-use capabilities."""

    def __init__(self, sandbox: Sandbox):
        super().__init__(sandbox)

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "update_website_file",
            "description": "Upload or update a file in the website server's site directory",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path where the file should be saved, relative to the site directory"
                    },
                    "content": {
                        "type": "string",
                        "description": "Content to write to the file"
                    },
                    "create_dirs": {
                        "type": "boolean",
                        "description": "Create parent directories if they don't exist",
                        "default": True
                    }
                },
                "required": ["file_path", "content"]
            }
        }
    })
    @xml_schema(
        tag_name="update-website-file",
        mappings=[
            {"param_name": "file_path", "node_type": "attribute", "path": "@path"},
            {"param_name": "content", "node_type": "content", "path": "."},
            {"param_name": "create_dirs", "node_type": "attribute", "path": "@create_dirs"}
        ],
        example='''
        <update-website-file path="index.html" create_dirs="true">
        <!DOCTYPE html>
        <html>
        <head>
            <title>My Website</title>
        </head>
        <body>
            <h1>Hello World!</h1>
        </body>
        </html>
        </update-website-file>
        '''
    )
    async def update_website_file(self, file_path: str, content: str, create_dirs: bool = True) -> ToolResult:
        print(f"\033[33mUpdating website file: {file_path}\033[0m")
        try:

            site_dir = f"{self.workspace_path}/site"
            full_path = f"{site_dir}/{file_path}"

            # Create the site directory if it doesn't exist
            self.sandbox.fs.create_folder(site_dir, "755")

            # Create parent directories if needed
            if create_dirs and '/' in file_path:
                parent_dir = '/'.join(file_path.split('/')[:-1])
                if parent_dir:
                    parent_path = f"{site_dir}/{parent_dir}"
                    self.sandbox.fs.create_folder(parent_path, "755")

            # Write the file content using the SDK
            self.sandbox.fs.upload_file(full_path, content.encode())

            # Set appropriate permissions for web serving
            self.sandbox.fs.set_file_permissions(full_path, "644")

            # Kill and restart the website server session
            self.sandbox.process.delete_session('sandbox_website_server')
            self.sandbox.process.create_session('sandbox_website_server')
            self.sandbox.process.execute_session_command('sandbox_website_server', SessionExecuteRequest(
                command="python " + self.sandbox.get_user_root_dir() + "/website_server.py",
                var_async=True
            ))

            return self.success_response({
                "message": f"File updated successfully at {file_path}",
                "path": file_path,
                "site_url": self.sandbox.get_preview_link(8080)
            })

        except Exception as e:
            return self.fail_response(f"Error updating website file: {str(e)}")
