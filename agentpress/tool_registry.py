from typing import Dict, Type, Any, List, Optional
from agentpress.tool import Tool


class ToolRegistry:
    def __init__(self):
        self.tools: Dict[str, Dict[str, Any]] = {}

    def register_tool(self, tool_class: Type[Tool], function_names: Optional[List[str]] = None, **kwargs):
        """
        Register a tool with optional function name filtering and initialization parameters.
        
        Args:
            tool_class: The tool class to register
            function_names: Optional list of function names to register
            **kwargs: Additional keyword arguments passed to tool initialization
        """
        tool_instance = tool_class(**kwargs)
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
                    raise ValueError(f"Function '{func_name}' not found in {tool_class.__name__}")

    def get_tool(self, tool_name: str) -> Dict[str, Any]:
        return self.tools.get(tool_name, {})

    def get_all_tools(self) -> Dict[str, Dict[str, Any]]:
        return self.tools

    def get_all_tool_schemas(self) -> List[Dict[str, Any]]:
        return [tool_info['schema'] for tool_info in self.tools.values()]
