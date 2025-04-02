import os
import asyncio
import subprocess
import glob
from pathlib import Path
from agentpress.tool import Tool, ToolResult, openapi_schema, xml_schema
from typing import List, Optional, Dict
from .utils.exclusions import EXCLUDED_FILES, EXCLUDED_DIRS, EXCLUDED_EXT, should_exclude_file

# Import python-ripgrep
try:
    import pyripgrep as rg
    RIPGREP_AVAILABLE = False  # Temporarily set to False to test Python implementation
except ImportError:
    RIPGREP_AVAILABLE = False

class CodeSearchTool(Tool):
    """Search tool for exploring and searching files in a workspace."""
    
    def __init__(self):
        super().__init__()
        self.workspace = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'workspace')
        os.makedirs(self.workspace, exist_ok=True)

    def _process_file(self, file_path: str, operation: str = "preview", 
                     pattern=None, case_sensitive: bool = True, 
                     preview_lines: int = 5) -> Dict:
        """Utility function to process a file with different operations.
        
        Args:
            file_path: Relative path to the file from workspace
            operation: One of "preview", "count", "grep"
            pattern: Regex pattern for grep operation
            case_sensitive: Whether grep is case sensitive
            preview_lines: Number of lines to include in preview
            
        Returns:
            Dict with the results of the operation
        """
        full_path = os.path.join(self.workspace, file_path)
        result = {"file": file_path}
        
        try:
            if operation == "count":
                # Count total lines
                with open(full_path, 'r', encoding='utf-8', errors='replace') as f:
                    result["lines"] = sum(1 for _ in f)
            
            elif operation == "preview":
                # Get first N lines for preview
                result["lines"] = []
                with open(full_path, 'r', encoding='utf-8', errors='replace') as f:
                    for line_num, line in enumerate(f, 1):
                        if line_num <= preview_lines:
                            result["lines"].append({
                                "line": line_num,
                                "content": line.strip()
                            })
                        else:
                            break
            
            elif operation == "grep" and pattern:
                # Search for pattern in file
                import re
                result["matches"] = []
                regex_flags = 0 if case_sensitive else re.IGNORECASE
                
                with open(full_path, 'r', encoding='utf-8', errors='replace') as f:
                    for line_num, line in enumerate(f, 1):
                        if pattern.search(line):
                            result["matches"].append({
                                "line": line_num,
                                "content": line.strip()
                            })
        except:
            # Handle file read errors
            if operation == "count":
                result["lines"] = 0
            elif operation == "preview":
                result["lines"] = []
            elif operation == "grep":
                result["matches"] = []
        
        return result

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "list_dir",
            "description": "List the contents of a directory. The quick tool to use for discovery, before using more targeted tools like semantic search or file reading.",
            "parameters": {
                "type": "object",
                "properties": {
                    "relative_workspace_path": {
                        "type": "string",
                        "description": "Path to list contents of, relative to the workspace root."
                    }
                },
                "required": ["relative_workspace_path"]
            }
        }
    })
    @xml_schema(
        tag_name="list_dir",
        mappings=[
            {"param_name": "relative_workspace_path", "node_type": "attribute", "path": "."}
        ],
        example='''
        <list_dir relative_workspace_path="src/">
        </list_dir>
        '''
    )
    async def list_dir(self, relative_workspace_path: str) -> ToolResult:
        try:
            full_path = os.path.join(self.workspace, relative_workspace_path)
            if not os.path.exists(full_path):
                return self.fail_response(f"Directory '{relative_workspace_path}' does not exist.")
            
            if not os.path.isdir(full_path):
                return self.fail_response(f"Path '{relative_workspace_path}' is not a directory.")

            contents = []
            for item in os.listdir(full_path):
                item_path = os.path.join(full_path, item)
                rel_item_path = os.path.join(relative_workspace_path, item)
                
                # Skip excluded items
                if should_exclude_file(rel_item_path):
                    continue
                
                if os.path.isdir(item_path):
                    contents.append({"name": item, "type": "directory"})
                else:
                    # Use utility method to count lines
                    file_info = self._process_file(rel_item_path, operation="count")
                    contents.append({"name": item, "type": "file", "lines": file_info["lines"]})
            
            return self.success_response({
                "path": relative_workspace_path,
                "contents": contents
            })
        except Exception as e:
            return self.fail_response(f"Error listing directory: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "grep_search",
            "description": "Fast text-based regex search that finds exact pattern matches within files or directories.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The regex pattern to search for"
                    },
                    "include_pattern": {
                        "type": "string",
                        "description": "Glob pattern for files to include (e.g. '*.ts' for TypeScript files)"
                    },
                    "exclude_pattern": {
                        "type": "string",
                        "description": "Glob pattern for files to exclude"
                    },
                    "case_sensitive": {
                        "type": "boolean",
                        "description": "Whether the search should be case sensitive"
                    }
                },
                "required": ["query"]
            }
        }
    })
    @xml_schema(
        tag_name="grep_search",
        mappings=[
            {"param_name": "query", "node_type": "attribute", "path": "."},
            {"param_name": "include_pattern", "node_type": "attribute", "path": "."},
            {"param_name": "exclude_pattern", "node_type": "attribute", "path": "."},
            {"param_name": "case_sensitive", "node_type": "attribute", "path": "."}
        ],
        example='''
        <grep_search query="function" include_pattern="*.js" case_sensitive="false">
        </grep_search>
        '''
    )
    async def grep_search(self, query: str, include_pattern: Optional[str] = None, 
                         exclude_pattern: Optional[str] = None, 
                         case_sensitive: bool = True) -> ToolResult:
        try:
            # First try to use python-ripgrep if available
            if RIPGREP_AVAILABLE:
                try:
                    # Prepare args for python-ripgrep
                    args = []
                    
                    # Case sensitivity
                    if not case_sensitive:
                        args.append("-i")
                    
                    # Include pattern
                    if include_pattern:
                        args.extend(["-g", include_pattern])
                    
                    # Exclude pattern
                    if exclude_pattern:
                        args.extend(["-g", f"!{exclude_pattern}"])
                    
                    # Add default excludes for directories
                    for dir_name in EXCLUDED_DIRS:
                        args.extend(["-g", f"!{dir_name}/**"])
                    
                    # Line numbers and limit results
                    args.extend(["--line-number", "--max-count", "50"])
                    
                    # Run search using python-ripgrep
                    results = rg.run(query, self.workspace, args=args)
                    
                    # Parse results into structured format
                    matches = []
                    for result in results:
                        # pyripgrep returns a different format, adapt accordingly
                        # Assuming result has 'path', 'line_number', and 'text' attributes
                        # You may need to adjust this based on actual pyripgrep output format
                        rel_path = os.path.relpath(result.path, self.workspace)
                        matches.append({
                            "file": rel_path,
                            "line": result.line_number,
                            "content": result.text
                        })
                    
                    return self.success_response({
                        "query": query,
                        "matches": matches,
                        "match_count": len(matches)
                    })
                except Exception as e:
                    # If python-ripgrep fails, fall back to Python implementation
                    matches = self._python_grep_search(query, include_pattern, exclude_pattern, case_sensitive)
                    return self.success_response({
                        "query": query,
                        "matches": matches,
                        "match_count": len(matches)
                    })
            else:
                # python-ripgrep is not available, fall back to Python implementation
                matches = self._python_grep_search(query, include_pattern, exclude_pattern, case_sensitive)
                return self.success_response({
                    "query": query,
                    "matches": matches,
                    "match_count": len(matches)
                })
        except Exception as e:
            return self.fail_response(f"Error executing search: {str(e)}")
            
    def _python_grep_search(self, query: str, include_pattern: Optional[str] = None, 
                           exclude_pattern: Optional[str] = None, 
                           case_sensitive: bool = True) -> List[Dict]:
        """Python implementation of grep search when ripgrep is not available"""
        import re
        import fnmatch
        
        matches = []
        regex_flags = 0 if case_sensitive else re.IGNORECASE
        
        try:
            pattern = re.compile(query, regex_flags)
        except re.error:
            # If the query is not a valid regex, treat it as a literal string
            pattern = re.compile(re.escape(query), regex_flags)
        
        # Get files to search based on include/exclude patterns
        files_to_search = []
        for root, _, files in os.walk(self.workspace):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, self.workspace)
                
                # Skip excluded files
                if should_exclude_file(rel_path):
                    continue
                    
                # Apply include pattern if provided
                if include_pattern and not fnmatch.fnmatch(rel_path, include_pattern):
                    continue
                    
                # Apply exclude pattern if provided
                if exclude_pattern and fnmatch.fnmatch(rel_path, exclude_pattern):
                    continue
                
                files_to_search.append(rel_path)
        
        # Search in files
        for rel_path in files_to_search:
            # Use utility method for grepping
            file_result = self._process_file(rel_path, operation="grep", pattern=pattern, case_sensitive=case_sensitive)
            
            # Add file matches to overall matches
            for match in file_result.get("matches", []):
                matches.append({
                    "file": rel_path,
                    "line": match["line"],
                    "content": match["content"]
                })
                
                # Limit to 50 matches
                if len(matches) >= 50:
                    return matches
                
        return matches

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "file_search",
            "description": "Fast file search based on fuzzy matching against file path.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Fuzzy filename to search for"
                    }
                },
                "required": ["query"]
            }
        }
    })
    @xml_schema(
        tag_name="file_search",
        mappings=[
            {"param_name": "query", "node_type": "attribute", "path": "."}
        ],
        example='''
        <file_search query="component">
        </file_search>
        '''
    )
    async def file_search(self, query: str) -> ToolResult:
        try:
            # Use fd (find) command with fuzzy matching
            # Fall back to a Python-based solution if fd is not available
            try:
                cmd = ["fd", "--type", "f", "--max-results", "10", query, "."]
                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=self.workspace
                )
                stdout, stderr = await process.communicate()
                output = stdout.decode() if stdout else ""
                error = stderr.decode() if stderr else ""
                
                if process.returncode == 0:
                    file_paths = [line.strip() for line in output.splitlines() if line.strip()]
                    # Filter results to exclude files we don't want
                    filtered_paths = [r for r in file_paths if not should_exclude_file(r)]
                    # Limit to 10 results
                    filtered_paths = filtered_paths[:10]
                    # Get content for each file using utility method
                    results = [self._process_file(path, operation="preview") for path in filtered_paths]
                else:
                    # Fallback to Python implementation
                    results = self._python_file_search(query)
            except:
                # fd command not available, use Python implementation
                results = self._python_file_search(query)
            
            return self.success_response({
                "query": query,
                "files": results,
                "count": len(results)
            })
        except Exception as e:
            return self.fail_response(f"Error searching for files: {str(e)}")
    
    def _python_file_search(self, query: str) -> List[Dict]:
        """Python implementation of fuzzy file search when fd is not available"""
        matches = []
        query_lower = query.lower()
        
        for root, _, files in os.walk(self.workspace):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, self.workspace)
                
                if should_exclude_file(rel_path):
                    continue
                    
                if query_lower in rel_path.lower():
                    # Use utility method to get file preview
                    file_info = self._process_file(rel_path, operation="preview")
                    matches.append(file_info)
                    
                    if len(matches) >= 10:
                        break
                    
        return matches 