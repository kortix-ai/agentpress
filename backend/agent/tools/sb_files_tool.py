from daytona_sdk.process import SessionExecuteRequest

from agentpress.tool import ToolResult, openapi_schema, xml_schema
from agent.tools.utils.daytona_sandbox import SandboxToolsBase
import os

# TODO: might want to be more granular with the tool names:
# file_read - Read file content. Use for checking file contents, analyzing logs, or reading configuration files.
# file_write - Overwrite or append content to a file. Use for creating new files, appending content, or modifying existing files.
# file_str_replace - Replace specified string in a file. Use for updating specific content in files or fixing errors in code.
# file_find_in_content - Search for matching text within file content. Use for finding specific content or patterns in files.
# file_find_by_name - Find files by name pattern in specified directory. Use for locating files with specific naming patterns.


class SandboxFilesTool(SandboxToolsBase):
    """Tool for executing file system operations in a Daytona sandbox."""

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

    def __init__(self, sandbox_id: str, password: str):
        super().__init__(sandbox_id, password)
        self.SNIPPET_LINES = 4  # Number of context lines to show around edits

    def _should_exclude_file(self, rel_path: str) -> bool:
        """Check if a file should be excluded based on path, name, or extension"""
        # Check filename
        filename = rel_path.split('/')[-1]
        if filename in self.EXCLUDED_FILES:
            return True

        # Check directory
        dir_path = '/'.join(rel_path.split('/')[:-1])
        if any(excluded in dir_path for excluded in self.EXCLUDED_DIRS):
            return True

        # Check extension
        _, ext = os.path.splitext(filename)
        if ext.lower() in self.EXCLUDED_EXT:
            return True

        return False

    def _file_exists(self, path: str) -> bool:
        """Check if a file exists in the sandbox"""
        try:
            self.sandbox.fs.get_file_info(path)
            return True
        except Exception:
            return False

    async def get_workspace_state(self) -> dict:
        """Get the current workspace state by reading all files"""
        files_state = {}
        try:
            files = self.sandbox.fs.list_files(self.workspace_path)
            for file_info in files:
                rel_path = file_info.name
                
                # Skip excluded files and directories
                if self._should_exclude_file(rel_path) or file_info.is_dir:
                    continue

                try:
                    full_path = f"{self.workspace_path}/{rel_path}"
                    content = self.sandbox.fs.download_file(full_path).decode()
                    files_state[rel_path] = {
                        "content": content,
                        "is_dir": file_info.is_dir,
                        "size": file_info.size,
                        "modified": file_info.mod_time
                    }
                except Exception as e:
                    print(f"Error reading file {rel_path}: {e}")
                except UnicodeDecodeError:
                    print(f"Skipping binary file: {rel_path}")

            return files_state
        except Exception as e:
            return self.fail_response(f"Error getting workspace state: {str(e)}")

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
                    },
                    "permissions": {
                        "type": "string",
                        "description": "File permissions in octal format (e.g., '644')",
                        "default": "644"
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
            {"param_name": "file_contents", "node_type": "content", "path": "."},
            {"param_name": "permissions", "node_type": "attribute", "path": "@permissions"}
        ],
        example='''
        <create-file file_path="path/to/file" permissions="644">
        File contents go here
        </create-file>
        '''
    )
    async def create_file(self, file_path: str, file_contents: str, permissions: str = "644") -> ToolResult:
        file_path = self.clean_path(file_path)
        try:
            full_path = f"{self.workspace_path}/{file_path}"
            if self._file_exists(full_path):
                return self.fail_response(f"File '{file_path}' already exists. Use update_file to modify existing files.")
            
            # Create parent directories if needed
            parent_dir = '/'.join(full_path.split('/')[:-1])
            if parent_dir:
                self.sandbox.fs.create_folder(parent_dir, "755")
            
            # Write the file content
            self.sandbox.fs.upload_file(full_path, file_contents.encode())
            self.sandbox.fs.set_file_permissions(full_path, permissions)
            
            return self.success_response(f"File '{file_path}' created successfully.")
        except Exception as e:
            return self.fail_response(f"Error creating file: {str(e)}")

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
            file_path = self.clean_path(file_path)
            full_path = f"{self.workspace_path}/{file_path}"
            if not self._file_exists(full_path):
                return self.fail_response(f"File '{file_path}' does not exist")
            
            content = self.sandbox.fs.download_file(full_path).decode()
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
            self.sandbox.fs.upload_file(full_path, new_content.encode())
            
            # Show snippet around the edit
            replacement_line = content.split(old_str)[0].count('\n')
            start_line = max(0, replacement_line - self.SNIPPET_LINES)
            end_line = replacement_line + self.SNIPPET_LINES + new_str.count('\n')
            snippet = '\n'.join(new_content.split('\n')[start_line:end_line + 1])
            
            return self.success_response(f"Replacement successful. Snippet of changes:\n{snippet}")
            
        except Exception as e:
            return self.fail_response(f"Error replacing string: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "full_file_rewrite",
            "description": "Completely rewrite an existing file with new content",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to the file to be rewritten"
                    },
                    "file_contents": {
                        "type": "string",
                        "description": "The new content to write to the file, replacing all existing content"
                    },
                    "permissions": {
                        "type": "string",
                        "description": "File permissions in octal format (e.g., '644')",
                        "default": "644"
                    }
                },
                "required": ["file_path", "file_contents"]
            }
        }
    })
    @xml_schema(
        tag_name="full-file-rewrite",
        mappings=[
            {"param_name": "file_path", "node_type": "attribute", "path": "."},
            {"param_name": "file_contents", "node_type": "content", "path": "."},
            {"param_name": "permissions", "node_type": "attribute", "path": "@permissions"}
        ],
        example='''
        <full-file-rewrite file_path="path/to/file" permissions="644">
        New file contents go here, replacing all existing content
        </full-file-rewrite>
        '''
    )
    async def full_file_rewrite(self, file_path: str, file_contents: str, permissions: str = "644") -> ToolResult:
        try:
            file_path = self.clean_path(file_path)
            full_path = f"{self.workspace_path}/{file_path}"
            if not self._file_exists(full_path):
                return self.fail_response(f"File '{file_path}' does not exist. Use create_file to create a new file.")
            
            self.sandbox.fs.upload_file(full_path, file_contents.encode())
            self.sandbox.fs.set_file_permissions(full_path, permissions)
            
            return self.success_response(f"File '{file_path}' completely rewritten successfully.")
        except Exception as e:
            return self.fail_response(f"Error rewriting file: {str(e)}")

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
            file_path = self.clean_path(file_path)
            full_path = f"{self.workspace_path}/{file_path}"
            if not self._file_exists(full_path):
                return self.fail_response(f"File '{file_path}' does not exist")
            
            self.sandbox.fs.delete_file(full_path)
            return self.success_response(f"File '{file_path}' deleted successfully.")
        except Exception as e:
            return self.fail_response(f"Error deleting file: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "search_files",
            "description": "Search for text in files within a directory",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Path to search in (directory)"
                    },
                    "pattern": {
                        "type": "string",
                        "description": "Text pattern to search for"
                    }
                },
                "required": ["path", "pattern"]
            }
        }
    })
    @xml_schema(
        tag_name="search-files",
        mappings=[
            {"param_name": "path", "node_type": "attribute", "path": "@path"},
            {"param_name": "pattern", "node_type": "attribute", "path": "@pattern"}
        ],
        example='''
        <search-files path="path/to/search" pattern="text-of-interest">
        </search-files>
        '''
    )
    async def search_files(self, path: str, pattern: str) -> ToolResult:
        try:
            path = self.clean_path(path)
            full_path = f"{self.workspace_path}/{path}" if not path.startswith(self.workspace_path) else path
            results = self.sandbox.fs.find_files(
                path=full_path,
                pattern=pattern
            )
            
            formatted_results = []
            for match in results:
                formatted_results.append({
                    "file": match.file,
                    "line": match.line,
                    "content": match.content
                })
            
            return self.success_response({
                "matches": formatted_results,
                "count": len(formatted_results)
            })
        except Exception as e:
            return self.fail_response(f"Error searching files: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "replace_in_files",
            "description": "Replace text in multiple files",
            "parameters": {
                "type": "object",
                "properties": {
                    "files": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        },
                        "description": "List of file paths to search in"
                    },
                    "pattern": {
                        "type": "string",
                        "description": "Text pattern to replace"
                    },
                    "new_value": {
                        "type": "string",
                        "description": "New text to replace the pattern with"
                    }
                },
                "required": ["files", "pattern", "new_value"]
            }
        }
    })
    @xml_schema(
        tag_name="replace-in-files",
        mappings=[
            {"param_name": "files", "node_type": "element", "path": "files/file"},
            {"param_name": "pattern", "node_type": "element", "path": "pattern"},
            {"param_name": "new_value", "node_type": "element", "path": "new_value"}
        ],
        example='''
        <replace-in-files>
            <files>
                <file>path/to/file1.txt</file>
                <file>path/to/file2.txt</file>
            </files>
            <pattern>old_text</pattern>
            <new_value>new_text</new_value>
        </replace-in-files>
        '''
    )
    async def replace_in_files(self, files: list[str], pattern: str, new_value: str) -> ToolResult:
        try:
            files = [self.clean_path(f) for f in files]
            full_paths = [f"{self.workspace_path}/{f}" if not f.startswith(self.workspace_path) else f for f in files]
            self.sandbox.fs.replace_in_files(
                files=full_paths,
                pattern=pattern,
                new_value=new_value
            )
            
            return self.success_response(f"Text replaced in {len(files)} files successfully.")
        except Exception as e:
            return self.fail_response(f"Error replacing text in files: {str(e)}")



