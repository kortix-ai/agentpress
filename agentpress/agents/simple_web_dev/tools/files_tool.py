import os
import asyncio
from pathlib import Path
from agentpress.tool import Tool, ToolResult, openapi_schema, xml_schema
from agentpress.state_manager import StateManager

class FilesTool(Tool):
    """File management tool for creating, updating, and deleting files.
    
    This tool provides file operations within a workspace directory, with built-in
    file filtering and state tracking capabilities.
    
    Attributes:
        workspace (str): Path to the workspace directory
        EXCLUDED_FILES (set): Files to exclude from operations
        EXCLUDED_DIRS (set): Directories to exclude
        EXCLUDED_EXT (set): File extensions to exclude
        SNIPPET_LINES (int): Context lines for edit previews
    """
    
    # Excluded files, directories, and extensions
    EXCLUDED_FILES = {
        ".DS_Store",
        ".gitignore",
        "package-lock.json",
        "postcss.config.js",
        "postcss.config.mjs",
        "jsconfig.json",
        "components.json",
        "tsconfig.tsbuildinfo",
        "tsconfig.json",
    }

    EXCLUDED_DIRS = {
        "node_modules",
        ".next",
        "dist",
        "build",
        ".git"
    }

    EXCLUDED_EXT = {
        ".ico",
        ".svg",
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".bmp",
        ".tiff",
        ".webp",
        ".db",
        ".sql"
    }

    def __init__(self):
        super().__init__()
        self.workspace = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'workspace')
        os.makedirs(self.workspace, exist_ok=True)
        self.state_manager = StateManager("state.json")
        self.SNIPPET_LINES = 4  # Number of context lines to show around edits
        asyncio.create_task(self._init_workspace_state())

    def _should_exclude_file(self, rel_path: str) -> bool:
        """Check if a file should be excluded based on path, name, or extension"""
        # Check filename
        filename = os.path.basename(rel_path)
        if filename in self.EXCLUDED_FILES:
            return True

        # Check directory
        dir_path = os.path.dirname(rel_path)
        if any(excluded in dir_path for excluded in self.EXCLUDED_DIRS):
            return True

        # Check extension
        _, ext = os.path.splitext(filename)
        if ext.lower() in self.EXCLUDED_EXT:
            return True

        return False

    async def _init_workspace_state(self):
        """Initialize or update the workspace state in JSON"""
        files_state = {}
        
        # Walk through workspace and record all files
        for root, _, files in os.walk(self.workspace):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, self.workspace)

                # Skip excluded files
                if self._should_exclude_file(rel_path):
                    continue

                try:
                    with open(full_path, 'r') as f:
                        content = f.read()
                    files_state[rel_path] = {
                        "content": content
                    }
                except Exception as e:
                    print(f"Error reading file {rel_path}: {e}")
                except UnicodeDecodeError:
                    print(f"Skipping binary file: {rel_path}")

        await self.state_manager.set("files", files_state)

    async def _update_workspace_state(self):
        """Update the workspace state after any file operation"""
        await self._init_workspace_state()

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "create_file",
            "description": "Create a new file with the provided contents at a given path in the workspace",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to the file to be created"
                    },
                    "file_contents": {
                        "type": "string",
                        "description": "The content to write to the file"
                    }
                },
                "required": ["file_path", "file_contents"]
            }
        }
    })
    @xml_schema(
        tag_name="create-file",
        mappings=[
            {"param_name": "file_path", "node_type": "attribute", "path": "."},
            {"param_name": "file_contents", "node_type": "content", "path": "."}
        ],
        example='''
        <create-file file_path="path/to/file">
        File contents go here
        </create-file>
        '''
    )
    async def create_file(self, file_path: str, file_contents: str) -> ToolResult:
        try:
            full_path = os.path.join(self.workspace, file_path)
            if os.path.exists(full_path):
                return self.fail_response(f"File '{file_path}' already exists. Use update_file to modify existing files.")
            
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, 'w') as f:
                f.write(file_contents)
            
            await self._update_workspace_state()
            return self.success_response(f"File '{file_path}' created successfully.")
        except Exception as e:
            return self.fail_response(f"Error creating file: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "delete_file",
            "description": "Delete a file at the given path",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to the file to be deleted"
                    }
                },
                "required": ["file_path"]
            }
        }
    })
    @xml_schema(
        tag_name="delete-file",
        mappings=[
            {"param_name": "file_path", "node_type": "attribute", "path": "."}
        ],
        example='''
        <delete-file file_path="path/to/file">
        </delete-file>
        '''
    )
    async def delete_file(self, file_path: str) -> ToolResult:
        try:
            full_path = os.path.join(self.workspace, file_path)
            os.remove(full_path)
            
            await self._update_workspace_state()
            return self.success_response(f"File '{file_path}' deleted successfully.")
        except Exception as e:
            return self.fail_response(f"Error deleting file: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "str_replace",
            "description": "Replace text in file",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to the target file"
                    },
                    "old_str": {
                        "type": "string",
                        "description": "Text to be replaced (must appear exactly once)"
                    },
                    "new_str": {
                        "type": "string",
                        "description": "Replacement text"
                    }
                },
                "required": ["file_path", "old_str", "new_str"]
            }
        }
    })
    @xml_schema(
        tag_name="str-replace",
        mappings=[
            {"param_name": "file_path", "node_type": "attribute", "path": "file_path"},
            {"param_name": "old_str", "node_type": "element", "path": "old_str"},
            {"param_name": "new_str", "node_type": "element", "path": "new_str"}
        ],
        example='''
        <str-replace file_path="path/to/file">
            <old_str>text to replace</old_str>
            <new_str>replacement text</new_str>
        </str-replace>
        '''
    )
    async def str_replace(self, file_path: str, old_str: str, new_str: str) -> ToolResult:
        try:
            full_path = Path(os.path.join(self.workspace, file_path))
            if not full_path.exists():
                return self.fail_response(f"File '{file_path}' does not exist")
                
            content = full_path.read_text().expandtabs()
            old_str = old_str.expandtabs()
            new_str = new_str.expandtabs()
            
            occurrences = content.count(old_str)
            if occurrences == 0:
                return self.fail_response(f"String '{old_str}' not found in file")
            if occurrences > 1:
                lines = [i+1 for i, line in enumerate(content.split('\n')) if old_str in line]
                return self.fail_response(f"Multiple occurrences found in lines {lines}. Please ensure string is unique")
            
            # Perform replacement
            new_content = content.replace(old_str, new_str)
            full_path.write_text(new_content)
            
            # Show snippet around the edit
            replacement_line = content.split(old_str)[0].count('\n')
            start_line = max(0, replacement_line - self.SNIPPET_LINES)
            end_line = replacement_line + self.SNIPPET_LINES + new_str.count('\n')
            snippet = '\n'.join(new_content.split('\n')[start_line:end_line + 1])
            
            return self.success_response(f"Replacement successful. Snippet of changes:\n{snippet}")
            
        except Exception as e:
            return self.fail_response(f"Error replacing string: {str(e)}")

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

        # Test delete_file
        delete_result = await files_tool.delete_file(test_file_path)
        print("Delete file result:", delete_result)

        # Test read_file after delete (should fail)
        read_deleted_result = await files_tool.read_file(test_file_path)
        print("Read deleted file result:", read_deleted_result)

    asyncio.run(test_files_tool())