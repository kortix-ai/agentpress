"""
This module provides a flexible foundation for creating and managing tools in the AgentPress system.

The tool system allows for easy creation of function-like tools that can be used by AI models.
It provides a way to define any schema format for these tools, making it compatible with
various AI model interfaces and custom implementations.

Key components:
- ToolResult: A dataclass representing the result of a tool execution
- Tool: An abstract base class that all tools should inherit from
- tool_schema: A decorator for defining tool schemas in any format

Usage:
1. Create a new tool by subclassing Tool
2. Define methods and decorate them with @tool_schema
3. The Tool class will automatically register these schemas
4. Use the tool in your ThreadManager

Example OpenAPI Schema:
    class CalculatorTool(Tool):
        @tool_schema({
            "type": "function",
            "function": {
                "name": "divide",
                "description": "Divide two numbers",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "a": {"type": "number", "description": "Numerator"},
                        "b": {"type": "number", "description": "Denominator"}
                    },
                    "required": ["a", "b"]
                }
            }
        })
        async def divide(self, a: float, b: float) -> ToolResult:
            if b == 0:
                return self.fail_response("Cannot divide by zero")
            return self.success_response(f"Result: {a/b}")

Example Custom Schema:
    class DeliveryTool(Tool):
        @tool_schema({
            "name": "get_delivery_date",
            "description": "Get delivery date for order",
            "input_format": "order_id: string",
            "output_format": "delivery_date: ISO-8601 date string",
            "examples": [
                {"input": "ORD123", "output": "2024-03-25"}
            ],
            "error_handling": {
                "invalid_order": "Returns error if order not found",
                "system_error": "Returns error on system failures"
            }
        })
        async def get_delivery_date(self, order_id: str) -> ToolResult:
            date = await self.fetch_delivery_date(order_id)
            return self.success_response(date)
"""

from typing import Dict, Any, Union
from dataclasses import dataclass
from abc import ABC
import json
import inspect

@dataclass
class ToolResult:
    """Container for tool execution results."""
    success: bool
    output: str

class Tool(ABC):
    """Abstract base class for all tools.
    
    This class provides the foundation for creating tools with flexible schema definitions.
    Subclasses can implement specific tool methods and define schemas in any format.
    """
    
    def __init__(self):
        self._schemas = {}
        self._register_schemas()

    def _register_schemas(self):
        """Register schemas from all decorated methods."""
        for name, method in inspect.getmembers(self, predicate=inspect.ismethod):
            if hasattr(method, 'schema'):
                self._schemas[name] = method.schema

    def get_schemas(self) -> Dict[str, Dict[str, Any]]:
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

def tool_schema(schema: Dict[str, Any]):
    """Decorator for defining tool schemas.
    
    Allows attaching any schema format to tool methods. The schema can follow
    any specification (OpenAPI, custom format, etc.) as long as it's serializable
    to JSON.
    
    Examples:
        # OpenAPI-style schema
        @tool_schema({
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "Get weather forecast",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {"type": "string"}
                    }
                }
            }
        })
        
        # Custom schema format
        @tool_schema({
            "tool_name": "analyze_sentiment",
            "input": {
                "text": "string - Text to analyze",
                "language": "optional string - Language code"
            },
            "output": {
                "sentiment": "string - Positive/Negative/Neutral",
                "confidence": "float - Confidence score"
            },
            "error_cases": [
                "invalid_language",
                "text_too_long"
            ]
        })
        
        # Minimal schema
        @tool_schema({
            "name": "ping",
            "description": "Check if service is alive"
        })
    """
    def decorator(func):
        func.schema = schema
        return func
    return decorator
