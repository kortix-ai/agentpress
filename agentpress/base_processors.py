"""
Core abstract base classes defining the interfaces for processing LLM responses and tool execution.

This module provides the foundational architecture for:
- Parsing LLM responses and extracting tool calls
- Executing tool calls with different strategies
- Managing results and message processing
"""

from typing import Dict, Any, Callable, List, Optional, Set
from abc import ABC, abstractmethod

# --- Tool Parser Base ---

class ToolParserBase(ABC):
    """Abstract base class defining the interface for parsing tool calls from LLM responses.
    
    This class provides the foundation for implementing different parsing strategies for both
    complete and streaming LLM responses. Implementations handle extracting and validating
    tool calls from various response formats (e.g., OpenAI function calls, XML tags).
    
    Methods:
        parse_response: Process complete LLM responses
        parse_stream: Handle streaming response chunks
    """
    
    @abstractmethod
    async def parse_response(self, response: Any) -> Dict[str, Any]:
        """Parse a complete LLM response and extract tool calls.
        
        Args:
            response: The complete response from the LLM
            
        Returns:
            Dict containing:
                - role (str): Message role (usually 'assistant')
                - content (str): Text content of the response
                - tool_calls (List[Dict], optional): Extracted tool calls
                
        Raises:
            Exception: If parsing fails or response format is invalid
        """
        pass
    
    @abstractmethod
    async def parse_stream(self, response_chunk: Any, tool_calls_buffer: Dict[int, Dict]) -> tuple[Optional[Dict[str, Any]], bool]:
        """Parse a streaming response chunk and manage tool call accumulation.
        
        Args:
            response_chunk: A single chunk from the streaming response
            tool_calls_buffer: Buffer storing incomplete tool calls
            
        Returns:
            Tuple containing:
                - Optional[Dict]: Parsed message if complete tool calls found, None otherwise
                - bool: True if stream is complete, False otherwise
                
        Raises:
            Exception: If chunk parsing fails
            
        Notes:
            - Implementations should handle partial tool calls and accumulate them in the buffer
            - The buffer should be used to track state across multiple chunks
        """
        pass

# --- Tool Executor Base ---

class ToolExecutorBase(ABC):
    """Abstract base class defining the interface for tool execution strategies.
    
    Provides the foundation for implementing different tool execution approaches,
    supporting both parallel and sequential execution patterns with proper error
    handling and result formatting.
    
    Methods:
        execute_tool_calls: Main entry point for tool execution
        _execute_parallel: Handle parallel tool execution
        _execute_sequential: Handle sequential tool execution
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
            available_functions: Dictionary mapping function names to their implementations
            thread_id: ID of the current conversation thread
            executed_tool_calls: Set tracking already executed tool call IDs
            
        Returns:
            List of tool execution results, each containing:
                - role (str): Always 'tool'
                - tool_call_id (str): ID of the executed tool call
                - name (str): Name of the executed function
                - content (str): Stringified result of the tool execution
                
        Raises:
            Exception: If tool execution fails
            
        Notes:
            - Implementations should handle both successful and failed tool executions
            - Results should be properly formatted even for failed executions
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
        """Execute tool calls in parallel.
        
        Args:
            tool_calls: List of tool calls to execute
            available_functions: Dictionary of available tool functions
            thread_id: ID of the current conversation thread
            executed_tool_calls: Set tracking executed tool call IDs
            
        Returns:
            List of tool execution results
            
        Notes:
            - Should handle concurrent execution of multiple tool calls
            - Must properly handle exceptions in parallel execution
        """
        pass
    
    @abstractmethod
    async def _execute_sequential(
        self,
        tool_calls: List[Dict[str, Any]],
        available_functions: Dict[str, Callable],
        thread_id: str,
        executed_tool_calls: Set[str]
    ) -> List[Dict[str, Any]]:
        """Execute tool calls sequentially.
        
        Args:
            tool_calls: List of tool calls to execute
            available_functions: Dictionary of available tool functions
            thread_id: ID of the current conversation thread
            executed_tool_calls: Set tracking executed tool call IDs
            
        Returns:
            List of tool execution results
            
        Notes:
            - Executes tools one at a time in order
            - Should continue execution even if individual tools fail
        """
        pass

# --- Results Adder Base ---

class ResultsAdderBase(ABC):
    """Abstract base class for handling tool results and message processing.
    
    Provides the interface for managing the addition and updating of messages
    in a conversation thread, including both assistant messages and tool results.
    
    Attributes:
        add_message: Callback for adding new messages
        update_message: Callback for updating existing messages
        list_messages: Callback for retrieving thread messages
        message_added: Flag tracking if initial message has been added
    """
    
    def __init__(self, thread_manager):
        """Initialize with a ThreadManager instance.
        
        Args:
            thread_manager: Instance providing message management capabilities
        """
        self.add_message = thread_manager.add_message
        self.update_message = thread_manager._update_message
        self.list_messages = thread_manager.list_messages
        self.message_added = False

    @abstractmethod
    async def add_initial_response(self, thread_id: str, content: str, tool_calls: Optional[List[Dict[str, Any]]] = None):
        """Add the initial assistant response to the thread.
        
        Args:
            thread_id: ID of the conversation thread
            content: Text content of the response
            tool_calls: Optional list of tool calls to include
            
        Raises:
            Exception: If message addition fails
        """
        pass
    
    @abstractmethod
    async def update_response(self, thread_id: str, content: str, tool_calls: Optional[List[Dict[str, Any]]] = None):
        """Update an existing assistant response in the thread.
        
        Args:
            thread_id: ID of the conversation thread
            content: Updated text content
            tool_calls: Optional updated list of tool calls
            
        Raises:
            Exception: If message update fails
        """
        pass
    
    @abstractmethod
    async def add_tool_result(self, thread_id: str, result: Dict[str, Any]):
        """Add a tool execution result to the thread.
        
        Args:
            thread_id: ID of the conversation thread
            result: Tool execution result to add
            
        Raises:
            Exception: If result addition fails
        """
        pass
