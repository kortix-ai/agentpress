import logging
from typing import Dict, Any, AsyncGenerator, Callable, List, Optional, Set
from abc import ABC, abstractmethod
import asyncio
import json
from dataclasses import dataclass
from agentpress.tool import ToolResult

# --- Tool Parser Base ---

class ToolParserBase(ABC):
    """Abstract base class defining the interface for parsing tool calls from LLM responses.
    
    This class provides the foundational interface for parsing both complete and streaming
    responses from Language Models, specifically focusing on tool call extraction and processing.
    
    Attributes:
        None
        
    Methods:
        parse_response: Processes complete LLM responses
        parse_stream: Handles streaming response chunks
    """
    
    @abstractmethod
    async def parse_response(self, response: Any) -> Dict[str, Any]:
        """Parse a complete LLM response and extract tool calls.
        
        Args:
            response (Any): The complete response from the LLM
            
        Returns:
            Dict[str, Any]: A dictionary containing:
                - role: The message role (usually 'assistant')
                - content: The text content of the response
                - tool_calls: List of extracted tool calls (if present)
        """
        pass
    
    @abstractmethod
    async def parse_stream(self, response_chunk: Any, tool_calls_buffer: Dict[int, Dict]) -> tuple[Optional[Dict[str, Any]], bool]:
        """Parse a streaming response chunk and manage tool call accumulation.
        
        Args:
            response_chunk (Any): A single chunk from the streaming response
            tool_calls_buffer (Dict[int, Dict]): Buffer storing incomplete tool calls
            
        Returns:
            tuple[Optional[Dict[str, Any]], bool]: A tuple containing:
                - The parsed message if complete tool calls are found (or None)
                - Boolean indicating if the stream is complete
        """
        pass

# --- Tool Executor Base ---

class ToolExecutorBase(ABC):
    """Abstract base class defining the interface for tool execution strategies.
    
    This class provides the foundation for implementing different tool execution
    approaches, supporting both parallel and sequential execution patterns.
    
    Attributes:
        None
        
    Methods:
        execute_tool_calls: Main entry point for tool execution
        _execute_parallel: Handles parallel tool execution
        _execute_sequential: Handles sequential tool execution
    """
    
    @abstractmethod
    async def execute_tool_calls(
        self,
        tool_calls: List[Dict[str, Any]],
        available_functions: Dict[str, Callable],
        thread_id: str,
        executed_tool_calls: Optional[Set[str]] = None
    ) -> List[Dict[str, Any]]:
        """Execute a list of tool calls and return their results.
        
        Args:
            tool_calls: List of tool calls to execute
            available_functions: Dictionary of available tool functions
            thread_id: ID of the current conversation thread
            executed_tool_calls: Set of already executed tool call IDs
            
        Returns:
            List[Dict[str, Any]]: List of tool execution results
        """
        pass
    
    @abstractmethod
    async def _execute_parallel(
        self,
        tool_calls: List[Dict[str, Any]],
        available_functions: Dict[str, Callable],
        thread_id: str,
        executed_tool_calls: Set[str]
    ) -> List[Dict[str, Any]]:
        """Execute tool calls in parallel."""
        pass
    
    @abstractmethod
    async def _execute_sequential(
        self,
        tool_calls: List[Dict[str, Any]],
        available_functions: Dict[str, Callable],
        thread_id: str,
        executed_tool_calls: Set[str]
    ) -> List[Dict[str, Any]]:
        """Execute tool calls sequentially."""
        pass

# --- Standard Tool Parser Implementation ---

