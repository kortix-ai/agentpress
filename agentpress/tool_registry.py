from typing import Dict, Type, Any, List, Optional
from agentpress.tool import Tool
from agentpress.config import settings
import importlib.util
import os
import inspect

class ToolRegistry:
    def __init__(self):
        self.tools: Dict[str, Dict[str, Any]] = {}

    def register_tool(self, tool_cls: Type[Tool], function_names: Optional[List[str]] = None):
        tool_instance = tool_cls()
        schemas = tool_instance.get_schemas()
        
        if function_names is None:
            # Register all functions
            for func_name, schema in schemas.items():
                self.tools[func_name] = {
                    "instance": tool_instance,
                    "schema": schema
                }
        else:
            # Register only specified functions
            for func_name in function_names:
                if func_name in schemas:
                    self.tools[func_name] = {
                        "instance": tool_instance,
                        "schema": schemas[func_name]
                    }
                else:
                    raise ValueError(f"Function '{func_name}' not found in {tool_cls.__name__}")

    def get_tool(self, tool_name: str) -> Dict[str, Any]:
        return self.tools.get(tool_name, {})

    def get_all_tools(self) -> Dict[str, Dict[str, Any]]:
        return self.tools

    def get_all_tool_schemas(self) -> List[Dict[str, Any]]:
        return [tool_info['schema'] for tool_info in self.tools.values()]
