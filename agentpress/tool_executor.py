from abc import ABC, abstractmethod
from typing import Dict, List, Any, Set, Callable, Optional
import json
import logging
import asyncio
from agentpress.tool import ToolResult

class ToolExecutor(ABC):
    """
    Abstract base class for tool execution strategies.
    
    Tool executors are responsible for running tool functions based on LLM tool calls.
    They handle both synchronous and streaming execution modes, managing the lifecycle
    of tool calls and their results.
    """
    
    @abstractmethod
    async def execute_tool_calls(
        self,
        tool_calls: List[Dict[str, Any]],
        available_functions: Dict[str, Callable],
        thread_id: str,
        executed_tool_calls: Optional[Set[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Execute a list of tool calls and return their results.
        
        Args:
            tool_calls (List[Dict[str, Any]]): List of tool calls to execute
            available_functions (Dict[str, Callable]): Map of function names to implementations
            thread_id (str): ID of the thread requesting execution
            executed_tool_calls (Optional[Set[str]]): Set tracking already executed calls
            
        Returns:
            List[Dict[str, Any]]: Results from tool executions
        """
        pass
    
    @abstractmethod
    async def execute_streaming_tool_calls(
        self,
        tool_calls_buffer: Dict[int, Dict],
        available_functions: Dict[str, Callable],
        thread_id: str,
        executed_tool_calls: Set[str]
    ) -> List[Dict[str, Any]]:
        """
        Execute tool calls from a streaming buffer when they're complete.
        
        Args:
            tool_calls_buffer (Dict[int, Dict]): Buffer containing tool calls
            available_functions (Dict[str, Callable]): Map of function names to implementations
            thread_id (str): ID of the thread requesting execution
            executed_tool_calls (Set[str]): Set tracking already executed calls
            
        Returns:
            List[Dict[str, Any]]: Results from completed tool executions
        """
        pass

class StandardToolExecutor(ToolExecutor):
    """
    Standard implementation of tool execution.
    
    Executes tool calls concurrently using asyncio.gather(). Handles both streaming
    and non-streaming execution modes, with support for tracking executed calls to
    prevent duplicates.
    """
    
    async def execute_tool_calls(
        self,
        tool_calls: List[Dict[str, Any]],
        available_functions: Dict[str, Callable],
        thread_id: str,
        executed_tool_calls: Optional[Set[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Execute all tool calls asynchronously.
        
        Args:
            tool_calls (List[Dict[str, Any]]): List of tool calls to execute
            available_functions (Dict[str, Callable]): Map of function names to implementations
            thread_id (str): ID of the thread requesting execution
            executed_tool_calls (Optional[Set[str]]): Set tracking already executed calls
            
        Returns:
            List[Dict[str, Any]]: Results from tool executions, including error responses
                for failed executions
        """
        if executed_tool_calls is None:
            executed_tool_calls = set()
            
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

    async def execute_streaming_tool_calls(
        self,
        tool_calls_buffer: Dict[int, Dict],
        available_functions: Dict[str, Callable],
        thread_id: str,
        executed_tool_calls: Set[str]
    ) -> List[Dict[str, Any]]:
        """
        Execute complete tool calls from the streaming buffer.
        
        Args:
            tool_calls_buffer (Dict[int, Dict]): Buffer containing tool calls
            available_functions (Dict[str, Callable]): Map of function names to implementations
            thread_id (str): ID of the thread requesting execution
            executed_tool_calls (Set[str]): Set tracking already executed calls
            
        Returns:
            List[Dict[str, Any]]: Results from completed tool executions
            
        Note:
            Only executes tool calls that are complete (have all required fields)
            and haven't been executed before.
        """
        complete_tool_calls = []
        
        # Find complete tool calls that haven't been executed
        for idx, tool_call in tool_calls_buffer.items():
            if (tool_call.get('id') and 
                tool_call['function'].get('name') and 
                tool_call['function'].get('arguments') and
                tool_call['id'] not in executed_tool_calls):
                try:
                    # Verify arguments are complete JSON
                    if isinstance(tool_call['function']['arguments'], str):
                        json.loads(tool_call['function']['arguments'])
                    complete_tool_calls.append(tool_call)
                except json.JSONDecodeError:
                    continue
        
        if complete_tool_calls:
            return await self.execute_tool_calls(
                complete_tool_calls,
                available_functions,
                thread_id,
                executed_tool_calls
            )
        
        return []

class SequentialToolExecutor(ToolExecutor):
    """
    Sequential implementation of tool execution.
    
    Executes tool calls one at a time in sequence. This can be useful when tools
    need to be executed in a specific order or when concurrent execution might
    cause conflicts.
    """
    
    async def execute_tool_calls(
        self,
        tool_calls: List[Dict[str, Any]],
        available_functions: Dict[str, Callable],
        thread_id: str,
        executed_tool_calls: Optional[Set[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Execute tool calls sequentially.
        
        Args:
            tool_calls (List[Dict[str, Any]]): List of tool calls to execute
            available_functions (Dict[str, Callable]): Map of function names to implementations
            thread_id (str): ID of the thread requesting execution
            executed_tool_calls (Optional[Set[str]]): Set tracking already executed calls
            
        Returns:
            List[Dict[str, Any]]: Results from tool executions in order of execution
        """
        if executed_tool_calls is None:
            executed_tool_calls = set()
            
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

    async def execute_streaming_tool_calls(
        self,
        tool_calls_buffer: Dict[int, Dict],
        available_functions: Dict[str, Callable],
        thread_id: str,
        executed_tool_calls: Set[str]
    ) -> List[Dict[str, Any]]:
        """
        Execute complete tool calls from the streaming buffer sequentially.
        
        Args:
            tool_calls_buffer (Dict[int, Dict]): Buffer containing tool calls
            available_functions (Dict[str, Callable]): Map of function names to implementations
            thread_id (str): ID of the thread requesting execution
            executed_tool_calls (Set[str]): Set tracking already executed calls
            
        Returns:
            List[Dict[str, Any]]: Results from completed tool executions in order
            
        Note:
            Only executes tool calls that are complete and haven't been executed before,
            maintaining the order of the original buffer indices.
        """
        complete_tool_calls = []
        
        # Find complete tool calls that haven't been executed
        for idx, tool_call in tool_calls_buffer.items():
            if (tool_call.get('id') and 
                tool_call['function'].get('name') and 
                tool_call['function'].get('arguments') and
                tool_call['id'] not in executed_tool_calls):
                try:
                    if isinstance(tool_call['function']['arguments'], str):
                        json.loads(tool_call['function']['arguments'])
                    complete_tool_calls.append(tool_call)
                except json.JSONDecodeError:
                    continue
        
        if complete_tool_calls:
            return await self.execute_tool_calls(
                complete_tool_calls,
                available_functions,
                thread_id,
                executed_tool_calls
            )
        
        return []