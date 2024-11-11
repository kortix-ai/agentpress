from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import json
import logging

class ToolParser(ABC):
    """
    Abstract base class defining the interface for parsing tool calls from LLM responses.
    
    Tool parsers are responsible for extracting and formatting tool calls from both
    streaming and non-streaming LLM responses. They handle the conversion of raw
    LLM output into structured tool call data that can be executed.
    """
    
    @abstractmethod
    async def parse_response(self, response: Any) -> Dict[str, Any]:
        """
        Parse a complete LLM response and return the assistant message with tool calls.
        
        Args:
            response (Any): The complete response from the LLM
            
        Returns:
            Dict[str, Any]: Parsed assistant message containing content and tool calls
        """
        pass
    
    @abstractmethod
    async def parse_stream(self, response_chunk: Any, tool_calls_buffer: Dict[int, Dict]) -> tuple[Optional[Dict[str, Any]], bool]:
        """
        Parse a streaming response chunk and update the tool calls buffer.
        
        Args:
            response_chunk (Any): A single chunk from the streaming response
            tool_calls_buffer (Dict[int, Dict]): Buffer storing incomplete tool calls
            
        Returns:
            tuple(message, is_complete):
                - message (Optional[Dict[str, Any]]): The parsed assistant message with
                    tool calls if complete, None otherwise
                - is_complete (bool): Boolean indicating if tool calls parsing is complete
        """
        pass

class StandardToolParser(ToolParser):
    """
    Standard implementation of tool parsing for OpenAI-compatible API responses.
    
    Handles both streaming and non-streaming responses, extracting tool calls
    and formatting them for execution. Supports incremental parsing of streaming
    tool calls and validation of tool call arguments.
    """
    
    async def parse_response(self, response: Any) -> Dict[str, Any]:
        """
        Parse a complete LLM response into an assistant message with tool calls.
        
        Args:
            response (Any): Complete response from the LLM API
            
        Returns:
            Dict[str, Any]: Formatted assistant message containing:
                - role: "assistant"
                - content: Text content of the response
                - tool_calls: List of parsed tool calls (if present)
        """
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
        """
        Parse a streaming response chunk and update the tool calls buffer.
        """
        content_chunk = ""
        is_complete = False
        
        if hasattr(chunk.choices[0], 'delta'):
            delta = chunk.choices[0].delta
            
            # Handle content if present
            if hasattr(delta, 'content') and delta.content:
                content_chunk = delta.content

            # Handle tool calls
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

        # Check if this is the final chunk
        if hasattr(chunk.choices[0], 'finish_reason') and chunk.choices[0].finish_reason:
            is_complete = True
            # Convert tool_calls_buffer to list and sort by index
            tool_calls = [tool_calls_buffer[idx] for idx in sorted(tool_calls_buffer.keys())]
            
            # Process the complete tool calls
            processed_tool_calls = []
            for tool_call in tool_calls:
                try:
                    # Only process tool calls that have all required fields
                    if tool_call['id'] and tool_call['function']['name'] and tool_call['function']['arguments']:
                        args_str = tool_call['function']['arguments']
                        # Try to parse the string as JSON
                        json.loads(args_str)  # Validate JSON
                        processed_tool_calls.append(tool_call)
                except json.JSONDecodeError as e:
                    logging.error(f"Error parsing tool call arguments: {e}, args: {args_str}")
                    continue
            
            if processed_tool_calls:
                return {
                    "role": "assistant",
                    "content": content_chunk,
                    "tool_calls": processed_tool_calls
                }, is_complete

        return None, is_complete