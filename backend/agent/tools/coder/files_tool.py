import os
import asyncio
import re
from pathlib import Path
from agentpress.tool import Tool, ToolResult, openapi_schema, xml_schema
from typing import Dict, Optional, List
from .utils.exclusions import should_exclude_file

class FilesTool(Tool):
    """File management tool for creating, updating, and deleting files.
    
    This tool provides file operations within a workspace directory, with built-in
    file filtering and state tracking capabilities.
    
    Attributes:
        workspace (str): Path to the workspace directory
        SNIPPET_LINES (int): Context lines for edit previews
    """
    
    def __init__(self):
        super().__init__()
        self.workspace = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'workspace')
        os.makedirs(self.workspace, exist_ok=True)
        self.SNIPPET_LINES = 4  # Number of context lines to show around edits

    async def get_workspace_state(self) -> Dict:
        """Get the current workspace state by reading all files"""
        files_state = {}
        
        for root, _, files in os.walk(self.workspace):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, self.workspace)

                # Skip excluded files
                if should_exclude_file(rel_path):
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

        return files_state
    
    @openapi_schema({
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read the contents of a file at the specified path.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "The path of the file to read (relative to workspace)"
                    },
                    "start_line": {
                        "type": "integer",
                        "description": "The one-indexed line number to start reading from (inclusive)",
                        "default": 1
                    },
                    "end_line": {
                        "type": "integer",
                        "description": "The one-indexed line number to end reading at (inclusive)",
                        "default": 250
                    },
                    "read_entire": {
                        "type": "boolean",
                        "description": "Whether to read the entire file",
                        "default": False
                    }
                },
                "required": ["path"]
            }
        }
    })
    @xml_schema(
        tag_name="read_file",
        mappings=[
            {"param_name": "path", "node_type": "attribute", "path": "."},
            {"param_name": "start_line", "node_type": "attribute", "path": "."},
            {"param_name": "end_line", "node_type": "attribute", "path": "."},
            {"param_name": "read_entire", "node_type": "attribute", "path": "."}
        ],
        example='''
<read_file path="File path here" start_line="1" end_line="20" read_entire="false">
</read_file>
'''
    )
    async def read_file(self, path: str, start_line: int = 1, 
                        end_line: int = 250, read_entire: bool = False) -> ToolResult:
        """Read the contents of a file at the specified path.
        
        Args:
            path: The path of the file to read (relative to workspace)
            start_line: The one-indexed line number to start reading from (inclusive)
            end_line: The one-indexed line number to end reading at (inclusive)
            read_entire: Whether to read the entire file
            
        Returns:
            Success with file content or failure with error message
        """
        try:
            full_path = os.path.join(self.workspace, path)
            if not os.path.exists(full_path):
                return self.fail_response(f"File '{path}' does not exist")
            
            # Read file content
            try:
                with open(full_path, 'r') as f:
                    all_lines = f.readlines()
            except UnicodeDecodeError:
                return self.fail_response(f"Cannot read binary file: {path}")
                
            total_lines = len(all_lines)
            
            # Determine range to read
            if read_entire:
                content = ''.join(all_lines)
                return self.success_response({
                    "content": content,
                    "start_line": 1,
                    "end_line": total_lines,
                    "total_lines": total_lines
                })
            
            # Validate line ranges
            if start_line < 1:
                start_line = 1
            if end_line > total_lines:
                end_line = total_lines
            if end_line < start_line:
                return self.fail_response(f"Invalid line range: end line {end_line} is before start line {start_line}")
                
            # Cap to maximum viewable lines (250)
            if end_line - start_line + 1 > 250:
                end_line = start_line + 249
                
            # Convert to 0-indexed for Python
            start_idx = start_line - 1
            end_idx = end_line - 1
            
            # Extract requested lines
            selected_lines = all_lines[start_idx:end_idx + 1]
            content = ''.join(selected_lines)
            
            # Create summary of lines outside the range
            summary = ""
            if start_line > 1:
                summary += f"[Lines 1-{start_line-1} not shown]\n"
            if end_line < total_lines:
                summary += f"[Lines {end_line+1}-{total_lines} not shown]"
                
            return self.success_response({
                "content": content,
                "start_line": start_line,
                "end_line": end_line,
                "total_lines": total_lines,
                "summary": summary.strip()
            })
                
        except Exception as e:
            return self.fail_response(f"Error reading file: {str(e)}")
   
    @openapi_schema({
        "type": "function",
        "function": {
            "name": "write_to_file",
            "description": "Write content to a file, overwriting if it exists or creating a new file.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "The path of the file to write to"
                    },
                    "content": {
                        "type": "string",
                        "description": "The content to write to the file"
                    }
                },
                "required": ["path", "content"]
            }
        }
    })
    @xml_schema(
        tag_name="write_to_file",
        mappings=[
            {"param_name": "path", "node_type": "attribute", "path": "."},
            {"param_name": "content", "node_type": "text", "path": "."}
        ],
        example='''
<write_to_file path="File path here">
Your file content here
</write_to_file>
        '''
    )
    async def write_to_file(self, path: str, content: str) -> ToolResult:
        """Write content to a file, overwriting if it exists or creating a new file.
        
        Args:
            path: The path of the file to write to
            content: The content to write to the file
            
        Returns:
            Success response or failure with error message
        """
        try:
            full_path = os.path.join(self.workspace, path)
            
            # Create directories if they don't exist
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            # Write content to file
            with open(full_path, 'w') as f:
                f.write(content)
            
            action = "updated" if os.path.exists(full_path) else "created"
            return self.success_response(f"File '{path}' successfully {action}")
            
        except Exception as e:
            return self.fail_response(f"Error writing to file: {str(e)}")
   
    @openapi_schema({
        "type": "function",
        "function": {
            "name": "replace_in_file",
            "description": "Replace sections of content in a file using SEARCH/REPLACE blocks.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "The path of the file to modify"
                    },
                    "diff": {
                        "type": "string",
                        "description": "One or more SEARCH/REPLACE blocks defining the changes"
                    }
                },
                "required": ["path", "diff"]
            }
        }
    })
    @xml_schema(
        tag_name="replace_in_file",
        mappings=[
            {"param_name": "path", "node_type": "attribute", "path": "."},
            {"param_name": "diff", "node_type": "text", "path": "."}
        ],
        example='''
<replace_in_file path="File path here">
<<<<<<< SEARCH
[exact content to find]
=======
[new content to replace with]
>>>>>>> REPLACE
</replace_in_file>
        '''
    )
    async def replace_in_file(self, path: str, diff: str) -> ToolResult:
        """Replace sections of content in a file using SEARCH/REPLACE blocks.
        
        Args:
            path: The path of the file to modify
            diff: One or more SEARCH/REPLACE blocks defining the changes
            
        Returns:
            Success response or failure with error message
        """
        try:
            full_path = os.path.join(self.workspace, path)
            if not os.path.exists(full_path):
                return self.fail_response(f"File '{path}' does not exist")
            
            # Read the current file content
            with open(full_path, 'r') as f:
                original_content = f.read()
            
            content = original_content
            
            # Parse diff blocks
            pattern = r'<<<<<<< SEARCH\n(.*?)\n=======\n(.*?)\n>>>>>>> REPLACE'
            blocks = re.findall(pattern, diff, re.DOTALL)
            
            if not blocks:
                return self.fail_response("No valid SEARCH/REPLACE blocks found in diff")
            
            changes_made = 0
            # Apply each search/replace block
            for search, replace in blocks:
                if search not in content:
                    return self.fail_response(f"Search block not found exactly in file:\n{search}")
                
                content = content.replace(search, replace, 1)  # Replace only the first occurrence
                changes_made += 1
            
            # Write the modified content back to the file
            with open(full_path, 'w') as f:
                f.write(content)
            
            return self.success_response(f"Successfully applied {changes_made} change(s) to '{path}'")
            
        except Exception as e:
            return self.fail_response(f"Error replacing content in file: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "delete_file",
            "description": "Deletes a file at the specified path. The operation will fail gracefully if the file doesn't exist, the operation is rejected for security reasons, or the file cannot be deleted.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "The path of the file to delete, relative to the workspace root."
                    },
                    "explanation": {
                        "type": "string",
                        "description": "One sentence explanation as to why this tool is being used, and how it contributes to the goal."
                    }
                },
                "required": ["path"]
            }
        }
    })
    @xml_schema(
        tag_name="delete_file",
        mappings=[
            {"param_name": "path", "node_type": "attribute", "path": "."},
            {"param_name": "explanation", "node_type": "attribute", "path": "."}
        ],
        example='''
        <delete_file path="path/to/file">
        </delete_file>
        '''
    )
    async def delete_file(self, path: str, explanation: Optional[str] = None) -> ToolResult:
        try:
            full_path = os.path.join(self.workspace, path)
            if not os.path.exists(full_path):
                return self.fail_response(f"File '{path}' does not exist.")
                
            os.remove(full_path)
            
            return self.success_response(f"File '{path}' deleted successfully.")
        except FileNotFoundError:
            return self.fail_response(f"File '{path}' does not exist.")
        except PermissionError:
            return self.fail_response(f"Permission denied when attempting to delete '{path}'.")
        except IsADirectoryError:
            return self.fail_response(f"'{path}' is a directory, not a file.")
        except Exception as e:
            return self.fail_response(f"Error deleting file: {str(e)}")