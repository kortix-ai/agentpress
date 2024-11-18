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
class XMLTagSchema:
    """Schema for XML tool tags"""
    tag_name: str  # e.g. "str-replace"
    param_mapping: Dict[str, str] = field(default_factory=dict)  # Maps XML elements to function params
    attributes: Dict[str, str] = field(default_factory=dict)  # Maps XML attributes to function params

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
    param_mapping: Dict[str, str] = None,
    attributes: Dict[str, str] = None
):
    """
    Decorator for XML schema tools with flexible content mapping.
    
    Args:
        tag_name: Name of the root XML tag
        param_mapping: Maps XML elements (content or nested tags) to function parameters
        attributes: Maps XML attributes to function parameters
    
    Example:
        @xml_schema(
            tag_name="str-replace",
            attributes={"file_path": "file_path"},
            param_mapping={
                ".": "new_str",  # "." means root tag content
                "old_str": "old_str",  # nested tag name -> param name
                "new_str": "new_str"
            }
        )
    """
    def decorator(func):
        return _add_schema(func, ToolSchema(
            schema_type=SchemaType.XML,
            schema={},
            xml_schema=XMLTagSchema(
                tag_name=tag_name,
                param_mapping=param_mapping or {},
                attributes=attributes or {}
            )
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
