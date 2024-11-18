"""
Standard implementation of tool execution with configurable execution strategies.

This module provides the default implementation for executing tool calls, supporting
both parallel and sequential execution patterns with comprehensive error handling.
"""

import asyncio
import json
import logging
from typing import Dict, Any, List, Set, Callable, Optional
from agentpress.base_processors import ToolExecutorBase
from agentpress.tool import ToolResult

# --- Standard Tool Executor Implementation ---

class StandardToolExecutor(ToolExecutorBase):
    """Standard implementation of tool execution with configurable strategies.
    
    Provides a flexible tool execution implementation that supports both parallel
    and sequential execution patterns, with built-in error handling and result
    formatting.
    
    Attributes:
        parallel (bool): Whether to execute tools in parallel
        
    Methods:
        execute_tool_calls: Main execution entry point
        _execute_parallel: Parallel execution implementation
        _execute_sequential: Sequential execution implementation
    """
    
    def __init__(self, parallel: bool = True):
        """Initialize the executor with execution strategy.
        
        Args:
            parallel: Whether to execute tools in parallel (default: True)
        """
        self.parallel = parallel
    
    async def execute_tool_calls(
        self,
        tool_calls: List[Dict[str, Any]],
        available_functions: Dict[str, Callable],
        thread_id: str,
        executed_tool_calls: Optional[Set[str]] = None
    ) -> List[Dict[str, Any]]:
        """Execute a list of tool calls using the configured strategy.
        
        Args:
            tool_calls: List of tool calls to execute
            available_functions: Dictionary mapping function names to implementations
            thread_id: ID of the current conversation thread
            executed_tool_calls: Set tracking already executed tool call IDs
            
        Returns:
            List of tool execution results
            
        Notes:
            - Automatically chooses between parallel and sequential execution
            - Maintains execution history to prevent duplicate executions
        """
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
                return None
                
            try:
                function_name = tool_call['function']['name']
                function_args = tool_call['function']['arguments']
                if isinstance(function_args, str):
                    function_args = json.loads(function_args)
                
                function_to_call = available_functions.get(function_name)
                if not function_to_call:
                    error_msg = f"Function {function_name} not found"
                    logging.error(error_msg)
                    return {
                        "role": "tool",
                        "tool_call_id": tool_call['id'],
                        "name": function_name,
                        "content": str(ToolResult(success=False, output=error_msg))
                    }

                result = await function_to_call(**function_args)
                logging.info(f"Tool execution result for {function_name}: {result}")
                executed_tool_calls.add(tool_call['id'])
                
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
                
                function_to_call = available_functions.get(function_name)
                if not function_to_call:
                    error_msg = f"Function {function_name} not found"
                    logging.error(error_msg)
                    result = ToolResult(success=False, output=error_msg)
                else:
                    result = await function_to_call(**function_args)
                    logging.info(f"Tool execution result for {function_name}: {result}")
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

