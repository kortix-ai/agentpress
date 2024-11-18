import logging
from typing import Dict, Any, Optional, List
from agentpress.thread_llm_response_processor import ToolParserBase
import json
import re
from agentpress.tool_registry import ToolRegistry

class XMLToolParser(ToolParserBase):
    def __init__(self, tool_registry: Optional[ToolRegistry] = None):
        self.tool_registry = tool_registry or ToolRegistry()
        
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

    def _extract_xml_chunks(self, content: str) -> List[str]:
        chunks = []
        current_chunk = []
        in_tag = False
        
        lines = content.split('\n')
        for line in lines:
            # Check for registered XML tags
            for tag_name in self.tool_registry.xml_tools.keys():
                if f'<{tag_name}' in line:
                    if in_tag:  # Close previous tag if any
                        chunks.append('\n'.join(current_chunk))
                        current_chunk = []
                    in_tag = True
                    current_chunk = [line]
                    break
                elif f'</{tag_name}>' in line and in_tag:
                    current_chunk.append(line)
                    chunks.append('\n'.join(current_chunk))
                    current_chunk = []
                    in_tag = False
                    break
            else:
                if in_tag:
                    current_chunk.append(line)
        
        if current_chunk and in_tag:
            chunks.append('\n'.join(current_chunk))
        
        return chunks

    async def _parse_xml_to_tool_call(self, xml_chunk: str) -> Optional[Dict[str, Any]]:
        try:
            # Extract tag name to look up tool
            tag_match = re.match(r'<([^\s>]+)', xml_chunk)
            if not tag_match:
                logging.error(f"No tag found in XML chunk: {xml_chunk}")
                return None
                
            tag_name = tag_match.group(1)
            logging.info(f"Found XML tag: {tag_name}")
            
            tool_info = self.tool_registry.get_xml_tool(tag_name)
            if not tool_info:
                logging.error(f"No tool found for tag: {tag_name}")
                return None
                
            schema = tool_info['schema'].xml_schema
            if not schema:
                logging.error(f"No XML schema found for tag: {tag_name}")
                return None
                
            # Extract parameters
            params = {}
            
            # Extract attributes
            for attr_name, param_name in schema.attributes.items():
                attr_match = re.search(f'{attr_name}="([^"]+)"', xml_chunk)
                if attr_match:
                    params[param_name] = attr_match.group(1)
                    logging.info(f"Found attribute {attr_name} -> {param_name}: {attr_match.group(1)}")
            
            # Extract mapped parameters (both direct content and nested tags)
            for xml_element, param_name in schema.param_mapping.items():
                if xml_element == ".":  # Root tag content
                    content_match = re.search(r'>(.*?)</[^>]+>$', xml_chunk, re.DOTALL)
                    if content_match:
                        content = content_match.group(1).strip()
                        if content:  # Only set if there's actual content
                            params[param_name] = content
                            logging.info(f"Found root content for {param_name}: {content}")
                else:  # Nested tag
                    # Updated regex pattern to handle multiline content
                    pattern = f'<{xml_element}>(.*?)</{xml_element}>'
                    nested_match = re.search(pattern, xml_chunk, re.DOTALL | re.MULTILINE)
                    if nested_match:
                        params[param_name] = nested_match.group(1).strip()
                        logging.info(f"Found nested tag {xml_element} -> {param_name}: {nested_match.group(1)}")
            
            if not all(param in params for param in schema.param_mapping.values()):
                missing = [param for param in schema.param_mapping.values() if param not in params]
                logging.error(f"Missing required parameters: {missing}")
                logging.error(f"Current params: {params}")
                logging.error(f"XML chunk: {xml_chunk}")
                return None
            
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