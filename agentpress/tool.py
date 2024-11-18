"""
This module provides a flexible foundation for creating and managing tools in the AgentPress system.
"""

from typing import Dict, Any, Union, Optional, List
from dataclasses import dataclass, field
from abc import ABC
import json
import inspect
from enum import Enum

class SchemaType(Enum):
    OPENAPI = "openapi"
    XML = "xml"
    CUSTOM = "custom"

@dataclass
class XMLNodeMapping:
    """Maps an XML node (element or attribute) to a function parameter"""
    param_name: str  # Name of the function parameter
    node_type: str = "element"  # "element", "attribute", or "content"
    path: str = "."  # XPath-like path to the node, "." means root element

@dataclass
class XMLTagSchema:
    """Schema for XML tool tags with improved node mapping"""
    tag_name: str  # Root tag name (e.g. "str-replace")
    mappings: List[XMLNodeMapping] = field(default_factory=list)
    description: Optional[str] = None
    
    def add_mapping(self, param_name: str, node_type: str = "element", path: str = ".") -> None:
        """Add a new node mapping"""
        self.mappings.append(XMLNodeMapping(
            param_name=param_name,
            node_type=node_type, 
            path=path
        ))

@dataclass
class ToolSchema:
    """Container for tool schemas with type information"""
    schema_type: SchemaType
    schema: Dict[str, Any]
    xml_schema: Optional[XMLTagSchema] = None

@dataclass
class ToolResult:
    """Container for tool execution results."""
    success: bool
    output: str

class Tool(ABC):
    """Abstract base class for all tools."""
    
    def __init__(self):
        self._schemas: Dict[str, List[ToolSchema]] = {}
        self._register_schemas()

    def _register_schemas(self):
        """Register schemas from all decorated methods."""
        for name, method in inspect.getmembers(self, predicate=inspect.ismethod):
            if hasattr(method, 'tool_schemas'):
                self._schemas[name] = method.tool_schemas

    def get_schemas(self) -> Dict[str, List[ToolSchema]]:
        """Get all registered tool schemas."""
        return self._schemas

    def success_response(self, data: Union[Dict[str, Any], str]) -> ToolResult:
        """Create a successful tool result."""
        if isinstance(data, str):
            text = data
        else:
            text = json.dumps(data, indent=2)
        return ToolResult(success=True, output=text)

    def fail_response(self, msg: str) -> ToolResult:
        """Create a failed tool result."""
        return ToolResult(success=False, output=msg)

def _add_schema(func, schema: ToolSchema):
    """Helper to add schema to a function."""
    if not hasattr(func, 'tool_schemas'):
        func.tool_schemas = []
    func.tool_schemas.append(schema)
    return func

def openapi_schema(schema: Dict[str, Any]):
    """Decorator for OpenAPI schema tools."""
    def decorator(func):
        return _add_schema(func, ToolSchema(
            schema_type=SchemaType.OPENAPI,
            schema=schema
        ))
    return decorator

def xml_schema(
    tag_name: str,
    mappings: List[Dict[str, str]] = None,
    description: str = None
):
    """
    Decorator for XML schema tools with improved node mapping.
    
    Args:
        tag_name: Name of the root XML tag
        mappings: List of mapping definitions, each containing:
            - param_name: Name of the function parameter
            - node_type: "element", "attribute", or "content" 
            - path: Path to the node (default "." for root)
        description: Optional description of the tool
    
    Example:
        @xml_schema(
            tag_name="str-replace",
            mappings=[
                {"param_name": "file_path", "node_type": "attribute", "path": "."},
                {"param_name": "old_str", "node_type": "element", "path": "old_str"},
                {"param_name": "new_str", "node_type": "element", "path": "new_str"}
            ],
            description="Replace text in a file"
        )
    """
    def decorator(func):
        xml_schema = XMLTagSchema(tag_name=tag_name, description=description)
        
        # Add mappings
        if mappings:
            for mapping in mappings:
                xml_schema.add_mapping(
                    param_name=mapping["param_name"],
                    node_type=mapping.get("node_type", "element"),
                    path=mapping.get("path", ".")
                )
                
        return _add_schema(func, ToolSchema(
            schema_type=SchemaType.XML,
            schema={},  # OpenAPI schema could be added here if needed
            xml_schema=xml_schema
        ))
    return decorator

def custom_schema(schema: Dict[str, Any]):
    """Decorator for custom schema tools."""
    def decorator(func):
        return _add_schema(func, ToolSchema(
            schema_type=SchemaType.CUSTOM,
            schema=schema
        ))
    return decorator
