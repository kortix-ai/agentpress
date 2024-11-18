"""
XML-specific implementation of tool execution with registry integration.

This module provides specialized tool execution for XML-formatted tool calls,
with integrated tool registry support and comprehensive error handling.
"""

from typing import List, Dict, Any, Set, Callable, Optional
import asyncio
import json
import logging
from agentpress.base_processors import ToolExecutorBase
from agentpress.tool import ToolResult
from agentpress.tool_registry import ToolRegistry

class XMLToolExecutor(ToolExecutorBase):
    """XML-specific implementation of tool execution with registry integration.
    
    Provides tool execution specifically designed for XML-formatted tool calls,
    with integrated tool registry support and proper error handling.
    
    Attributes:
        parallel (bool): Whether to execute tools in parallel
        tool_registry (ToolRegistry): Registry containing tool implementations
        
    Methods:
        execute_tool_calls: Main execution entry point
        _execute_parallel: Parallel execution implementation
        _execute_sequential: Sequential execution implementation
    """
    
    def __init__(self, parallel: bool = True, tool_registry: Optional[ToolRegistry] = None):
        """Initialize executor with execution strategy and tool registry.
        
        Args:
            parallel: Whether to execute tools in parallel (default: True)
            tool_registry: Registry containing tool implementations (optional)
        """
        self.parallel = parallel
        self.tool_registry = tool_registry or ToolRegistry()
    
    async def execute_tool_calls(
        self,
        tool_calls: List[Dict[str, Any]],
        available_functions: Dict[str, Callable],
        thread_id: str,
        executed_tool_calls: Optional[Set[str]] = None
    ) -> List[Dict[str, Any]]:
        """Execute XML-formatted tool calls using the configured strategy.
        
        Args:
            tool_calls: List of tool calls to execute
            available_functions: Dictionary of available functions
            thread_id: ID of the current conversation thread
            executed_tool_calls: Set tracking executed tool call IDs
            
        Returns:
            List of tool execution results
            
        Notes:
            - Uses tool registry to look up implementations
            - Maintains execution history to prevent duplicates
        """
        logging.info(f"Executing {len(tool_calls)} tool calls")
        if executed_tool_calls is None:
            executed_tool_calls = set()
            
        if self.parallel:
            return await self._execute_parallel(
                tool_calls, 
                available_functions, 
                thread_id, 
                executed_tool_calls
            )
        else:
            return await self._execute_sequential(
                tool_calls, 
                available_functions, 
                thread_id, 
                executed_tool_calls
            )
    
    async def _execute_parallel(
        self,
        tool_calls: List[Dict[str, Any]],
        available_functions: Dict[str, Callable],
        thread_id: str,
        executed_tool_calls: Set[str]
    ) -> List[Dict[str, Any]]:
        async def execute_single_tool(tool_call: Dict[str, Any]) -> Dict[str, Any]:
            if tool_call['id'] in executed_tool_calls:
                logging.info(f"Tool call {tool_call['id']} already executed")
                return None
                
            try:
                function_name = tool_call['function']['name']
                function_args = tool_call['function']['arguments']
                logging.info(f"Executing tool: {function_name} with args: {function_args}")
                
                if isinstance(function_args, str):
                    function_args = json.loads(function_args)
                
                # Get tool info from registry
                tool_info = self.tool_registry.get_tool(function_name)
                if not tool_info:
                    error_msg = f"Function {function_name} not found in registry"
                    logging.error(error_msg)
                    return {
                        "role": "tool",
                        "tool_call_id": tool_call['id'],
                        "name": function_name,
                        "content": str(ToolResult(success=False, output=error_msg))
                    }

                # Get function from tool instance
                function_to_call = getattr(tool_info['instance'], function_name)
                if not function_to_call:
                    error_msg = f"Function {function_name} not found on tool instance"
                    logging.error(error_msg)
                    return {
                        "role": "tool",
                        "tool_call_id": tool_call['id'],
                        "name": function_name,
                        "content": str(ToolResult(success=False, output=error_msg))
                    }

                logging.info(f"Calling function {function_name} with args: {function_args}")
                result = await function_to_call(**function_args)
                executed_tool_calls.add(tool_call['id'])
                
                logging.info(f"Function {function_name} completed with result: {result}")
                return {
                    "role": "tool",
                    "tool_call_id": tool_call['id'],
                    "name": function_name,
                    "content": str(result)
                }
            except Exception as e:
                error_msg = f"Error executing {function_name}: {str(e)}"
                logging.error(error_msg)
                return {
                    "role": "tool",
                    "tool_call_id": tool_call['id'],
                    "name": function_name,
                    "content": str(ToolResult(success=False, output=error_msg))
                }

        tasks = [execute_single_tool(tool_call) for tool_call in tool_calls]
        results = await asyncio.gather(*tasks)
        return [r for r in results if r is not None]
    
    async def _execute_sequential(
        self,
        tool_calls: List[Dict[str, Any]],
        available_functions: Dict[str, Callable],
        thread_id: str,
        executed_tool_calls: Set[str]
    ) -> List[Dict[str, Any]]:
        results = []
        for tool_call in tool_calls:
            if tool_call['id'] in executed_tool_calls:
                continue
                
            try:
                function_name = tool_call['function']['name']
                function_args = tool_call['function']['arguments']
                if isinstance(function_args, str):
                    function_args = json.loads(function_args)
                
                # Get tool info from registry
                tool_info = self.tool_registry.get_tool(function_name)
                if not tool_info:
                    error_msg = f"Function {function_name} not found in registry"
                    logging.error(error_msg)
                    result = ToolResult(success=False, output=error_msg)
                else:
                    # Get function from tool instance
                    function_to_call = getattr(tool_info['instance'], function_name, None)
                    if not function_to_call:
                        error_msg = f"Function {function_name} not found on tool instance"
                        logging.error(error_msg)
                        result = ToolResult(success=False, output=error_msg)
                    else:
                        result = await function_to_call(**function_args)
                        executed_tool_calls.add(tool_call['id'])
                
                results.append({
                    "role": "tool",
                    "tool_call_id": tool_call['id'],
                    "name": function_name,
                    "content": str(result)
                })
            except Exception as e:
                error_msg = f"Error executing {function_name}: {str(e)}"
                logging.error(error_msg)
                results.append({
                    "role": "tool",
                    "tool_call_id": tool_call['id'],
                    "name": function_name,
                    "content": str(ToolResult(success=False, output=error_msg))
                })
        
        return results 