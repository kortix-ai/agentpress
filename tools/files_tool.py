import os
import asyncio
from typing import Dict, Any
from core.tool import Tool, ToolResult
from core.config import settings

class FilesTool(Tool):
    def __init__(self):
        super().__init__()
        self.workspace = settings.workspace_dir
        os.makedirs(self.workspace, exist_ok=True)

    async def create_file(self, file_path: str, content: str) -> ToolResult:
        try:
            full_path = os.path.join(self.workspace, file_path)
            if os.path.exists(full_path):
                return self.fail_response(f"File '{file_path}' already exists. Use update_file to modify existing files.")
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, 'w') as f:
                f.write(content)
            return self.success_response(f"File '{file_path}' created successfully.")
        except Exception as e:
            return self.fail_response(f"Error creating file: {str(e)}")

    async def read_file(self, file_path: str) -> ToolResult:
        try:
            full_path = os.path.join(self.workspace, file_path)
            with open(full_path, 'r') as f:
                content = f.read()
            return self.success_response({"file_path": file_path, "content": content})
        except Exception as e:
            return self.fail_response(f"Error reading file: {str(e)}")

    async def update_file(self, file_path: str, content: str) -> ToolResult:
        try:
            full_path = os.path.join(self.workspace, file_path)
            with open(full_path, 'w') as f:
                f.write(content)
            return self.success_response(f"File '{file_path}' updated successfully.")
        except Exception as e:
            return self.fail_response(f"Error updating file: {str(e)}")

    async def delete_file(self, file_path: str) -> ToolResult:
        try:
            full_path = os.path.join(self.workspace, file_path)
            os.remove(full_path)
            return self.success_response(f"File '{file_path}' deleted successfully.")
        except Exception as e:
            return self.fail_response(f"Error deleting file: {str(e)}")

    def get_schemas(self) -> Dict[str, Dict[str, Any]]:
        schemas = {
            "create_file": {
                "name": "create_file",
                "description": "Create a new file in the workspace",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "The relative path of the file to create"
                        },
                        "content": {
                            "type": "string",
                            "description": "The content to write to the file"
                        }
                    },
                    "required": ["file_path", "content"]
                }
            },
            "read_file": {
                "name": "read_file",
                "description": "Read the contents of a file in the workspace",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "The relative path of the file to read"
                        }
                    },
                    "required": ["file_path"]
                }
            },
            "update_file": {
                "name": "update_file",
                "description": "Update the contents of a file in the workspace",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "The relative path of the file to update"
                        },
                        "content": {
                            "type": "string",
                            "description": "The new content to write to the file"
                        }
                    },
                    "required": ["file_path", "content"]
                }
            },
            "delete_file": {
                "name": "delete_file",
                "description": "Delete a file from the workspace",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "The relative path of the file to delete"
                        }
                    },
                    "required": ["file_path"]
                }
            }
        }
        return {name: self.format_schema(schema) for name, schema in schemas.items()}

if __name__ == "__main__":
    async def test_files_tool():
        files_tool = FilesTool()
        test_file_path = "test_file.txt"
        test_content = "This is a test file."
        updated_content = "This is an updated test file."

        print(f"Using workspace directory: {files_tool.workspace}")

        # Test create_file
        create_result = await files_tool.create_file(test_file_path, test_content)
        print("Create file result:", create_result)

        # Test read_file
        read_result = await files_tool.read_file(test_file_path)
        print("Read file result:", read_result)

        # Test update_file
        update_result = await files_tool.update_file(test_file_path, updated_content)
        print("Update file result:", update_result)

        # Test read_file after update
        read_updated_result = await files_tool.read_file(test_file_path)
        print("Read updated file result:", read_updated_result)

        # Test delete_file
        delete_result = await files_tool.delete_file(test_file_path)
        print("Delete file result:", delete_result)

        # Test read_file after delete (should fail)
        read_deleted_result = await files_tool.read_file(test_file_path)
        print("Read deleted file result:", read_deleted_result)

    asyncio.run(test_files_tool())