class StandardToolParser(ToolParserBase):
    """Standard implementation of tool parsing for OpenAI-compatible API responses.
    
    This implementation handles the parsing of tool calls from responses that follow
    the OpenAI API format, supporting both complete and streaming responses.
    
    Methods:
        parse_response: Process complete LLM responses
        parse_stream: Handle streaming response chunks
    """
    
    async def parse_response(self, response: Any) -> Dict[str, Any]:
        response_message = response.choices[0].message
        message = {
            "role": "assistant",
            "content": response_message.get('content') or "",
        }
        
        tool_calls = response_message.get('tool_calls')
        if tool_calls:
            message["tool_calls"] = [
                {
                    "id": tool_call.id,
                    "type": "function",
                    "function": {
                        "name": tool_call.function.name,
                        "arguments": tool_call.function.arguments
                    }
                } for tool_call in tool_calls
            ]
        
        return message

    async def parse_stream(self, chunk: Any, tool_calls_buffer: Dict[int, Dict]) -> tuple[Optional[Dict[str, Any]], bool]:
        content_chunk = ""
        is_complete = False
        has_complete_tool_call = False
        
        if hasattr(chunk.choices[0], 'delta'):
            delta = chunk.choices[0].delta
            
            if hasattr(delta, 'content') and delta.content:
                content_chunk = delta.content

            if hasattr(delta, 'tool_calls') and delta.tool_calls:
                for tool_call in delta.tool_calls:
                    idx = tool_call.index
                    if idx not in tool_calls_buffer:
                        tool_calls_buffer[idx] = {
                            'id': tool_call.id if hasattr(tool_call, 'id') and tool_call.id else None,
                            'type': 'function',
                            'function': {
                                'name': tool_call.function.name if hasattr(tool_call.function, 'name') and tool_call.function.name else None,
                                'arguments': ''
                            }
                        }
                    
                    current_tool = tool_calls_buffer[idx]
                    if hasattr(tool_call, 'id') and tool_call.id:
                        current_tool['id'] = tool_call.id
                    if hasattr(tool_call.function, 'name') and tool_call.function.name:
                        current_tool['function']['name'] = tool_call.function.name
                    if hasattr(tool_call.function, 'arguments') and tool_call.function.arguments:
                        current_tool['function']['arguments'] += tool_call.function.arguments
                    
                    if (current_tool['id'] and 
                        current_tool['function']['name'] and 
                        current_tool['function']['arguments']):
                        try:
                            json.loads(current_tool['function']['arguments'])
                            has_complete_tool_call = True
                        except json.JSONDecodeError:
                            pass

        if hasattr(chunk.choices[0], 'finish_reason') and chunk.choices[0].finish_reason:
            is_complete = True

        if has_complete_tool_call or is_complete:
            complete_tool_calls = []
            for idx, tool_call in tool_calls_buffer.items():
                try:
                    if (tool_call['id'] and 
                        tool_call['function']['name'] and 
                        tool_call['function']['arguments']):
                        json.loads(tool_call['function']['arguments'])
                        complete_tool_calls.append(tool_call)
                except json.JSONDecodeError:
                    continue
            
            if complete_tool_calls:
                return {
                    "role": "assistant",
                    "content": content_chunk,
                    "tool_calls": complete_tool_calls
                }, is_complete

        return None, is_complete

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
        self.parallel = parallel
    
    async def execute_tool_calls(
        self,
        tool_calls: List[Dict[str, Any]],
        available_functions: Dict[str, Callable],
        thread_id: str,
        executed_tool_calls: Optional[Set[str]] = None
    ) -> List[Dict[str, Any]]:
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

# --- Response Processor ---

@dataclass
class ProcessedResponse:
    """Container for processed LLM response data."""
    content: str
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_results: Optional[List[Dict[str, Any]]] = None

