from typing import Dict, Any, List, Optional
from agentpress.base_processors import ResultsAdderBase

# --- Standard Results Adder Implementation ---

class StandardResultsAdder(ResultsAdderBase):
    """Standard implementation for handling tool results and message processing.
    
    Provides straightforward implementations for adding and updating messages
    in a conversation thread, maintaining proper message ordering and structure.
    
    Methods:
        add_initial_response: Add the first response in a sequence
        update_response: Update an existing response
        add_tool_result: Add a tool execution result
    """
    
    def __init__(self, thread_manager):
        """Initialize with ThreadManager instance.
        
        Args:
            thread_manager: Instance providing message management capabilities
        """
        super().__init__(thread_manager)
    
    async def add_initial_response(self, thread_id: str, content: str, tool_calls: Optional[List[Dict[str, Any]]] = None):
        """Add the initial assistant response to the thread.
        
        Args:
            thread_id: ID of the conversation thread
            content: Text content of the response
            tool_calls: Optional list of tool calls to include
            
        Notes:
            - Sets message_added flag to True after successful addition
            - Includes tool_calls in message if provided
        """
        message = {
            "role": "assistant",
            "content": content
        }
        if tool_calls:
            message["tool_calls"] = tool_calls
            
        await self.add_message(thread_id, message)
        self.message_added = True
    
    async def update_response(self, thread_id: str, content: str, tool_calls: Optional[List[Dict[str, Any]]] = None):
        """Update an existing assistant response in the thread.
        
        Args:
            thread_id: ID of the conversation thread
            content: Updated text content
            tool_calls: Optional updated list of tool calls
            
        Notes:
            - Creates initial message if none exists
            - Updates existing message with new content and tool calls
        """
        if not self.message_added:
            await self.add_initial_response(thread_id, content, tool_calls)
            return
            
        message = {
            "role": "assistant",
            "content": content
        }
        if tool_calls:
            message["tool_calls"] = tool_calls
            
        await self.update_message(thread_id, message)
    
    async def add_tool_result(self, thread_id: str, result: Dict[str, Any]):
        """Add a tool execution result to the thread.
        
        Args:
            thread_id: ID of the conversation thread
            result: Tool execution result to add
            
        Notes:
            - Checks for duplicate tool results before adding
            - Adds result only if tool_call_id is unique
        """
        messages = await self.list_messages(thread_id)
        if not any(msg.get('tool_call_id') == result['tool_call_id'] for msg in messages):
            await self.add_message(thread_id, result)
