from typing import Dict, Any, List, Optional
from agentpress.base_processors import ResultsAdderBase

# --- Standard Results Adder Implementation ---

class StandardResultsAdder(ResultsAdderBase):
    """Standard implementation for handling tool results and message processing."""
    
    def __init__(self, thread_manager):
        """Initialize with ThreadManager instance."""
        super().__init__(thread_manager)  # Use base class initialization
    
    async def add_initial_response(self, thread_id: str, content: str, tool_calls: Optional[List[Dict[str, Any]]] = None):
        message = {
            "role": "assistant",
            "content": content
        }
        if tool_calls:
            message["tool_calls"] = tool_calls
            
        await self.add_message(thread_id, message)
        self.message_added = True
    
    async def update_response(self, thread_id: str, content: str, tool_calls: Optional[List[Dict[str, Any]]] = None):
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
        messages = await self.list_messages(thread_id)
        if not any(msg.get('tool_call_id') == result['tool_call_id'] for msg in messages):
            await self.add_message(thread_id, result)