class StandardLLMResponseProcessor:
    """Handles LLM response processing and tool execution management.
    
    This class coordinates the parsing of LLM responses and execution of tool calls,
    managing state and message flow throughout the conversation.
    
    Attributes:
        thread_id (str): Current thread identifier
        tool_executor (StandardToolExecutor): Tool execution handler
        tool_parser (StandardToolParser): Response parsing handler
        available_functions (Dict): Available tool functions
        add_message (Callable): Callback for adding messages
        update_message (Callable): Callback for updating messages
        list_messages (Callable): Callback for listing messages
        threads_dir (str): Directory for thread storage
        tool_calls_buffer (Dict): Buffer for incomplete tool calls
        processed_tool_calls (Set): Set of executed tool call IDs
        content_buffer (str): Buffer for accumulated content
        tool_calls_accumulated (List): List of accumulated tool calls
        message_added (bool): Flag for message addition status
    """
    
    def __init__(
        self,
        thread_id: str,
        available_functions: Dict = None,
        add_message_callback: Callable = None,
        update_message_callback: Callable = None,
        list_messages_callback: Callable = None,
        parallel_tool_execution: bool = True,
        threads_dir: str = "threads"
    ):
        self.thread_id = thread_id
        self.tool_executor = StandardToolExecutor(parallel=parallel_tool_execution)
        self.tool_parser = StandardToolParser()
        self.available_functions = available_functions or {}
        self.add_message = add_message_callback
        self.update_message = update_message_callback
        self.list_messages = list_messages_callback
        self.threads_dir = threads_dir
        
        # State tracking for streaming responses
        self.tool_calls_buffer = {}
        self.processed_tool_calls = set()
        self.content_buffer = ""
        self.tool_calls_accumulated = []
        self.message_added = False

    async def process_stream(
        self,
        response_stream: AsyncGenerator,
        execute_tools: bool = True,
        immediate_execution: bool = True 
    ) -> AsyncGenerator:
        """
        Process streaming LLM response and handle tool execution.
        Yields chunks immediately while managing message state and tool execution efficiently.
        """
        pending_tool_calls = []
        background_tasks = set()
        tool_results = []  # Track tool results

        async def handle_message_management(chunk):
            try:
                nonlocal tool_results

                # Accumulate content
                if hasattr(chunk.choices[0].delta, 'content') and chunk.choices[0].delta.content:
                    self.content_buffer += chunk.choices[0].delta.content
                
                # Parse tool calls only if present in chunk
                if hasattr(chunk.choices[0].delta, 'tool_calls'):
                    parsed_message, is_complete = await self.tool_parser.parse_stream(
                        chunk, 
                        self.tool_calls_buffer
                    )
                    if parsed_message and 'tool_calls' in parsed_message:
                        self.tool_calls_accumulated = parsed_message['tool_calls']

                # Handle tool execution and results
                if execute_tools and self.tool_calls_accumulated:
                    new_tool_calls = [
                        tool_call for tool_call in self.tool_calls_accumulated
                        if tool_call['id'] not in self.processed_tool_calls
                    ]

                    if new_tool_calls and immediate_execution:
                        results = await self.tool_executor.execute_tool_calls(
                            tool_calls=new_tool_calls,
                            available_functions=self.available_functions,
                            thread_id=self.thread_id,
                            executed_tool_calls=self.processed_tool_calls
                        )
                        tool_results.extend(results)
                        for result in results:
                            self.processed_tool_calls.add(result['tool_call_id'])
                    elif new_tool_calls:
                        pending_tool_calls.extend(new_tool_calls)

                for result in tool_results:
                    if not any(msg.get('tool_call_id') == result['tool_call_id'] 
                             for msg in await self.list_messages(self.thread_id)):
                        await self.add_message(self.thread_id, result)
                tool_results = []  # Clear processed results

                # Then add/update assistant message
                message = {
                    "role": "assistant",
                    "content": self.content_buffer
                }
                if self.tool_calls_accumulated:
                    message["tool_calls"] = self.tool_calls_accumulated

                if not self.message_added:
                    await self.add_message(self.thread_id, message)
                    self.message_added = True
                else:
                    await self.update_message(self.thread_id, message)

                # Handle stream completion
                if chunk.choices[0].finish_reason:
                    if not immediate_execution and pending_tool_calls:
                        results = await self.tool_executor.execute_tool_calls(
                            tool_calls=pending_tool_calls,
                            available_functions=self.available_functions,
                            thread_id=self.thread_id,
                            executed_tool_calls=self.processed_tool_calls
                        )
                        for result in results:
                            await self.add_message(self.thread_id, result)
                            self.processed_tool_calls.add(result['tool_call_id'])
                        pending_tool_calls.clear()

            except Exception as e:
                logging.error(f"Error in background task: {e}")
                return

        try:
            async for chunk in response_stream:
                # Create and track background task
                task = asyncio.create_task(handle_message_management(chunk))
                background_tasks.add(task)
                task.add_done_callback(background_tasks.discard)
                
                # Immediately yield the chunk
                yield chunk

            # Wait for all background tasks to complete
            if background_tasks:
                await asyncio.gather(*background_tasks, return_exceptions=True)
                
        except Exception as e:
            logging.error(f"Error in stream processing: {e}")
            # Clean up any remaining background tasks
            for task in background_tasks:
                if not task.done():
                    task.cancel()
            raise

    async def process_response(
        self,
        response: Any,
        execute_tools: bool = True
    ) -> None:
        """
        Process complete LLM response and execute tools.
        
        Handles non-streaming responses, parsing the complete response and
        executing any tool calls according to the configured execution strategy.
        """
        try:
            assistant_message = await self.tool_parser.parse_response(response)
            await self.add_message(self.thread_id, assistant_message)

            if execute_tools and 'tool_calls' in assistant_message and assistant_message['tool_calls']:
                results = await self.tool_executor.execute_tool_calls(
                    tool_calls=assistant_message['tool_calls'],
                    available_functions=self.available_functions,
                    thread_id=self.thread_id,
                    executed_tool_calls=self.processed_tool_calls
                )
                
                for result in results:
                    await self.add_message(self.thread_id, result)
                    logging.info(f"Tool execution result: {result}")
        
        except Exception as e:
            logging.error(f"Error processing response: {e}")
            response_content = response.choices[0].message.get('content', '')
            await self.add_message(self.thread_id, {
                "role": "assistant", 
                "content": response_content or ""
            })

class ThreadManager:
    """Manages conversation threads with LLM models and tool execution.
    
    The ThreadManager provides comprehensive conversation management, handling
    message threading, tool registration, and LLM interactions.
    
    Attributes:
        threads_dir (str): Directory for storing thread files
        tool_registry (ToolRegistry): Registry for managing available tools
        
    Key Features:
        - Thread creation and management
        - Message handling with support for text and images
        - Tool registration and execution
        - LLM interaction with streaming support
        - Error handling and cleanup
    """
