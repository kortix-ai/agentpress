from typing import Dict, Type, Any, List, Optional, Callable
from agentpress.tool import Tool, SchemaType, ToolSchema
from utils.logger import logger


class ToolRegistry:
    """Registry for managing and accessing tools.
    
    Maintains a collection of tool instances and their schemas, allowing for
    selective registration of tool functions and easy access to tool capabilities.
    
    Attributes:
        tools (Dict[str, Dict[str, Any]]): OpenAPI-style tools and schemas
        xml_tools (Dict[str, Dict[str, Any]]): XML-style tools and schemas
        
    Methods:
        register_tool: Register a tool with optional function filtering
        get_tool: Get a specific tool by name
        get_xml_tool: Get a tool by XML tag name
        get_openapi_schemas: Get OpenAPI schemas for function calling
        get_xml_examples: Get examples of XML tool usage
    """
    
    _instance = None
    
    def __new__(cls):
        """Create or return singleton instance."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.tools = {}
            cls._instance.xml_tools = {}
            logger.info("Initialized new ToolRegistry instance")
        return cls._instance
    
    def register_tool(self, tool_class: Type[Tool], function_names: Optional[List[str]] = None, **kwargs):
        """Register a tool with optional function filtering.
        
        Args:
            tool_class: The tool class to register
            function_names: Optional list of specific functions to register
            **kwargs: Additional arguments passed to tool initialization
            
        Notes:
            - If function_names is None, all functions are registered
            - Handles both OpenAPI and XML schema registration
        """
        logger.info(f"Registering tool class: {tool_class.__name__}")
        tool_instance = tool_class(**kwargs)
        schemas = tool_instance.get_schemas()
        
        logger.debug(f"Available schemas for {tool_class.__name__}: {list(schemas.keys())}")
        
        registered_openapi = 0
        registered_xml = 0
        
        for func_name, schema_list in schemas.items():
            if function_names is None or func_name in function_names:
                for schema in schema_list:
                    if schema.schema_type == SchemaType.OPENAPI:
                        self.tools[func_name] = {
                            "instance": tool_instance,
                            "schema": schema
                        }
                        registered_openapi += 1
                        logger.debug(f"Registered OpenAPI function {func_name} from {tool_class.__name__}")
                    
                    if schema.schema_type == SchemaType.XML and schema.xml_schema:
                        self.xml_tools[schema.xml_schema.tag_name] = {
                            "instance": tool_instance,
                            "method": func_name,
                            "schema": schema
                        }
                        registered_xml += 1
                        logger.debug(f"Registered XML tag {schema.xml_schema.tag_name} -> {func_name} from {tool_class.__name__}")
        
        logger.info(f"Tool registration complete for {tool_class.__name__}: {registered_openapi} OpenAPI functions, {registered_xml} XML tags")

    def get_available_functions(self) -> Dict[str, Callable]:
        """Get all available tool functions.
        
        Returns:
            Dict mapping function names to their implementations
        """
        available_functions = {}
        
        # Get OpenAPI tool functions
        for tool_name, tool_info in self.tools.items():
            tool_instance = tool_info['instance']
            function_name = tool_name
            function = getattr(tool_instance, function_name)
            available_functions[function_name] = function
            
        # Get XML tool functions
        for tag_name, tool_info in self.xml_tools.items():
            tool_instance = tool_info['instance']
            method_name = tool_info['method']
            function = getattr(tool_instance, method_name)
            available_functions[method_name] = function
            
        logger.debug(f"Retrieved {len(available_functions)} available functions")
        return available_functions

    def get_tool(self, tool_name: str) -> Dict[str, Any]:
        """Get a specific tool by name.
        
        Args:
            tool_name: Name of the tool function
            
        Returns:
            Dict containing tool instance and schema, or empty dict if not found
        """
        tool = self.tools.get(tool_name, {})
        if not tool:
            logger.warning(f"Tool not found: {tool_name}")
        return tool

    def get_xml_tool(self, tag_name: str) -> Dict[str, Any]:
        """Get tool info by XML tag name.
        
        Args:
            tag_name: XML tag name for the tool
            
        Returns:
            Dict containing tool instance, method name, and schema
        """
        tool = self.xml_tools.get(tag_name, {})
        if not tool:
            logger.warning(f"XML tool not found for tag: {tag_name}")
        return tool

    def get_openapi_schemas(self) -> List[Dict[str, Any]]:
        """Get OpenAPI schemas for function calling.
        
        Returns:
            List of OpenAPI-compatible schema definitions
        """
        schemas = [
            tool_info['schema'].schema 
            for tool_info in self.tools.values()
            if tool_info['schema'].schema_type == SchemaType.OPENAPI
        ]
        logger.debug(f"Retrieved {len(schemas)} OpenAPI schemas")
        return schemas

    def get_xml_examples(self) -> Dict[str, str]:
        """Get all XML tag examples.
        
        Returns:
            Dict mapping tag names to their example usage
        """
        examples = {}
        for tool_info in self.xml_tools.values():
            schema = tool_info['schema']
            if schema.xml_schema and schema.xml_schema.example:
                examples[schema.xml_schema.tag_name] = schema.xml_schema.example
        logger.debug(f"Retrieved {len(examples)} XML examples")
        return examples
