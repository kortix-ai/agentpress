import logging
from typing import Dict, Any, List, Optional
from agentpress.thread_llm_response_processor import ResultsAdderBase

class XMLResultsAdder(ResultsAdderBase):
    """XML-specific implementation for handling tool results and message processing.
    
    This implementation combines tool calls and their results into a single XML-formatted
    message, avoiding the need for separate tool_calls and tool_results messages.
    """
    
    def __init__(self, thread_manager):
        super().__init__(thread_manager)
        self.pending_tool_results = {}
    
    def _format_xml_response(self, content: str, tool_calls: Optional[List[Dict[str, Any]]] = None) -> str:
        """Format the response content with XML tool results."""
        response_parts = []
        
        # Add any non-XML content first
        non_xml_content = []
        lines = content.split('\n')
        for line in lines:
            if not (line.strip().startswith('<') and line.strip().endswith('>')):
                non_xml_content.append(line)
        if non_xml_content:
            response_parts.append('\n'.join(non_xml_content))
        
        # Add XML blocks with their results
        if tool_calls:
            for tool_call in tool_calls:
                tool_id = tool_call['id']
                if tool_id in self.pending_tool_results:
                    result = self.pending_tool_results[tool_id]
                    response_parts.append(
                        f"<tool-result id='{tool_id}'>\n"
                        f"{result}\n"
                        f"</tool-result>"
                    )
        
        return '\n\n'.join(response_parts)
    
    async def add_initial_response(self, thread_id: str, content: str, tool_calls: Optional[List[Dict[str, Any]]] = None):
        """Add initial response with XML formatting."""
        formatted_content = self._format_xml_response(content, tool_calls)
        message = {
            "role": "assistant",
            "content": formatted_content
        }
        await self.add_message(thread_id, message)
        self.message_added = True
    
    async def update_response(self, thread_id: str, content: str, tool_calls: Optional[List[Dict[str, Any]]] = None):
        """Update response with XML formatting."""
        if not self.message_added:
            await self.add_initial_response(thread_id, content, tool_calls)
            return
        
        formatted_content = self._format_xml_response(content, tool_calls)
        message = {
            "role": "assistant",
            "content": formatted_content
        }
        await self.update_message(thread_id, message)
    
    async def add_tool_result(self, thread_id: str, result: Dict[str, Any]):
        """Store tool result for inclusion in the XML response."""
        tool_call_id = result['tool_call_id']
        self.pending_tool_results[tool_call_id] = result['content']
        
        # Update the message to include the new result
        messages = await self.list_messages(thread_id)
        for msg in reversed(messages):
            if msg['role'] == 'assistant':
                content = msg['content']
                tool_calls = msg.get('tool_calls', [])
                await self.update_response(thread_id, content, tool_calls)
                break 