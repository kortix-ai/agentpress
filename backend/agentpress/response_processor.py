"""
LLM Response Processor for AgentPress.

This module handles processing of LLM responses including:
- Parsing of content for both streaming and non-streaming responses
- Detection and extraction of tool calls (both XML-based and native function calling)
- Tool execution with different strategies
- Adding tool results back to the conversation thread
"""

import json
import asyncio
import re
import uuid
from typing import List, Dict, Any, Optional, Tuple, AsyncGenerator, Callable, Union, Literal
from dataclasses import dataclass, field

from agentpress.tool import Tool, ToolResult
from agentpress.tool_registry import ToolRegistry
from utils.logger import logger

# Type alias for XML result adding strategy
XmlAddingStrategy = Literal["user_message", "assistant_message", "inline_edit"]

# Type alias for tool execution strategy
ToolExecutionStrategy = Literal["sequential", "parallel"]

@dataclass
class ToolExecutionContext:
    """Context for a tool execution including call details, result, and display info."""
    tool_call: Dict[str, Any]
    tool_index: int
    result: Optional[ToolResult] = None
    display_name: Optional[str] = None
    error: Optional[Exception] = None

@dataclass
class ProcessorConfig:
    """
    Configuration for response processing and tool execution.
    
    This class controls how the LLM's responses are processed, including how tool calls
    are detected, executed, and their results handled.
    
    Attributes:
        xml_tool_calling: Enable XML-based tool call detection (<tool>...</tool>)
        native_tool_calling: Enable OpenAI-style function calling format
        execute_tools: Whether to automatically execute detected tool calls
        execute_on_stream: For streaming, execute tools as they appear vs. at the end
        tool_execution_strategy: How to execute multiple tools ("sequential" or "parallel")
        xml_adding_strategy: How to add XML tool results to the conversation
    """

    xml_tool_calling: bool = True  
    native_tool_calling: bool = False

    execute_tools: bool = True
    execute_on_stream: bool = False
    tool_execution_strategy: ToolExecutionStrategy = "sequential"
    xml_adding_strategy: XmlAddingStrategy = "assistant_message"
    
    def __post_init__(self):
        """Validate configuration after initialization."""
        if self.xml_tool_calling is False and self.native_tool_calling is False and self.execute_tools:
            raise ValueError("At least one tool calling format (XML or native) must be enabled if execute_tools is True")
            
        if self.xml_adding_strategy not in ["user_message", "assistant_message", "inline_edit"]:
            raise ValueError("xml_adding_strategy must be 'user_message', 'assistant_message', or 'inline_edit'")

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
        
        # For tracking tool results during streaming to add later
        tool_results_buffer = []
        
        # For tracking pending tool executions
        pending_tool_executions = []
        
        # Tool index counter for tracking all tool executions
        tool_index = 0
        
        logger.info(f"Starting to process streaming response for thread {thread_id}")
        logger.info(f"Config: XML={config.xml_tool_calling}, Native={config.native_tool_calling}, " 
                   f"Execute on stream={config.execute_on_stream}, Execution strategy={config.tool_execution_strategy}")
        
        try:
            async for chunk in llm_response:
                # Default content to yield
                
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
                                    # Create a context for this tool execution
                                    context = self._create_tool_context(
                                        tool_call=tool_call,
                                        tool_index=tool_index
                                    )
                                    
                                    # Execute tool if needed, but in background
                                    if config.execute_tools and config.execute_on_stream:
                                        # Yield tool execution start message
                                        yield self._yield_tool_started(context)
                                        
                                        # Start tool execution as a background task
                                        execution_task = asyncio.create_task(self._execute_tool(tool_call))
                                        
                                        # Store the task for later retrieval 
                                        pending_tool_executions.append({
                                            "task": execution_task,
                                            "tool_call": tool_call,
                                            "tool_index": tool_index,
                                            "context": context
                                        })
                                        
                                        # Increment the tool index
                                        tool_index += 1
                                        
                                        # Immediately continue processing more chunks
                    
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
                                
                                # Create a context for this tool execution
                                context = self._create_tool_context(
                                    tool_call=tool_call_data,
                                    tool_index=tool_index
                                )
                                
                                # Yield tool execution start message
                                yield self._yield_tool_started(context)
                                
                                # Start tool execution as a background task
                                execution_task = asyncio.create_task(self._execute_tool(tool_call_data))
                                
                                # Store the task for later retrieval 
                                pending_tool_executions.append({
                                    "task": execution_task,
                                    "tool_call": tool_call_data,
                                    "tool_index": tool_index,
                                    "context": context
                                })
                                
                                # Increment the tool index
                                tool_index += 1
                                
                                # Immediately continue processing more chunks
                
                # Check for completed tool executions
                completed_executions = []
                for i, execution in enumerate(pending_tool_executions):
                    if execution["task"].done():
                        try:
                            # Get the result
                            result = execution["task"].result()
                            tool_call = execution["tool_call"]
                            tool_index = execution.get("tool_index", -1)
                            
                            # Store result for later database updates
                            tool_results_buffer.append((tool_call, result))
                            
                            # Get or create the context
                            if "context" in execution:
                                context = execution["context"]
                                context.result = result
                            else:
                                context = self._create_tool_context(tool_call, tool_index)
                                context.result = result
                            
                            # Yield tool status message first
                            yield self._yield_tool_completed(context)
                            
                            # Yield tool execution result
                            yield self._yield_tool_result(context)
                            
                            # Mark for removal
                            completed_executions.append(i)
                            
                        except Exception as e:
                            logger.error(f"Error getting tool execution result: {str(e)}")
                            tool_call = execution["tool_call"]
                            tool_index = execution.get("tool_index", -1)
                            
                            # Get or create the context
                            if "context" in execution:
                                context = execution["context"]
                                context.error = e
                            else:
                                context = self._create_tool_context(tool_call, tool_index)
                                context.error = e
                            
                            # Yield error status for the tool
                            yield self._yield_tool_error(context)
                            
                            # Mark for removal
                            completed_executions.append(i)
                
                # Remove completed executions from pending list (in reverse to maintain indices)
                for i in sorted(completed_executions, reverse=True):
                    pending_tool_executions.pop(i)
            
            # After streaming completes, wait for any remaining tool executions
            if pending_tool_executions:
                logger.info(f"Waiting for {len(pending_tool_executions)} pending tool executions to complete")
                
                # Wait for all pending tasks to complete
                pending_tasks = [execution["task"] for execution in pending_tool_executions]
                done, _ = await asyncio.wait(pending_tasks)
                
                # Process results
                for execution in pending_tool_executions:
                    try:
                        if execution["task"].done():
                            result = execution["task"].result()
                            tool_call = execution["tool_call"]
                            tool_index = execution.get("tool_index", -1)
                            
                            # Store result for later
                            tool_results_buffer.append((tool_call, result))
                            
                            # Get or create the context
                            if "context" in execution:
                                context = execution["context"]
                                context.result = result
                            else:
                                context = self._create_tool_context(tool_call, tool_index)
                                context.result = result
                            
                            # Yield tool status message first
                            yield self._yield_tool_completed(context)
                            
                            # Yield tool execution result
                            yield self._yield_tool_result(context)
                    except Exception as e:
                        logger.error(f"Error processing remaining tool execution: {str(e)}")
                        # Yield error status for the tool
                        if "tool_call" in execution:
                            tool_call = execution["tool_call"]
                            tool_index = execution.get("tool_index", -1)
                            # Get or create the context
                            if "context" in execution:
                                context = execution["context"]
                                context.error = e
                            else:
                                context = self._create_tool_context(tool_call, tool_index)
                                context.error = e
                            formatted_result = self._format_xml_tool_result(tool_call, result)
                            yield {
                                "type": "tool_result",
                                "name": context.display_name,
                                "result": formatted_result,
                                "tool_index": tool_index
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
                
                # Now add all buffered tool results AFTER the assistant message
                for tool_call, result in tool_results_buffer:
                    # Add result based on tool type
                    await self._add_tool_result(
                        thread_id, 
                        tool_call, 
                        result, 
                        config.xml_adding_strategy
                    )
                    
                    # Create context for tool result
                    context = self._create_tool_context(tool_call, tool_index)
                    context.result = result
                    
                    # Yield tool execution result
                    yield self._yield_tool_result(context)
                    
                    # Increment tool index for next tool
                    tool_index += 1
                
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
                            config.tool_execution_strategy
                        )
                        
                        for tool_call, result in tool_results:
                            # Add result based on tool type
                            await self._add_tool_result(
                                thread_id, 
                                tool_call, 
                                result, 
                                config.xml_adding_strategy
                            )
                            
                            # Create context for tool result
                            context = self._create_tool_context(tool_call, tool_index)
                            context.result = result
                            
                            # Yield tool execution result
                            yield self._yield_tool_result(context)
                            
                            # Increment tool index for next tool
                            tool_index += 1
        
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
            # Tool execution counter
            tool_index = 0
            
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
            
            # Add assistant message FIRST
            await self.add_message(thread_id, {
                "role": "assistant",
                "content": content,
                "tool_calls": native_tool_calls if config.native_tool_calling and 'native_tool_calls' in locals() else None
            })
            
            # Yield content first
            yield {"type": "content", "content": content}
            
            # Execute tools if needed - AFTER assistant message has been added
            if config.execute_tools and tool_calls:
                # Log tool execution strategy
                logger.info(f"Executing {len(tool_calls)} tools with strategy: {config.tool_execution_strategy}")
                
                # Execute tools with the specified strategy
                tool_results = await self._execute_tools(
                    tool_calls, 
                    config.tool_execution_strategy
                )
                
                for tool_call, result in tool_results:
                    # Add result based on tool type
                    await self._add_tool_result(
                        thread_id, 
                        tool_call, 
                        result, 
                        config.xml_adding_strategy
                    )
                    
                    # Create context for tool result
                    context = self._create_tool_context(tool_call, tool_index)
                    context.result = result
                    
                    # Yield tool execution result
                    yield self._yield_tool_result(context)
                    
                    # Increment tool index for next tool
                    tool_index += 1
                    
        except Exception as e:
            logger.error(f"Error processing response: {str(e)}", exc_info=True)
            yield {"type": "error", "message": str(e)}

    # XML parsing methods
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
            logger.error(f"Error extracting tag content: {e}")
            return None, xml_chunk

    def _extract_attribute(self, opening_tag: str, attr_name: str) -> Optional[str]:
        """Extract attribute value from opening tag."""
        try:
            # Handle both single and double quotes with raw strings
            patterns = [
                fr'{attr_name}="([^"]*)"',  # Double quotes
                fr"{attr_name}='([^']*)'",  # Single quotes
                fr'{attr_name}=([^\s/>;]+)'  # No quotes - fixed escape sequence
            ]
            
            for pattern in patterns:
                match = re.search(pattern, opening_tag)
                if match:
                    value = match.group(1)
                    # Unescape common XML entities
                    value = value.replace('&quot;', '"').replace('&apos;', "'")
                    value = value.replace('&lt;', '<').replace('&gt;', '>')
                    value = value.replace('&amp;', '&')
                    return value
            
            return None
            
        except Exception as e:
            logger.error(f"Error extracting attribute: {e}")
            return None

    def _extract_xml_chunks(self, content: str) -> List[str]:
        """Extract complete XML chunks using start and end pattern matching."""
        chunks = []
        pos = 0
        
        try:
            while pos < len(content):
                # Find the next tool tag
                next_tag_start = -1
                current_tag = None
                
                # Find the earliest occurrence of any registered tag
                for tag_name in self.tool_registry.xml_tools.keys():
                    start_pattern = f'<{tag_name}'
                    tag_pos = content.find(start_pattern, pos)
                    
                    if tag_pos != -1 and (next_tag_start == -1 or tag_pos < next_tag_start):
                        next_tag_start = tag_pos
                        current_tag = tag_name
                
                if next_tag_start == -1 or not current_tag:
                    break
                
                # Find the matching end tag
                end_pattern = f'</{current_tag}>'
                tag_stack = []
                chunk_start = next_tag_start
                current_pos = next_tag_start
                
                while current_pos < len(content):
                    # Look for next start or end tag of the same type
                    next_start = content.find(f'<{current_tag}', current_pos + 1)
                    next_end = content.find(end_pattern, current_pos)
                    
                    if next_end == -1:  # No closing tag found
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
                            pos = chunk_end
                            break
                        else:
                            # Pop nested tag
                            tag_stack.pop()
                            current_pos = next_end + 1
                
                if current_pos >= len(content):  # Reached end without finding closing tag
                    break
                
                pos = max(pos + 1, current_pos)
        
        except Exception as e:
            logger.error(f"Error extracting XML chunks: {e}")
            logger.error(f"Content was: {content}")
        
        return chunks

    def _parse_xml_tool_call(self, xml_chunk: str) -> Optional[Dict[str, Any]]:
        """Parse XML chunk into tool call format."""
        try:
            # Extract tag name and validate
            tag_match = re.match(r'<([^\s>]+)', xml_chunk)
            if not tag_match:
                logger.error(f"No tag found in XML chunk: {xml_chunk}")
                return None
                
            tag_name = tag_match.group(1)
            logger.info(f"Found XML tag: {tag_name}")
            
            # Get tool info and schema
            tool_info = self.tool_registry.get_xml_tool(tag_name)
            if not tool_info or not tool_info['schema'].xml_schema:
                logger.error(f"No tool or schema found for tag: {tag_name}")
                return None
                
            schema = tool_info['schema'].xml_schema
            params = {}
            remaining_chunk = xml_chunk
            
            # Process each mapping
            for mapping in schema.mappings:
                try:
                    if mapping.node_type == "attribute":
                        # Extract attribute from opening tag
                        opening_tag = remaining_chunk.split('>', 1)[0]
                        value = self._extract_attribute(opening_tag, mapping.path)
                        if value is not None:
                            params[mapping.param_name] = value
                            logger.info(f"Found attribute {mapping.path} -> {mapping.param_name}: {value}")
                    
                    elif mapping.node_type == "element":
                        # Extract element content
                        content, remaining_chunk = self._extract_tag_content(remaining_chunk, mapping.path)
                        if content is not None:
                            params[mapping.param_name] = content.strip()
                            logger.info(f"Found element {mapping.path} -> {mapping.param_name}")
                    
                    elif mapping.node_type == "text":
                        if mapping.path == ".":
                            # Extract root content
                            content, _ = self._extract_tag_content(remaining_chunk, tag_name)
                            if content is not None:
                                params[mapping.param_name] = content.strip()
                                logger.info(f"Found text content for {mapping.param_name}")
                    
                    elif mapping.node_type == "content":
                        if mapping.path == ".":
                            # Extract root content
                            content, _ = self._extract_tag_content(remaining_chunk, tag_name)
                            if content is not None:
                                params[mapping.param_name] = content.strip()
                                logger.info(f"Found root content for {mapping.param_name}")
                
                except Exception as e:
                    logger.error(f"Error processing mapping {mapping}: {e}")
                    continue
            
            # Validate required parameters
            missing = [mapping.param_name for mapping in schema.mappings if mapping.param_name not in params]
            if missing:
                logger.error(f"Missing required parameters: {missing}")
                logger.error(f"Current params: {params}")
                logger.error(f"XML chunk: {xml_chunk}")
                return None
            
            # Create tool call
            tool_call = {
                "name": tool_info['method'],
                "arguments": params
            }
            
            logger.info(f"Created tool call: {tool_call}")
            return tool_call
            
        except Exception as e:
            logger.error(f"Error parsing XML chunk: {e}")
            logger.error(f"XML chunk was: {xml_chunk}")
            return None

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
        execution_strategy: ToolExecutionStrategy = "sequential"
    ) -> List[Tuple[Dict[str, Any], ToolResult]]:
        """Execute tool calls with the specified strategy.
        
        This is the main entry point for tool execution. It dispatches to the appropriate
        execution method based on the provided strategy.
        
        Args:
            tool_calls: List of tool calls to execute
            execution_strategy: Strategy for executing tools:
                - "sequential": Execute tools one after another, waiting for each to complete
                - "parallel": Execute all tools simultaneously for better performance 
                
        Returns:
            List of tuples containing the original tool call and its result
        """
        logger.info(f"Executing {len(tool_calls)} tools with strategy: {execution_strategy}")
            
        if execution_strategy == "sequential":
            return await self._execute_tools_sequentially(tool_calls)
        elif execution_strategy == "parallel":
            return await self._execute_tools_in_parallel(tool_calls)
        else:
            logger.warning(f"Unknown execution strategy: {execution_strategy}, falling back to sequential")
            return await self._execute_tools_sequentially(tool_calls)

    async def _execute_tools_sequentially(self, tool_calls: List[Dict[str, Any]]) -> List[Tuple[Dict[str, Any], ToolResult]]:
        """Execute tool calls sequentially and return results.
        
        This method executes tool calls one after another, waiting for each tool to complete
        before starting the next one. This is useful when tools have dependencies on each other.
        
        Args:
            tool_calls: List of tool calls to execute
            
        Returns:
            List of tuples containing the original tool call and its result
        """
        if not tool_calls:
            return []
            
        try:
            tool_names = [t.get('name', 'unknown') for t in tool_calls]
            logger.info(f"Executing {len(tool_calls)} tools sequentially: {tool_names}")
            
            results = []
            for index, tool_call in enumerate(tool_calls):
                tool_name = tool_call.get('name', 'unknown')
                logger.debug(f"Executing tool {index+1}/{len(tool_calls)}: {tool_name}")
                
                try:
                    result = await self._execute_tool(tool_call)
                    results.append((tool_call, result))
                    logger.debug(f"Completed tool {tool_name} with success={result.success}")
                except Exception as e:
                    logger.error(f"Error executing tool {tool_name}: {str(e)}")
                    error_result = ToolResult(success=False, output=f"Error executing tool: {str(e)}")
                    results.append((tool_call, error_result))
            
            logger.info(f"Sequential execution completed for {len(tool_calls)} tools")
            return results
            
        except Exception as e:
            logger.error(f"Error in sequential tool execution: {str(e)}", exc_info=True)
            # Return partial results plus error results for remaining tools
            completed_tool_names = [r[0].get('name', 'unknown') for r in results] if 'results' in locals() else []
            remaining_tools = [t for t in tool_calls if t.get('name', 'unknown') not in completed_tool_names]
            
            # Add error results for remaining tools
            error_results = [(tool, ToolResult(success=False, output=f"Execution error: {str(e)}")) 
                            for tool in remaining_tools]
                            
            return (results if 'results' in locals() else []) + error_results

    async def _execute_tools_in_parallel(self, tool_calls: List[Dict[str, Any]]) -> List[Tuple[Dict[str, Any], ToolResult]]:
        """Execute tool calls in parallel and return results.
        
        This method executes all tool calls simultaneously using asyncio.gather, which
        can significantly improve performance when executing multiple independent tools.
        
        Args:
            tool_calls: List of tool calls to execute
            
        Returns:
            List of tuples containing the original tool call and its result
        """
        if not tool_calls:
            return []
            
        try:
            tool_names = [t.get('name', 'unknown') for t in tool_calls]
            logger.info(f"Executing {len(tool_calls)} tools in parallel: {tool_names}")
            
            # Create tasks for all tool calls
            tasks = [self._execute_tool(tool_call) for tool_call in tool_calls]
            
            # Execute all tasks concurrently with error handling
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results and handle any exceptions
            processed_results = []
            for i, (tool_call, result) in enumerate(zip(tool_calls, results)):
                if isinstance(result, Exception):
                    logger.error(f"Error executing tool {tool_call.get('name', 'unknown')}: {str(result)}")
                    # Create error result
                    error_result = ToolResult(success=False, output=f"Error executing tool: {str(result)}")
                    processed_results.append((tool_call, error_result))
                else:
                    processed_results.append((tool_call, result))
            
            logger.info(f"Parallel execution completed for {len(tool_calls)} tools")
            return processed_results
        
        except Exception as e:
            logger.error(f"Error in parallel tool execution: {str(e)}", exc_info=True)
            # Return error results for all tools if the gather itself fails
            return [(tool_call, ToolResult(success=False, output=f"Execution error: {str(e)}")) 
                    for tool_call in tool_calls]

    async def _add_tool_result(
        self, 
        thread_id: str, 
        tool_call: Dict[str, Any], 
        result: ToolResult,
        strategy: Union[XmlAddingStrategy, str] = "assistant_message"
    ):
        """Add a tool result to the thread based on the specified format."""
        try:
            # Always add results as user or assistant messages, never as 'tool' role
            # Determine message role based on strategy
            result_role = "user" if strategy == "user_message" else "assistant"
            
            # Create a context for consistent formatting
            context = self._create_tool_context(tool_call, 0)  # Index doesn't matter for DB
            context.result = result
            
            # Format the content using the formatting helper
            content = self._format_xml_tool_result(tool_call, result)
            
            # Add the message with the appropriate role
            result_message = {
                "role": result_role,
                "content": content
            }
            await self.add_message(thread_id, result_message)
        except Exception as e:
            logger.error(f"Error adding tool result: {str(e)}", exc_info=True)
            # Fallback to a simple message
            try:
                await self.add_message(thread_id, {
                    "role": "user",
                    "content": str(result)
                })
            except Exception as e2:
                logger.error(f"Failed even with fallback message: {str(e2)}", exc_info=True)


    def _format_xml_tool_result(self, tool_call: Dict[str, Any], result: ToolResult) -> str:
        """Format a tool result as a simple XML tag.
        
        Args:
            tool_call: The tool call that was executed
            result: The result of the tool execution
            
        Returns:
            String containing the XML-formatted result or standard format if not XML
        """
        xml_tag_name = self._get_tool_display_name(tool_call["name"])
        
        # If display name is same as method name, it's not an XML tool
        if xml_tag_name == tool_call["name"]:
            return f"Result for {tool_call['name']}: {str(result)}"
            
        # Format as simple XML tag without attributes
        xml_output = f"<{xml_tag_name}> {str(result)} </{xml_tag_name}>"
        return xml_output

    def _get_tool_display_name(self, method_name: str) -> str:
        """Get the display name for a tool (XML tag name if applicable, or method name)."""
        if not hasattr(self.tool_registry, 'xml_tools'):
            return method_name
            
        # Check if this method corresponds to an XML tool
        for tag_name, xml_tool_info in self.tool_registry.xml_tools.items():
            if xml_tool_info.get('method') == method_name:
                return tag_name
                
        # Default to the method name if no XML tag found
        return method_name

    # At class level, define a method for yielding tool results
    def _yield_tool_result(self, context: ToolExecutionContext) -> Dict[str, Any]:
        """Format and return a tool result message."""
        if not context.result:
            return {
                "type": "tool_result",
                "name": context.display_name,
                "result": "No result available",
                "tool_index": context.tool_index
            }
            
        formatted_result = self._format_xml_tool_result(context.tool_call, context.result)
        return {
            "type": "tool_result",
            "name": context.display_name,
            "result": formatted_result,
            "tool_index": context.tool_index
        }

    def _create_tool_context(self, tool_call: Dict[str, Any], tool_index: int) -> ToolExecutionContext:
        """Create a tool execution context with display name populated."""
        context = ToolExecutionContext(
            tool_call=tool_call,
            tool_index=tool_index
        )
        context.display_name = self._get_tool_display_name(tool_call["name"])
        return context
        
    def _yield_tool_started(self, context: ToolExecutionContext) -> Dict[str, Any]:
        """Format and return a tool started status message."""
        return {
            "type": "tool_status",
            "status": "started",
            "name": context.display_name,
            "message": f"Starting execution of {context.display_name}",
            "tool_index": context.tool_index
        }
        
    def _yield_tool_completed(self, context: ToolExecutionContext) -> Dict[str, Any]:
        """Format and return a tool completed/failed status message."""
        if not context.result:
            return self._yield_tool_error(context)
            
        return {
            "type": "tool_status",
            "status": "completed" if context.result.success else "failed",
            "name": context.display_name,
            "message": f"Tool {context.display_name} {'completed successfully' if context.result.success else 'failed'}",
            "tool_index": context.tool_index
        }
        
    def _yield_tool_error(self, context: ToolExecutionContext) -> Dict[str, Any]:
        """Format and return a tool error status message."""
        error_msg = str(context.error) if context.error else "Unknown error"
        return {
            "type": "tool_status",
            "status": "error",
            "name": context.display_name,
            "message": f"Error executing tool: {error_msg}",
            "tool_index": context.tool_index
        } 