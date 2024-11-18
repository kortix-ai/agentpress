import logging
from typing import Dict, Any, List, Optional
from agentpress.base_processors import ResultsAdderBase

class XMLResultsAdder(ResultsAdderBase):
    """XML-specific implementation for handling tool results and message processing.
    
    This implementation combines tool calls and their results into a single XML-formatted
    message, avoiding the need for separate tool_calls and tool_results messages.
    """
    
    def __init__(self, thread_manager):
        super().__init__(thread_manager)
        self.message_added = False
    
    async def add_initial_response(self, thread_id: str, content: str, tool_calls: Optional[List[Dict[str, Any]]] = None):
        """Add initial response without modifications."""
        message = {
            "role": "assistant",
            "content": content
        }
        await self.add_message(thread_id, message)
        self.message_added = True
    
    async def update_response(self, thread_id: str, content: str, tool_calls: Optional[List[Dict[str, Any]]] = None):
        """Update response without modifications."""
        if not self.message_added:
            await self.add_initial_response(thread_id, content, tool_calls)
            return
        
        message = {
            "role": "assistant",
            "content": content
        }
        await self.update_message(thread_id, message)
    
    async def add_tool_result(self, thread_id: str, result: Dict[str, Any]):
        """Add tool result as a user message."""
        try:
            # Get the original tool call to find the root tag
            messages = await self.list_messages(thread_id)
            assistant_msg = next((msg for msg in reversed(messages) 
                               if msg['role'] == 'assistant'), None)
            
            if assistant_msg:
                content = assistant_msg['content']
                # Find the opening XML tag for this tool call
                tool_start = content.find(f'<{result["name"]}')
                if tool_start >= 0:
                    tag_end = content.find('>', tool_start)
                    if tag_end >= 0:
                        root_tag = content[tool_start:tag_end + 1]
                        # Create a simple reference message as user role
                        result_message = {
                            "role": "user",
                            "content": f"Result for {root_tag}\n{result['content']}"
                        }
                        await self.add_message(thread_id, result_message)
                        return
            
            # Fallback if we can't find the root tag
            result_message = {
                "role": "user",
                "content": f"Result for {result['name']}:\n{result['content']}"
            }
            await self.add_message(thread_id, result_message)
            
        except Exception as e:
            logging.error(f"Error adding tool result: {e}")
            # Ensure the result is still added even if there's an error
            result_message = {
                "role": "user",
                "content": f"Result for {result['name']}:\n{result['content']}"
            }
            await self.add_message(thread_id, result_message)