from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, AsyncGenerator, Callable, List

class ResponseProcessor(ABC):
    """Base interface for processing LLM responses"""
    
    @abstractmethod
    async def process_stream(
        self,
        thread_id: str,
        response_stream: AsyncGenerator,
        execute_tools: bool,
        tool_execution_strategy: 'ToolExecutionStrategy',
        available_functions: Dict[str, Callable],
        results_handler: 'ResultsHandler',
        immediate_tool_execution: bool = True
    ) -> AsyncGenerator:
        """Process streaming LLM response"""
        pass
    
    @abstractmethod
    async def process_response(
        self,
        thread_id: str,
        response: Any,
        execute_tools: bool,
        tool_execution_strategy: 'ToolExecutionStrategy',
        available_functions: Dict[str, Callable],
        results_handler: 'ResultsHandler'
    ) -> None:
        """Process complete LLM response"""
        pass

class ResponseParser(ABC):
    """Base interface for parsing LLM responses"""
    
    @abstractmethod
    async def parse_response(self, response: Any) -> Dict[str, Any]:
        """Parse a complete LLM response"""
        pass
    
    @abstractmethod
    async def parse_stream(self, response_chunk: Any, buffer: Dict) -> tuple[Optional[Dict[str, Any]], bool]:
        """Parse a streaming response chunk"""
        pass

class ToolExecutionStrategy(ABC):
    """Base interface for tool execution strategies"""
    
    @abstractmethod
    async def execute_tools(
        self,
        tool_calls: List[Dict[str, Any]],
        available_functions: Dict[str, Callable],
        thread_id: str,
        executed_tool_calls: set
    ) -> List[Dict[str, Any]]:
        """Execute tool calls according to strategy"""
        pass

class ResultsHandler(ABC):
    """Base interface for handling results"""
    
    @abstractmethod
    async def add_result(self, thread_id: str, result: Dict[str, Any]) -> None:
        """Add a result to the thread"""
        pass
    
    @abstractmethod
    async def update_result(self, thread_id: str, result: Dict[str, Any]) -> None:
        """Update an existing result in the thread"""
        pass 