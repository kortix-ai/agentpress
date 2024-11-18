"""
XML-specific implementation for parsing tool calls from LLM responses.

This module provides specialized parsing for XML-formatted tool calls, supporting both
complete and streaming responses with robust XML parsing and validation capabilities.
"""

import logging
from typing import Dict, Any, Optional, List, Tuple
from agentpress.base_processors import ToolParserBase
import json
import re
from agentpress.tool_registry import ToolRegistry

class XMLToolParser(ToolParserBase):
    """XML-specific implementation for parsing tool calls from LLM responses.
    
    This implementation handles the parsing of XML-formatted tool calls, providing
    robust XML parsing with support for attributes, nested elements, and proper
    error handling.
    
    Attributes:
        tool_registry (ToolRegistry): Registry containing XML tool schemas and mappings
        
    Methods:
        parse_response: Process complete XML responses
        parse_stream: Handle streaming XML chunks
    """
    
    def __init__(self, tool_registry: Optional[ToolRegistry] = None):
        """Initialize parser with tool registry.
        
        Args:
            tool_registry: Registry containing XML tool definitions (optional)
        """
        self.tool_registry = tool_registry or ToolRegistry()
    
    def _extract_tag_content(self, xml_chunk: str, tag_name: str) -> Tuple[Optional[str], Optional[str]]:
        """Extract content between opening and closing tags, handling nested tags.
        
        Args:
            xml_chunk: The XML content to parse
            tag_name: Name of the tag to find
            
        Returns:
            Tuple containing:
                - str: Extracted content if found, None otherwise
                - str: Remaining XML chunk after extraction
                
        Notes:
            - Handles nested tags of the same name correctly
            - Preserves XML structure within extracted content
        """
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
                    pos = next_end + len(end_tag)
            
            if nesting_level == 0:
                content = xml_chunk[content_start:pos - len(end_tag)]
                remaining = xml_chunk[pos:]
                return content, remaining
                
            return None, xml_chunk
            
        except Exception as e:
            logging.error(f"Error extracting tag content: {e}")
            return None, xml_chunk

    def _extract_attribute(self, opening_tag: str, attr_name: str) -> Optional[str]:
        """Extract attribute value from opening tag.
        
        Args:
            opening_tag: The opening XML tag
            attr_name: Name of the attribute to find
            
        Returns:
            str: Attribute value if found, None otherwise
            
        Notes:
            - Handles both single and double quoted attributes
            - Unescapes XML entities in attribute values
        """
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
            logging.error(f"Error extracting attribute: {e}")
            return None

    def _extract_xml_chunks(self, content: str) -> List[str]:
        """Extract complete XML chunks using start and end pattern matching.
        
        Args:
            content: The XML content to parse
            
        Returns:
            List[str]: Complete XML chunks found in the content
            
        Notes:
            - Matches only registered XML tool tags
            - Handles nested tags correctly
        """
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
            logging.error(f"Error extracting XML chunks: {e}")
            logging.error(f"Content was: {content}")
        
        return chunks

    async def _parse_xml_to_tool_call(self, xml_chunk: str) -> Optional[Dict[str, Any]]:
        """Parse XML chunk into tool call format.
        
        Args:
            xml_chunk: Complete XML chunk to parse
            
        Returns:
            Dict containing tool call information if successful, None otherwise
            
        Notes:
            - Validates against registered XML schemas
            - Extracts parameters according to schema mappings
            - Handles both attribute and element-based parameters
        """
        try:
            # Extract tag name and validate
            tag_match = re.match(r'<([^\s>]+)', xml_chunk)
            if not tag_match:
                logging.error(f"No tag found in XML chunk: {xml_chunk}")
                return None
                
            tag_name = tag_match.group(1)
            logging.info(f"Found XML tag: {tag_name}")
            
            # Get tool info and schema
            tool_info = self.tool_registry.get_xml_tool(tag_name)
            if not tool_info or not tool_info['schema'].xml_schema:
                logging.error(f"No tool or schema found for tag: {tag_name}")
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
                            logging.info(f"Found attribute {mapping.path} -> {mapping.param_name}: {value}")
                    
                    elif mapping.node_type == "element":
                        # Extract element content
                        content, remaining_chunk = self._extract_tag_content(remaining_chunk, mapping.path)
                        if content is not None:
                            params[mapping.param_name] = content.strip()
                            logging.info(f"Found element {mapping.path} -> {mapping.param_name}")
                    
                    elif mapping.node_type == "content":
                        if mapping.path == ".":
                            # Extract root content
                            content, _ = self._extract_tag_content(remaining_chunk, tag_name)
                            if content is not None:
                                params[mapping.param_name] = content.strip()
                                logging.info(f"Found root content for {mapping.param_name}")
                
                except Exception as e:
                    logging.error(f"Error processing mapping {mapping}: {e}")
                    continue
            
            # Validate required parameters
            missing = [mapping.param_name for mapping in schema.mappings if mapping.param_name not in params]
            if missing:
                logging.error(f"Missing required parameters: {missing}")
                logging.error(f"Current params: {params}")
                logging.error(f"XML chunk: {xml_chunk}")
                return None
            
            # Create tool call
            tool_call = {
                "id": f"tool_{hash(xml_chunk)}",
                "type": "function",
                "function": {
                    "name": tool_info['method'],
                    "arguments": json.dumps(params)
                }
            }
            
            logging.info(f"Created tool call: {tool_call}")
            return tool_call
            
        except Exception as e:
            logging.error(f"Error parsing XML chunk: {e}")
            logging.error(f"XML chunk was: {xml_chunk}")
            return None

    async def parse_response(self, response: Any) -> Dict[str, Any]:
        response_message = response.choices[0].message
        content = response_message.get('content') or ""
        
        message = {
            "role": "assistant",
            "content": content,
        }
        
        tool_calls = []
        try:
            xml_chunks = self._extract_xml_chunks(content)
            for xml_chunk in xml_chunks:
                tool_call = await self._parse_xml_to_tool_call(xml_chunk)
                if tool_call:
                    tool_calls.append(tool_call)
            
            if tool_calls:
                message["tool_calls"] = tool_calls
                
        except Exception as e:
            logging.error(f"Error parsing XML response: {e}")
            
        return message

    async def parse_stream(self, response_chunk: Any, tool_calls_buffer: Dict[int, Dict]) -> tuple[Optional[Dict[str, Any]], bool]:
        content_chunk = ""
        is_complete = False
        
        if hasattr(response_chunk.choices[0], 'delta'):
            delta = response_chunk.choices[0].delta
            
            if hasattr(delta, 'content') and delta.content:
                content_chunk = delta.content
                tool_calls_buffer.setdefault('xml_buffer', '')
                tool_calls_buffer['xml_buffer'] += content_chunk
                
                # Process any complete XML tags
                tool_calls = await self._process_streaming_xml(tool_calls_buffer['xml_buffer'])
                if tool_calls:
                    # Clear processed content from buffer
                    last_end_tag = max(
                        (tool_calls_buffer['xml_buffer'].rfind(f'</{tag}>') 
                         for tag in self.tool_registry.xml_tools.keys()),
                        default=-1
                    )
                    if last_end_tag > -1:
                        tool_calls_buffer['xml_buffer'] = tool_calls_buffer['xml_buffer'][last_end_tag + 1:]
                    
                    return {
                        "role": "assistant",
                        "content": content_chunk,
                        "tool_calls": tool_calls
                    }, is_complete

        if hasattr(response_chunk.choices[0], 'finish_reason') and response_chunk.choices[0].finish_reason:
            is_complete = True
            if 'xml_buffer' in tool_calls_buffer:
                tool_calls = await self._process_streaming_xml(tool_calls_buffer['xml_buffer'])
                if tool_calls:
                    return {
                        "role": "assistant",
                        "content": content_chunk,
                        "tool_calls": tool_calls
                    }, is_complete

        return None, is_complete

    async def _process_streaming_xml(self, content: str) -> List[Dict[str, Any]]:
        tool_calls = []
        
        # Find complete XML tags based on registered tools
        for tag_name in self.tool_registry.xml_tools.keys():
            start_tag = f'<{tag_name}'
            end_tag = f'</{tag_name}>'
            
            start_idx = 0
            while True:
                start_idx = content.find(start_tag, start_idx)
                if start_idx == -1:
                    break
                    
                end_idx = content.find(end_tag, start_idx)
                if end_idx == -1:
                    break
                    
                # Extract complete XML chunk
                xml_chunk = content[start_idx:end_idx + len(end_tag)]
                try:
                    tool_call = await self._parse_xml_to_tool_call(xml_chunk)
                    if tool_call:
                        tool_calls.append(tool_call)
                except Exception as e:
                    logging.error(f"Error parsing streaming XML chunk: {e}")
                
                start_idx = end_idx + len(end_tag)
        
        return tool_calls