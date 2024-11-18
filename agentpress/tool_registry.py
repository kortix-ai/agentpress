from typing import Dict, Type, Any, List, Optional, Callable
from agentpress.tool import Tool, SchemaType, ToolSchema
import logging


class ToolRegistry:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.tools = {}
            cls._instance.xml_tools = {}
        return cls._instance
    
    """
    Registry for managing and accessing tools in the AgentPress system.
    
    The ToolRegistry maintains a collection of tool instances and their schemas,
    allowing for selective registration of tool functions and easy access to
    tool capabilities.
    
    Attributes:
        tools (Dict[str, Dict[str, Any]]): Dictionary mapping function names to
            their tool instances and schemas
        xml_tools (Dict[str, Dict[str, Any]]): Dictionary mapping XML tag names to
            their tool instances and schemas
    """

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
        
        logging.info(f"Registering tool class: {tool_class.__name__}")
        logging.info(f"Available schemas: {list(schemas.keys())}")
        
        for func_name, schema_list in schemas.items():
            if function_names is None or func_name in function_names:
                # Register each schema type appropriately
                for schema in schema_list:
                    if schema.schema_type == SchemaType.OPENAPI:
                        self.tools[func_name] = {
                            "instance": tool_instance,
                            "schema": schema
                        }
                        logging.info(f"Registered OpenAPI function {func_name}")
                    
                    if schema.schema_type == SchemaType.XML and schema.xml_schema:
                        self.xml_tools[schema.xml_schema.tag_name] = {
                            "instance": tool_instance,
                            "method": func_name,
                            "schema": schema
                        }
                        logging.info(f"Registered XML tag {schema.xml_schema.tag_name} -> {func_name}")

    def get_available_functions(self) -> Dict[str, Callable]:
        """
        Get all available tool functions that can be executed.
        
        Returns:
            Dict[str, Callable]: Dictionary mapping function names to their callable implementations
        """
        available_functions = {}
        for tool_name, tool_info in self.tools.items():
            tool_instance = tool_info['instance']
            for func_name, func in tool_instance.__class__.__dict__.items():
                if callable(func) and not func_name.startswith("__"):
                    available_functions[func_name] = getattr(tool_instance, func_name)
        return available_functions

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

    def get_xml_tool(self, tag_name: str) -> Dict[str, Any]:
        """Get tool info by XML tag name."""
        return self.xml_tools.get(tag_name, {})

    def get_openapi_schemas(self) -> List[Dict[str, Any]]:
        """
        Get only OpenAPI schemas for native function calling.
        
        Returns:
            List[Dict[str, Any]]: List of OpenAPI-compatible schemas
        """
        return [
            tool_info['schema'].schema 
            for tool_info in self.tools.values()
            if tool_info['schema'].schema_type == SchemaType.OPENAPI
        ]

    def get_xml_examples(self) -> Dict[str, str]:
        """Get all XML tag examples from registered tools.
        
        Returns:
            Dict[str, str]: Dictionary mapping tag names to their examples
        """
        examples = {}
        for tool_info in self.xml_tools.values():
            schema = tool_info['schema']
            if schema.xml_schema and schema.xml_schema.example:
                examples[schema.xml_schema.tag_name] = schema.xml_schema.example
        return examples
