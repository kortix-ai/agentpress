from typing import Dict, Type, Any, List, Optional
from agentpress.tool import Tool


class ToolRegistry:
    """
    Registry for managing and accessing tools in the AgentPress system.
    
    The ToolRegistry maintains a collection of tool instances and their schemas,
    allowing for selective registration of tool functions and easy access to
    tool capabilities.
    
    Attributes:
        tools (Dict[str, Dict[str, Any]]): Dictionary mapping function names to
            their tool instances and schemas
    """

    def __init__(self):
        """Initialize an empty tool registry."""
        self.tools: Dict[str, Dict[str, Any]] = {}

    def register_tool(self, tool_class: Type[Tool], function_names: Optional[List[str]] = None, **kwargs):
        """
        Register a tool with optional function name filtering and initialization parameters.
        
        Args:
            tool_class (Type[Tool]): The tool class to register
            function_names (Optional[List[str]]): Optional list of specific function names to register.
                If None, all functions from the tool will be registered.
            **kwargs: Additional keyword arguments passed to tool initialization
        
        Raises:
            ValueError: If a specified function name is not found in the tool class
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
        """
        Get a specific tool by name.
        
        Args:
            tool_name (str): Name of the tool function to retrieve
        
        Returns:
            Dict[str, Any]: Dictionary containing the tool instance and schema,
                or an empty dict if tool not found
        """
        return self.tools.get(tool_name, {})

    def get_all_tools(self) -> Dict[str, Dict[str, Any]]:
        """
        Get all registered tools.
        
        Returns:
            Dict[str, Dict[str, Any]]: Dictionary mapping tool names to their
                instances and schemas
        """
        return self.tools

    def get_all_tool_schemas(self) -> List[Dict[str, Any]]:
        """
        Get schemas for all registered tools.
        
        Returns:
            List[Dict[str, Any]]: List of OpenAPI-compatible schemas for all
                registered tool functions
        """
        return [tool_info['schema'] for tool_info in self.tools.values()]
