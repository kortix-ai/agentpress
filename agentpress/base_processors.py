import logging
from typing import Dict, Any, Callable, List, Optional, Set
from abc import ABC, abstractmethod

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

# --- Results Adder Base ---

class ResultsAdderBase(ABC):
    """Abstract base class for handling tool results and message processing."""
    
    def __init__(self, thread_manager):
        """Initialize with a ThreadManager instance.
        
        Args:
            thread_manager: The ThreadManager instance to use for message operations
        """
        self.add_message = thread_manager.add_message
        self.update_message = thread_manager._update_message
        self.list_messages = thread_manager.list_messages
        self.message_added = False

    @abstractmethod
    async def add_initial_response(self, thread_id: str, content: str, tool_calls: Optional[List[Dict[str, Any]]] = None):
        pass
    
    @abstractmethod
    async def update_response(self, thread_id: str, content: str, tool_calls: Optional[List[Dict[str, Any]]] = None):
        pass
    
    @abstractmethod
    async def add_tool_result(self, thread_id: str, result: Dict[str, Any]):
        pass
