import logging
from typing import Dict, Any, Optional
from agentpress.thread_llm_response_processor import ToolParserBase
import json
import re

class XMLToolParser(ToolParserBase):
    def __init__(self):
        self.current_tag = None
        self.current_content = []
        self.file_path = None
        
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
                tool_call = self._parse_xml_to_tool_call(xml_chunk)
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
                tool_calls = self._process_streaming_xml(tool_calls_buffer['xml_buffer'])
                if tool_calls:
                    # Clear processed content from buffer
                    last_end_tag = max(
                        tool_calls_buffer['xml_buffer'].rfind('</create-file>'),
                        tool_calls_buffer['xml_buffer'].rfind('</update-file>'),
                        tool_calls_buffer['xml_buffer'].rfind('</delete-file>')
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
                tool_calls = self._process_streaming_xml(tool_calls_buffer['xml_buffer'])
                if tool_calls:
                    return {
                        "role": "assistant",
                        "content": content_chunk,
                        "tool_calls": tool_calls
                    }, is_complete

        return None, is_complete

    def _process_streaming_xml(self, content: str) -> list[Dict[str, Any]]:
        tool_calls = []
        
        # Find complete XML tags
        start_tags = ['<create-file', '<update-file', '<delete-file']
        end_tags = ['</create-file>', '</update-file>', '</delete-file>']
        
        for start_tag in start_tags:
            start_idx = content.find(start_tag)
            if start_idx >= 0:
                # Find corresponding end tag
                tag_type = start_tag[1:]  # Remove '<'
                end_tag = f"</{tag_type}>"
                end_idx = content.find(end_tag, start_idx)
                
                if end_idx >= 0:
                    # Extract complete XML chunk
                    xml_chunk = content[start_idx:end_idx + len(end_tag)]
                    try:
                        tool_call = self._parse_xml_to_tool_call(xml_chunk)
                        if tool_call:
                            tool_calls.append(tool_call)
                    except Exception as e:
                        logging.error(f"Error parsing streaming XML chunk: {e}")
        
        return tool_calls

    def _extract_xml_chunks(self, content: str) -> list[str]:
        chunks = []
        current_chunk = []
        in_tag = False
        
        lines = content.split('\n')
        for line in lines:
            if any(tag in line for tag in ['<create-file', '<update-file', '<delete-file']):
                if in_tag:  # Close previous tag if any
                    chunks.append('\n'.join(current_chunk))
                    current_chunk = []
                in_tag = True
                current_chunk = [line]
            elif in_tag:
                current_chunk.append(line)
                if any(tag in line for tag in ['</create-file>', '</update-file>', '</delete-file>']):
                    chunks.append('\n'.join(current_chunk))
                    current_chunk = []
                    in_tag = False
        
        if current_chunk and in_tag:
            chunks.append('\n'.join(current_chunk))
        
        return chunks

    def _parse_xml_to_tool_call(self, xml_chunk: str) -> Optional[Dict[str, Any]]:
        try:
            # Extract file path from the opening tag
            file_path_match = re.search(r'file_path="([^"]+)"', xml_chunk)
            if not file_path_match:
                return None
            
            file_path = file_path_match.group(1)
            
            # Extract content between tags
            content_match = re.search(r'>(.*?)</[^>]+>$', xml_chunk, re.DOTALL)
            if not content_match:
                return None
                
            content = content_match.group(1).strip()
            
            # Determine operation type
            if '<create-file' in xml_chunk:
                return {
                    "id": f"tool_{hash(xml_chunk)}",
                    "type": "function",
                    "function": {
                        "name": "create_file",
                        "arguments": json.dumps({
                            "file_path": file_path,
                            "file_contents": content
                        })
                    }
                }
            elif '<update-file' in xml_chunk:
                return {
                    "id": f"tool_{hash(xml_chunk)}",
                    "type": "function",
                    "function": {
                        "name": "str_replace",
                        "arguments": json.dumps({
                            "file_path": file_path,
                            "old_str": "",
                            "new_str": content
                        })
                    }
                }
            elif '<delete-file' in xml_chunk:
                return {
                    "id": f"tool_{hash(xml_chunk)}",
                    "type": "function",
                    "function": {
                        "name": "delete_file",
                        "arguments": json.dumps({
                            "file_path": file_path
                        })
                    }
                }
                
        except Exception as e:
            logging.error(f"Error parsing XML chunk: {e}")
            return None 