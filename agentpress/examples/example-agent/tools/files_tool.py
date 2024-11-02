import os
import asyncio
from datetime import datetime
from pathlib import Path
from collections import defaultdict
from typing import Optional, List
from agentpress.tool import Tool, ToolResult, tool_schema
from agentpress.state_manager import StateManager

class FilesTool(Tool):
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

    @tool_schema({
        "name": "create_file",
        "description": "Create a new file with the provided contents at a given path in the workspace",
        "parameters": {
            "type": "object",
            "properties": {
                "file_path": {"type": "string", "description": "Path to the file to be created."},
                "content": {"type": "string", "description": "The content to write to the file"}
            },
            "required": ["file_path", "content"]
        }
    })
    async def create_file(self, file_path: str, content: str) -> ToolResult:
        try:
            full_path = os.path.join(self.workspace, file_path)
            if os.path.exists(full_path):
                return self.fail_response(f"File '{file_path}' already exists. Use update_file to modify existing files.")
            
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, 'w') as f:
                f.write(content)
            
            await self._update_workspace_state()
            return self.success_response(f"File '{file_path}' created successfully.")
        except Exception as e:
            return self.fail_response(f"Error creating file: {str(e)}")

    @tool_schema({
        "name": "delete_file",
        "description": "Delete a file at the given path in the workspace.",
        "parameters": {
            "type": "object",
            "properties": {
                "file_path": {"type": "string", "description": "Path to the file to be deleted."}
            },
            "required": ["file_path"]
        }
    })
    async def delete_file(self, file_path: str) -> ToolResult:
        try:
            full_path = os.path.join(self.workspace, file_path)
            os.remove(full_path)
            
            await self._update_workspace_state()
            return self.success_response(f"File '{file_path}' deleted successfully.")
        except Exception as e:
            return self.fail_response(f"Error deleting file: {str(e)}")

    @tool_schema({
        "name": "str_replace",
        "description": "Replace a string with another string in a file",
        "parameters": {
            "type": "object",
            "properties": {
                "file_path": {"type": "string", "description": "Path to the file"},
                "old_str": {"type": "string", "description": "String to replace"},
                "new_str": {"type": "string", "description": "Replacement string"}
            },
            "required": ["file_path", "old_str", "new_str"]
        }
    })
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