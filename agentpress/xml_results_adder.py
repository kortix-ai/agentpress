import logging
from typing import Dict, Any, List, Optional
from agentpress.base_processors import ResultsAdderBase

class XMLResultsAdder(ResultsAdderBase):
    """XML-specific implementation for handling tool results and message processing.
    
    This implementation combines tool calls and their results into XML-formatted
    messages, maintaining proper XML structure and relationships between calls
    and results.
    
    Methods:
        add_initial_response: Add initial XML response
        update_response: Update existing XML response
        add_tool_result: Add XML tool result
    """
    
    def __init__(self, thread_manager):
        """Initialize with ThreadManager instance.
        
        Args:
            thread_manager: Instance providing message management capabilities
        """
        super().__init__(thread_manager)
        self.message_added = False
    
    async def add_initial_response(self, thread_id: str, content: str, tool_calls: Optional[List[Dict[str, Any]]] = None):
        """Add initial XML response without modifications.
        
        Args:
            thread_id: ID of the conversation thread
            content: XML content of the response
            tool_calls: Optional list of tool calls (not used in XML format)
            
        Notes:
            - Preserves XML structure in the content
            - Sets message_added flag after successful addition
        """
        message = {
            "role": "assistant",
            "content": content
        }
        await self.add_message(thread_id, message)
        self.message_added = True
    
    async def update_response(self, thread_id: str, content: str, tool_calls: Optional[List[Dict[str, Any]]] = None):
        """Update existing XML response.
        
        Args:
            thread_id: ID of the conversation thread
            content: Updated XML content
            tool_calls: Optional list of tool calls (not used in XML format)
            
        Notes:
            - Creates initial message if none exists
            - Preserves XML structure in updates
        """
        if not self.message_added:
            await self.add_initial_response(thread_id, content, tool_calls)
            return
        
        message = {
            "role": "assistant",
            "content": content
        }
        await self.update_message(thread_id, message)
    
    async def add_tool_result(self, thread_id: str, result: Dict[str, Any]):
        """Add XML tool result with proper referencing.
        
        Args:
            thread_id: ID of the conversation thread
            result: Tool execution result to add
            
        Notes:
            - Links result to original XML tool call
            - Formats result as user message for clarity
            - Handles cases where original XML tag cannot be found
        """
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