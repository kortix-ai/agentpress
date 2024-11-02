"""
This module provides the foundation for creating and managing tools in the AgentPress system.

The tool system allows for easy creation of function-like tools that can be used by AI models.
It provides a way to define OpenAPI schemas for these tools, which can then be used to generate
appropriate function calls in the AI model's context.

Key components:
- ToolResult: A dataclass representing the result of a tool execution.
- Tool: An abstract base class that all tools should inherit from.
- tool_schema: A decorator for easily defining OpenAPI schemas for tool methods.

Usage:
1. Create a new tool by subclassing Tool.
2. Define methods in your tool class and decorate them with @tool_schema.
3. The Tool class will automatically register these schemas.
4. Use the tool in your ThreadManager by adding it with add_tool method.

Example:
    class CalculatorTool(Tool):
        @tool_schema({
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
        })
        async def divide(self, a: float, b: float) -> ToolResult:
            if b == 0:
                return self.fail_response("Cannot divide by zero")
            result = a / b
            return self.success_response(f"The result of {a} ÷ {b} = {result}")

    # In your thread manager:
    manager.add_tool(CalculatorTool)
    
    # Example usage:
    # Success case: divide(10, 2) -> ToolResult(success=True, output="The result of 10 ÷ 2 = 5")
    # Failure case: divide(10, 0) -> ToolResult(success=False, output="Cannot divide by zero")
"""

from typing import Dict, Any, Union
from dataclasses import dataclass
from abc import ABC
import json
import inspect

@dataclass
class ToolResult:
    """
    Represents the result of a tool execution.

    Attributes:
        success (bool): Whether the tool execution was successful.
        output (str): The output of the tool execution.
    """
    success: bool
    output: str

class Tool(ABC):
    """
    Abstract base class for all tools.

    This class provides the basic structure and functionality for tools.
    Subclasses should implement specific tool methods decorated with @tool_schema.

    Methods:
        get_schemas(): Returns a dictionary of all registered tool schemas.
        success_response(data): Creates a successful ToolResult.
        fail_response(msg): Creates a failed ToolResult.
    """
    def __init__(self):
        self._schemas = {}
        self._register_schemas()

    def _register_schemas(self):
        """
        Automatically registers schemas for all methods decorated with @tool_schema.
        """
        for name, method in inspect.getmembers(self, predicate=inspect.ismethod):
            if hasattr(method, 'schema'):
                self._schemas[name] = method.schema

    def get_schemas(self) -> Dict[str, Dict[str, Any]]:
        """
        Returns a dictionary of all registered tool schemas, formatted for use with AI models.
        """
        return self._schemas

    def success_response(self, data: Union[Dict[str, Any], str]) -> ToolResult:
        """
        Creates a successful ToolResult with the given data.

        Args:
            data: The data to include in the success response.

        Returns:
            A ToolResult indicating success.
        """
        if isinstance(data, str):
            text = data
        else:
            text = json.dumps(data, indent=2)
        return ToolResult(success=True, output=text)

    def fail_response(self, msg: str) -> ToolResult:
        """
        Creates a failed ToolResult with the given error message.

        Args:
            msg: The error message to include in the failure response.

        Returns:
            A ToolResult indicating failure.
        """
        return ToolResult(success=False, output=msg)

def tool_schema(schema: Dict[str, Any]):
    """
    A decorator for easily defining OpenAPI schemas for tool methods.

    This decorator allows you to define the schema for a tool method inline with the method definition.
    It attaches the provided schema directly to the method.

    Args:
        schema (Dict[str, Any]): An OpenAPI schema describing the tool.

    Example:
        @tool_schema({
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
        })
        async def divide(self, a: float, b: float) -> ToolResult:
            if b == 0:
                return self.fail_response("Cannot divide by zero")
            result = a / b
            return self.success_response(f"The result of {a} ÷ {b} = {result}")
    """
    def decorator(func):
        func.schema = {
            "type": "function",
            "function": schema
        }
        return func
    return decorator