async def test_files_tool():
    files_tool = SandboxFilesTool(
        sandbox_id="sandbox-15a2c059",
        password="vvv"
    )
    print("1)", "*"*10)  
    res = await files_tool.create_file("test.txt", "Hello, world!")
    print(res)
    print(await files_tool.get_workspace_state())

    print("2)", "*"*10)  
    res = await files_tool.search_files("/", "Hello")
    print(res)
    print(await files_tool.get_workspace_state())

    print("3)", "*"*10)  

    res = await files_tool.str_replace("test.txt", "Hello", "Hi")
    print(res)
    print(await files_tool.get_workspace_state())

    print("4)", "*"*10)  
    res = await files_tool.search_files("/", "Hello")
    print(res)
    print(await files_tool.get_workspace_state())

    print("5)", "*"*10)  
    res = await files_tool.search_files("/", "Hi")
    print(res)
    print(await files_tool.get_workspace_state())

    print("6)", "*"*10)  
    res = await files_tool.full_file_rewrite("test.txt", "FOOOOHi, world!")
    print(res)
    print(await files_tool.get_workspace_state())

    print("7)", "*"*10)  

    res = await files_tool.delete_file("test.txt")
    print(res)
    print(await files_tool.get_workspace_state())

    print("8)", "*"*10)  

    res = await files_tool.search_files("/", "Hello")
    print(res)
    print(await files_tool.get_workspace_state())

    print("9)", "*"*10)  

    res = await files_tool.replace_in_files(["test.txt", "test2.txt"], "Hello", "Hi")
    print(res)
    print(await files_tool.get_workspace_state())        

