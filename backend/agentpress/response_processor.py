"""
LLM Response Processor for AgentPress.

This module handles processing of LLM responses including:
- Parsing of content for both streaming and non-streaming responses
- Detection and extraction of tool calls (both XML-based and native function calling)
- Tool execution with different strategies
- Adding tool results back to the conversation thread
"""

import json
import logging
import asyncio
import re
import uuid
from typing import List, Dict, Any, Optional, Tuple, AsyncGenerator, Callable, Union, Literal
from dataclasses import dataclass

from agentpress.tool import Tool, ToolResult
from agentpress.tool_registry import ToolRegistry
from utils.logger import logger

# Type alias for XML result adding strategy
XmlAddingStrategy = Literal["user_message", "assistant_message", "inline_edit"]

@dataclass
class ProcessorConfig:
    """Simplified configuration for the ResponseProcessor."""
    # Tool parsing configuration
    xml_tool_calling: bool = True
    native_tool_calling: bool = False
    
    # Tool execution configuration
    execute_tools: bool = True
    execute_on_stream: bool = False
    execute_tool_sequentially: bool = True  
    
    # Tool result handling
    xml_adding_strategy: XmlAddingStrategy = "user_message"


class ResponseProcessor:
    """Processes LLM responses, extracting and executing tool calls."""
    
    def __init__(self, tool_registry: ToolRegistry, add_message_callback: Callable):
        """Initialize the ResponseProcessor.
        
        Args:
            tool_registry: Registry of available tools
            add_message_callback: Callback function to add messages to the thread
        """
        self.tool_registry = tool_registry
        self.add_message = add_message_callback
        
    async def process_streaming_response(
        self,
        llm_response: AsyncGenerator,
        thread_id: str,
        config: ProcessorConfig = ProcessorConfig(),
    ) -> AsyncGenerator:
        """Process a streaming LLM response, handling tool calls and execution.
        
        Args:
            llm_response: Streaming response from the LLM
            thread_id: ID of the conversation thread
            config: Configuration for parsing and execution
            
        Yields:
            Formatted chunks of the response including content and tool results
        """
        accumulated_content = ""
        tool_calls_buffer = {}  # For tracking partial tool calls in streaming mode
        
        # For XML parsing
        current_xml_content = ""
        xml_chunks_buffer = []
        
        logger.info(f"Starting to process streaming response for thread {thread_id}")
        logger.info(f"Config: XML={config.xml_tool_calling}, Native={config.native_tool_calling}, " 
                   f"Execute on stream={config.execute_on_stream}, Sequential={config.execute_tool_sequentially}")
        
        try:
            async for chunk in llm_response:
                # Default content to yield
                content_to_yield = None
                
                if hasattr(chunk, 'choices') and chunk.choices:
                    delta = chunk.choices[0].delta if hasattr(chunk.choices[0], 'delta') else None
                    
                    # Process content chunk
                    if delta and hasattr(delta, 'content') and delta.content:
                        chunk_content = delta.content
                        accumulated_content += chunk_content
                        current_xml_content += chunk_content
                        
                        # Always yield the content chunk first
                        yield {"type": "content", "content": chunk_content}
                        
                        # Parse XML tool calls if enabled
                        if config.xml_tool_calling:
                            # Extract complete XML chunks
                            xml_chunks = self._extract_xml_chunks(current_xml_content)
                            for xml_chunk in xml_chunks:
                                # Remove the chunk from current buffer to avoid re-processing
                                current_xml_content = current_xml_content.replace(xml_chunk, "", 1)
                                xml_chunks_buffer.append(xml_chunk)
                                
                                # Parse and extract the tool call
                                tool_call = self._parse_xml_tool_call(xml_chunk)
                                if tool_call:
                                    # Execute tool if needed
                                    if config.execute_tools and config.execute_on_stream:
                                        result = await self._execute_tool(tool_call)
                                        
                                        # Add result to thread
                                        await self._add_tool_result(
                                            thread_id, 
                                            tool_call, 
                                            result, 
                                            config.xml_adding_strategy
                                        )
                                        
                                        # Yield tool execution result
                                        yield {
                                            "type": "tool_result",
                                            "name": tool_call["name"],
                                            "result": str(result)
                                        }
                    
                    # Process native tool calls
                    if config.native_tool_calling and delta and hasattr(delta, 'tool_calls') and delta.tool_calls:
                        for tool_call in delta.tool_calls:
                            if not hasattr(tool_call, 'function'):
                                continue
                                
                            idx = tool_call.index if hasattr(tool_call, 'index') else 0
                            
                            # Initialize or update tool call in buffer
                            if idx not in tool_calls_buffer:
                                tool_calls_buffer[idx] = {
                                    'id': tool_call.id if hasattr(tool_call, 'id') and tool_call.id else str(uuid.uuid4()),
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
                            
                            # Check if we have a complete tool call
                            has_complete_tool_call = False
                            if (current_tool['id'] and 
                                current_tool['function']['name'] and 
                                current_tool['function']['arguments']):
                                try:
                                    json.loads(current_tool['function']['arguments'])
                                    has_complete_tool_call = True
                                except json.JSONDecodeError:
                                    pass
                            
                            if has_complete_tool_call and config.execute_tools and config.execute_on_stream:
                                # Execute this tool call
                                tool_call_data = {
                                    "name": current_tool['function']['name'],
                                    "arguments": json.loads(current_tool['function']['arguments']),
                                    "id": current_tool['id']
                                }
                                result = await self._execute_tool(tool_call_data)
                                
                                # Add result to thread
                                await self._add_tool_result(
                                    thread_id, 
                                    tool_call_data, 
                                    result, 
                                    "tool_message"  # Native tools always use tool_message format
                                )
                                
                                # Yield tool execution result
                                yield {
                                    "type": "tool_result",
                                    "name": tool_call_data["name"],
                                    "result": str(result)
                                }
                
            # After streaming completes, process any remaining content and tool calls
            if accumulated_content:
                # Extract final complete tool calls for native format
                complete_native_tool_calls = []
                if config.native_tool_calling:
                    for idx, tool_call in tool_calls_buffer.items():
                        try:
                            if (tool_call['id'] and 
                                tool_call['function']['name'] and 
                                tool_call['function']['arguments']):
                                args = json.loads(tool_call['function']['arguments'])
                                complete_native_tool_calls.append({
                                    "id": tool_call['id'],
                                    "type": "function",
                                    "function": {
                                        "name": tool_call['function']['name'],
                                        "arguments": args
                                    }
                                })
                        except json.JSONDecodeError:
                            continue
                
                # Add assistant message with accumulated content
                await self.add_message(thread_id, {
                    "role": "assistant",
                    "content": accumulated_content,
                    "tool_calls": complete_native_tool_calls if config.native_tool_calling and complete_native_tool_calls else None
                })
                
                # Execute any remaining tool calls if not done during streaming
                if config.execute_tools and not config.execute_on_stream:
                    tool_calls_to_execute = []
                    
                    # Process native tool calls
                    if config.native_tool_calling and complete_native_tool_calls:
                        for tool_call in complete_native_tool_calls:
                            tool_calls_to_execute.append({
                                "name": tool_call["function"]["name"],
                                "arguments": tool_call["function"]["arguments"],
                                "id": tool_call["id"]
                            })
                    
                    # Process XML tool calls
                    if config.xml_tool_calling:
                        # Extract any remaining complete XML chunks
                        xml_chunks = self._extract_xml_chunks(current_xml_content)
                        xml_chunks_buffer.extend(xml_chunks)
                        
                        for xml_chunk in xml_chunks_buffer:
                            tool_call = self._parse_xml_tool_call(xml_chunk)
                            if tool_call:
                                tool_calls_to_execute.append(tool_call)
                    
                    # Execute all collected tool calls
                    if tool_calls_to_execute:
                        tool_results = await self._execute_tools(
                            tool_calls_to_execute,
                            config.execute_tool_sequentially
                        )
                        
                        for tool_call, result in tool_results:
                            # Determine if this is an XML tool
                            is_xml_tool = tool_call["name"] in (self.tool_registry.xml_tools or {})
                            
                            # Add result based on tool type
                            await self._add_tool_result(
                                thread_id, 
                                tool_call, 
                                result, 
                                config.xml_adding_strategy if is_xml_tool else "tool_message"
                            )
                            
                            # Yield tool execution result
                            yield {
                                "type": "tool_result",
                                "name": tool_call["name"],
                                "result": str(result)
                            }
        
        except Exception as e:
            logger.error(f"Error processing stream: {str(e)}", exc_info=True)
            yield {"type": "error", "message": str(e)}

    async def process_non_streaming_response(
        self,
        llm_response: Any,
        thread_id: str,
        config: ProcessorConfig = ProcessorConfig(),
    ) -> AsyncGenerator:
        """Process a non-streaming LLM response, handling tool calls and execution.
        
        Args:
            llm_response: Response from the LLM
            thread_id: ID of the conversation thread
            config: Configuration for parsing and execution
            
        Yields:
            Formatted response including content and tool results
        """
        try:
            # Extract content and tool calls from response
            content = ""
            tool_calls = []
            
            if hasattr(llm_response, 'choices') and llm_response.choices:
                response_message = llm_response.choices[0].message if hasattr(llm_response.choices[0], 'message') else None
                
                if response_message:
                    if hasattr(response_message, 'content') and response_message.content:
                        content = response_message.content
                        
                        # Parse XML tool calls if enabled
                        if config.xml_tool_calling:
                            xml_tool_calls = self._parse_xml_tool_calls(content)
                            tool_calls.extend(xml_tool_calls)
                    
                    # Extract native tool calls
                    if config.native_tool_calling and hasattr(response_message, 'tool_calls') and response_message.tool_calls:
                        native_tool_calls = []
                        for tool_call in response_message.tool_calls:
                            if hasattr(tool_call, 'function'):
                                tool_calls.append({
                                    "name": tool_call.function.name,
                                    "arguments": json.loads(tool_call.function.arguments) if isinstance(tool_call.function.arguments, str) else tool_call.function.arguments,
                                    "id": tool_call.id if hasattr(tool_call, 'id') else str(uuid.uuid4())
                                })
                                
                                # Also save in native format for message creation
                                native_tool_calls.append({
                                    "id": tool_call.id if hasattr(tool_call, 'id') else str(uuid.uuid4()),
                                    "type": "function",
                                    "function": {
                                        "name": tool_call.function.name,
                                        "arguments": tool_call.function.arguments
                                    }
                                })
            
            # Add assistant message
            await self.add_message(thread_id, {
                "role": "assistant",
                "content": content,
                "tool_calls": native_tool_calls if config.native_tool_calling and 'native_tool_calls' in locals() else None
            })
            
            # Yield content first
            yield {"type": "content", "content": content}
            
            # Execute tools if needed
            if config.execute_tools and tool_calls:
                tool_results = await self._execute_tools(tool_calls, config.execute_tool_sequentially)
                
                for tool_call, result in tool_results:
                    # Determine if this is an XML tool
                    is_xml_tool = tool_call["name"] in (self.tool_registry.xml_tools or {})
                    
                    # Add result based on tool type
                    await self._add_tool_result(
                        thread_id, 
                        tool_call, 
                        result, 
                        config.xml_adding_strategy if is_xml_tool else "tool_message"
                    )
                    
                    # Yield tool execution result
                    yield {
                        "type": "tool_result",
                        "name": tool_call["name"],
                        "result": str(result)
                    }
                    

        except Exception as e:
            logger.error(f"Error processing response: {str(e)}", exc_info=True)
            yield {"type": "error", "message": str(e)}

    # XML parsing methods
    def _parse_xml_tool_call(self, xml_chunk: str) -> Optional[Dict[str, Any]]:
        """Parse a single XML chunk into a tool call."""
        try:
            # Extract tag name (function name)
            tag_match = re.match(r'<([a-zA-Z0-9_]+)', xml_chunk)
            if not tag_match:
                return None
                
            function_name = tag_match.group(1)
            
            # Extract content between tags
            chunk_content, _ = self._extract_tag_content(xml_chunk, function_name)
            
            # Parse attributes from the opening tag
            opening_tag_end = xml_chunk.find('>')
            if opening_tag_end <= 0:
                return None
                
            opening_tag = xml_chunk[:opening_tag_end+1]
            
            # Extract attributes using regex pattern
            attr_pattern = r'([a-zA-Z0-9_]+)=["\'](.*?)["\']'
            attr_matches = re.finditer(attr_pattern, opening_tag)
            
            arguments = {}
            for attr in attr_matches:
                attr_name = attr.group(1)
                attr_value = attr.group(2)
                
                # Try to convert numeric values
                try:
                    if '.' in attr_value:
                        arguments[attr_name] = float(attr_value)
                    else:
                        arguments[attr_name] = int(attr_value)
                except ValueError:
                    arguments[attr_name] = attr_value
            
            # Check if this tool requires 'content' parameter based on tool registry
            if hasattr(self.tool_registry, 'xml_tools'):
                tool_info = self.tool_registry.xml_tools.get(function_name, {})
                if tool_info and 'schema' in tool_info and tool_info['schema'].xml_schema:
                    xml_schema = tool_info['schema'].xml_schema
                    # Check if any mapping uses "text" as node_type
                    for mapping in xml_schema.mappings:
                        if mapping.node_type == "text":
                            arguments[mapping.param_name] = chunk_content.strip() if chunk_content else ""
                            logger.debug(f"Set {mapping.param_name} parameter to tag content for {function_name}")
        
            # If no specific mapping but content exists and not already set, use default approach
            if chunk_content and chunk_content.strip() and 'content' not in arguments:
                try:
                    # If content looks like JSON, parse it
                    if (chunk_content.strip().startswith('{') and chunk_content.strip().endswith('}')) or \
                       (chunk_content.strip().startswith('[') and chunk_content.strip().endswith(']')):
                        content_args = json.loads(chunk_content)
                        if isinstance(content_args, dict):
                            # Merge with attributes, with content taking precedence
                            arguments.update(content_args)
                        else:
                            # If it's an array or other JSON type, add it as a separate argument
                            arguments["content"] = content_args
                    else:
                        # By default, assign tag content to "content" parameter
                        arguments["content"] = chunk_content.strip()
                except json.JSONDecodeError:
                    # Default to content parameter
                    arguments["content"] = chunk_content.strip()
            
            return {
                "name": function_name,
                "arguments": arguments,
                "id": str(uuid.uuid4())
            }
            
        except Exception as e:
            logger.error(f"Error parsing XML tool call: {e}", exc_info=True)
            return None

    def _extract_tag_content(self, xml_chunk: str, tag_name: str) -> Tuple[Optional[str], Optional[str]]:
        """Extract content between opening and closing tags, handling nested tags."""
        start_tag = f'<{tag_name}'
        end_tag = f'</{tag_name}>'
        
        try:
            # Find start tag position
            start_pos = xml_chunk.find(start_tag)
            if start_pos == -1:
                return None, xml_chunk
                
            # Find end of opening tag
            tag_end = xml_chunk.find('>', start_pos)
            if tag_end == -1:
                return None, xml_chunk
                
            # Find matching closing tag
            content_start = tag_end + 1
            nesting_level = 1
            pos = content_start
            
            while nesting_level > 0 and pos < len(xml_chunk):
                next_start = xml_chunk.find(start_tag, pos)
                next_end = xml_chunk.find(end_tag, pos)
                
                if next_end == -1:
                    return None, xml_chunk
                    
                if next_start != -1 and next_start < next_end:
                    nesting_level += 1
                    pos = next_start + len(start_tag)
                else:
                    nesting_level -= 1
                    if nesting_level == 0:
                        content = xml_chunk[content_start:next_end]
                        remaining = xml_chunk[next_end + len(end_tag):]
                        return content, remaining
                    else:
                        pos = next_end + len(end_tag)
            
            return None, xml_chunk
            
        except Exception as e:
            logger.error(f"Error extracting tag content: {e}", exc_info=True)
            return None, xml_chunk

    def _extract_xml_chunks(self, content: str) -> List[str]:
        """Extract complete XML chunks using start and end pattern matching."""
        chunks = []
        pos = 0
        
        try:
            # Don't attempt to parse if the content is too small
            if len(content) < 5:
                return []
                
            # Scan the entire content for all possible tool tags
            while pos < len(content):
                # Find the next tool tag
                next_tag_start = -1
                current_tag = None
                
                # Check for tool names in our tool registry
                if hasattr(self.tool_registry, 'xml_tools') and self.tool_registry.xml_tools:
                    for tag_name in self.tool_registry.xml_tools.keys():
                        start_pattern = f'<{tag_name}'
                        tag_pos = content.find(start_pattern, pos)
                        
                        if tag_pos != -1 and (next_tag_start == -1 or tag_pos < next_tag_start):
                            next_tag_start = tag_pos
                            current_tag = tag_name
                else:
                    # Use a simple regex to find potential tool tags
                    tool_tag_matches = re.finditer(r'<([a-zA-Z0-9_]+)[\s>]', content[pos:])
                    for match in tool_tag_matches:
                        tag_name = match.group(1)
                        # Skip common HTML tags
                        if tag_name.lower() in ['div', 'span', 'p', 'br', 'a', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                            continue
                        
                        tag_pos = pos + match.start()
                        if next_tag_start == -1 or tag_pos < next_tag_start:
                            next_tag_start = tag_pos
                            current_tag = tag_name
                
                if next_tag_start == -1 or not current_tag:
                    # No more tags found
                    break
                
                # Find the matching end tag
                end_pattern = f'</{current_tag}>'
                tag_stack = []
                chunk_start = next_tag_start
                current_pos = next_tag_start
                
                # Check if we have a closing tag
                end_tag_pos = content.find(end_pattern, current_pos)
                if end_tag_pos == -1:
                    # No closing tag found, skip this tag
                    pos = next_tag_start + len(current_tag) + 1
                    continue
                    
                while current_pos < len(content):
                    # Look for next start or end tag of the same type
                    next_start = content.find(f'<{current_tag}', current_pos + 1)
                    next_end = content.find(end_pattern, current_pos)
                    
                    if next_end == -1:
                        # No closing tag found yet
                        break
                    
                    if next_start != -1 and next_start < next_end:
                        # Found nested start tag
                        tag_stack.append(next_start)
                        current_pos = next_start + 1
                    else:
                        # Found end tag
                        if not tag_stack:  # This is our matching end tag
                            chunk_end = next_end + len(end_pattern)
                            chunk = content[chunk_start:chunk_end]
                            chunks.append(chunk)
                            
                            # Move position past this complete tag
                            pos = chunk_end
                            break
                        else:
                            # Pop nested tag
                            tag_stack.pop()
                            current_pos = next_end + 1
                
                if current_pos >= len(content):  # Reached end without finding closing tag
                    # Move position forward to avoid infinite loop
                    pos += 1
            
        except Exception as e:
            logger.error(f"Error extracting XML chunks: {e}")
        
        return chunks

    def _parse_xml_tool_calls(self, content: str) -> List[Dict[str, Any]]:
        """Parse XML tool calls from content string."""
        tool_calls = []
        
        try:
            xml_chunks = self._extract_xml_chunks(content)
            
            for xml_chunk in xml_chunks:
                tool_call = self._parse_xml_tool_call(xml_chunk)
                if tool_call:
                    tool_calls.append(tool_call)
                    
        except Exception as e:
            logger.error(f"Error parsing XML tool calls: {e}", exc_info=True)
        
        return tool_calls

    # Tool execution methods
    async def _execute_tool(self, tool_call: Dict[str, Any]) -> ToolResult:
        """Execute a single tool call and return the result."""
        try:
            function_name = tool_call["name"]
            arguments = tool_call["arguments"]
            
            logger.info(f"Executing tool: {function_name} with arguments: {arguments}")
            
            if isinstance(arguments, str):
                try:
                    arguments = json.loads(arguments)
                except json.JSONDecodeError:
                    arguments = {"text": arguments}
            
            # Get available functions from tool registry
            available_functions = self.tool_registry.get_available_functions()
            
            # Look up the function by name
            tool_fn = available_functions.get(function_name)
            if not tool_fn:
                logger.error(f"Tool function '{function_name}' not found in registry")
                return ToolResult(success=False, output=f"Tool function '{function_name}' not found")
            
            logger.debug(f"Found tool function for '{function_name}', executing...")
            result = await tool_fn(**arguments)
            logger.info(f"Tool execution complete: {function_name} -> {result}")
            return result
        except Exception as e:
            logger.error(f"Error executing tool {tool_call['name']}: {str(e)}", exc_info=True)
            return ToolResult(success=False, output=f"Error executing tool: {str(e)}")

    async def _execute_tools(
        self, 
        tool_calls: List[Dict[str, Any]], 
        sequential: bool = True
    ) -> List[Tuple[Dict[str, Any], ToolResult]]:
        """Execute tool calls with the specified strategy."""
        if sequential:
            return await self._execute_tools_sequentially(tool_calls)
        else:
            return await self._execute_tools_in_parallel(tool_calls)

    async def _execute_tools_sequentially(self, tool_calls: List[Dict[str, Any]]) -> List[Tuple[Dict[str, Any], ToolResult]]:
        """Execute tool calls sequentially and return results."""
        results = []
        for tool_call in tool_calls:
            result = await self._execute_tool(tool_call)
            results.append((tool_call, result))
        return results

    async def _execute_tools_in_parallel(self, tool_calls: List[Dict[str, Any]]) -> List[Tuple[Dict[str, Any], ToolResult]]:
        """Execute tool calls in parallel and return results."""
        logger.info(f"Executing {len(tool_calls)} tools in parallel: {[t['name'] for t in tool_calls]}")
        
        # Create tasks for all tool calls
        tasks = [self._execute_tool(tool_call) for tool_call in tool_calls]
        
        if tasks:
            # Execute all tasks concurrently
            results = await asyncio.gather(*tasks)
            # Pair results with their corresponding tool calls
            return list(zip(tool_calls, results))
        
        return []

    async def _add_tool_result(
        self, 
        thread_id: str, 
        tool_call: Dict[str, Any], 
        result: ToolResult,
        strategy: Union[XmlAddingStrategy, str] = "user_message"
    ):
        """Add a tool result to the thread based on the specified format."""
        try:
            # Determine if this is an XML tool
            is_xml_tool = False
            if hasattr(self.tool_registry, 'xml_tools'):
                is_xml_tool = tool_call["name"] in self.tool_registry.xml_tools
            
            if is_xml_tool:
                # XML tool results are added based on strategy
                if strategy == "user_message":
                    await self.add_message(thread_id, {
                        "role": "user",
                        "content": f"ToolResult = {str(result)}"
                    })
                elif strategy == "assistant_message":
                    await self.add_message(thread_id, {
                        "role": "assistant",
                        "content": f"I executed the tool {tool_call['name']} and got: {str(result)}"
                    })
                # inline_edit strategy is not implemented yet
            elif strategy == "inline_edit":
                logger.error(f"'inline_edit' strategy is not implemented yet for XML tool results")
                await self.add_message(thread_id, {
                    "role": "user",
                    "content": f"Error: The 'inline_edit' strategy is not implemented yet. Tool result: {str(result)}"
                })
                
            else:
                # Native tools always use tool message format
                await self.add_message(thread_id, {
                    "role": "tool",
                    "tool_call_id": tool_call.get("id", str(uuid.uuid4())),
                    "name": tool_call["name"],
                    "content": str(result)
                })
        except Exception as e:
            logger.error(f"Error adding tool result: {str(e)}", exc_info=True)
            # Fallback to a simpler format
            try:
                await self.add_message(thread_id, {
                    "role": "user",
                    "content": f"Result for {tool_call['name']}: {str(result)}"
                })
            except Exception as e2:
                logger.error(f"Failed even with fallback message: {str(e2)}", exc_info=True) 