"""
Conversation thread management system for AgentPress.

This module provides comprehensive conversation management, including:
- Thread creation and persistence
- Message handling with support for text and images
- Tool registration and execution
- LLM interaction with streaming support
- Error handling and cleanup
"""

import json
import logging
import asyncio
import uuid
from typing import List, Dict, Any, Optional, Type, Union, AsyncGenerator
from services.llm import make_llm_api_call
from agentpress.tool import Tool, ToolResult
from agentpress.tool_registry import ToolRegistry
from services.supabase import DBConnection
from utils.logger import logger

class ThreadManager:
    """Manages conversation threads with LLM models and tool execution.
    
    Provides comprehensive conversation management, handling message threading,
    tool registration, and LLM interactions with support for both standard and
    XML-based tool execution patterns.
    """

    def __init__(self):
        """Initialize ThreadManager."""
        self.db = DBConnection()
        self.tool_registry = ToolRegistry()

    def add_tool(self, tool_class: Type[Tool], function_names: Optional[List[str]] = None, **kwargs):
        """Add a tool to the ThreadManager."""
        self.tool_registry.register_tool(tool_class, function_names, **kwargs)

    async def create_thread(self) -> str:
        """Create a new conversation thread."""
        logger.info("Creating new conversation thread")
        thread_id = str(uuid.uuid4())
        try:
            client = await self.db.client
            thread_data = {
                'thread_id': thread_id,
                'messages': json.dumps([])
            }
            await client.table('threads').insert(thread_data).execute()
            logger.info(f"Successfully created thread with ID: {thread_id}")
            return thread_id
        except Exception as e:
            logger.error(f"Failed to create thread: {str(e)}", exc_info=True)
            raise

    async def add_message(self, thread_id: str, message_data: Dict[str, Any], images: Optional[List[Dict[str, Any]]] = None):
        """Add a message to an existing thread."""
        logger.info(f"Adding message to thread {thread_id}")
        logger.debug(f"Message data: {message_data}")
        logger.debug(f"Images: {images}")
        
        try:
            # Handle cleanup of incomplete tool calls
            '''
            if message_data['role'] == 'user':
                logger.debug("Checking for incomplete tool calls")
                messages = await self.get_messages(thread_id)
                last_assistant_index = next((i for i in reversed(range(len(messages))) 
                    if messages[i]['role'] == 'assistant' and 'tool_calls' in messages[i]), None)
                
                if last_assistant_index is not None:
                    tool_call_count = len(messages[last_assistant_index]['tool_calls'])
                    tool_response_count = sum(1 for msg in messages[last_assistant_index+1:] 
                                           if msg['role'] == 'tool')
                    
                    if tool_call_count != tool_response_count:
                        logger.info(f"Found incomplete tool calls in thread {thread_id}. Cleaning up...")
                        await self.cleanup_incomplete_tool_calls(thread_id)
            '''

            # Convert ToolResult instances to strings
            for key, value in message_data.items():
                if isinstance(value, ToolResult):
                    message_data[key] = str(value)

            # Handle image attachments
            if images:
                logger.debug(f"Processing {len(images)} image attachments")
                if isinstance(message_data['content'], str):
                    message_data['content'] = [{"type": "text", "text": message_data['content']}]
                elif not isinstance(message_data['content'], list):
                    message_data['content'] = []

                for image in images:
                    image_content = {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{image['content_type']};base64,{image['base64']}",
                            "detail": "high"
                        }
                    }
                    message_data['content'].append(image_content)

            # Get current messages
            client = await self.db.client
            thread = await client.table('threads').select('*').eq('thread_id', thread_id).single().execute()
            
            if not thread.data:
                logger.error(f"Thread {thread_id} not found")
                raise ValueError(f"Thread {thread_id} not found")
            
            messages = json.loads(thread.data['messages'])
            messages.append(message_data)
            
            # Update thread
            await client.table('threads').update({
                'messages': json.dumps(messages)
            }).eq('thread_id', thread_id).execute()

            logger.info(f"Successfully added message to thread {thread_id}")
            logger.debug(f"Updated message count: {len(messages)}")
            
        except Exception as e:
            logger.error(f"Failed to add message to thread {thread_id}: {str(e)}", exc_info=True)
            raise

    async def get_messages(
        self, 
        thread_id: str,
        hide_tool_msgs: bool = False,
        only_latest_assistant: bool = False,
        regular_list: bool = True
    ) -> List[Dict[str, Any]]:
        """Retrieve messages from a thread with optional filtering."""
        logger.debug(f"Retrieving messages for thread {thread_id}")
        logger.debug(f"Filters: hide_tool_msgs={hide_tool_msgs}, only_latest_assistant={only_latest_assistant}, regular_list={regular_list}")
        
        try:
            client = await self.db.client
            thread = await client.table('threads').select('*').eq('thread_id', thread_id).single().execute()
            
            if not thread.data:
                logger.warning(f"Thread {thread_id} not found")
                return []
            
            messages = json.loads(thread.data['messages'])
            logger.debug(f"Retrieved {len(messages)} messages")
            
            if only_latest_assistant:
                for msg in reversed(messages):
                    if msg.get('role') == 'assistant':
                        logger.debug("Returning only latest assistant message")
                        return [msg]
                logger.debug("No assistant messages found")
                return []
            
            if hide_tool_msgs:
                messages = [
                    {k: v for k, v in msg.items() if k != 'tool_calls'}
                    for msg in messages
                    if msg.get('role') != 'tool'
                ]
                logger.debug(f"Filtered out tool messages. Remaining: {len(messages)}")
            
            if regular_list:
                messages = [
                    msg for msg in messages
                    if msg.get('role') in ['system', 'assistant', 'tool', 'user']
                ]
                logger.debug(f"Filtered to regular messages. Count: {len(messages)}")
            
            return messages
            
        except Exception as e:
            logger.error(f"Failed to get messages for thread {thread_id}: {str(e)}", exc_info=True)
            raise

    async def _update_message(self, thread_id: str, message: Dict[str, Any]):
        """Update an existing message in the thread."""
        client = await self.db.client
        thread = await client.table('threads').select('*').eq('thread_id', thread_id).single().execute()
        
        if not thread.data:
            return
        
        messages = json.loads(thread.data['messages'])
        
        # Find and update the last assistant message
        for i in reversed(range(len(messages))):
            if messages[i].get('role') == 'assistant':
                messages[i] = message
                break
        
        await client.table('threads').update({
            'messages': json.dumps(messages)
        }).eq('thread_id', thread_id).execute()

    # async def cleanup_incomplete_tool_calls(self, thread_id: str):
    #     """Clean up incomplete tool calls in a thread."""
    #     logger.info(f"Cleaning up incomplete tool calls in thread {thread_id}")
    #     try:
    #         messages = await self.get_messages(thread_id)
    #         last_assistant_message = next((m for m in reversed(messages) 
    #             if m['role'] == 'assistant' and 'tool_calls' in m), None)

    #         if last_assistant_message:
    #             tool_calls = last_assistant_message.get('tool_calls', [])
    #             tool_responses = [m for m in messages[messages.index(last_assistant_message)+1:] 
    #                             if m['role'] == 'tool']

    #             logger.debug(f"Found {len(tool_calls)} tool calls and {len(tool_responses)} responses")

    #             if len(tool_calls) != len(tool_responses):
    #                 failed_tool_results = []
    #                 for tool_call in tool_calls[len(tool_responses):]:
    #                     failed_tool_result = {
    #                         "role": "tool",
    #                         "tool_call_id": tool_call['id'],
    #                         "name": tool_call['function']['name'],
    #                         "content": "ToolResult(success=False, output='Execution interrupted. Session was stopped.')"
    #                     }
    #                     failed_tool_results.append(failed_tool_result)

    #                 assistant_index = messages.index(last_assistant_message)
    #                 messages[assistant_index+1:assistant_index+1] = failed_tool_results

    #                 client = await self.db.client
    #                 await client.table('threads').update({
    #                     'messages': json.dumps(messages)
    #                 }).eq('thread_id', thread_id).execute()
                    
    #                 logger.info(f"Successfully cleaned up {len(failed_tool_results)} incomplete tool calls")
    #                 return True
    #         else:
    #             logger.debug("No assistant message with tool calls found")
    #         return False
            
    #     except Exception as e:
    #         logger.error(f"Failed to cleanup incomplete tool calls: {str(e)}", exc_info=True)
    #         raise

    async def run_thread(
        self,
        thread_id: str,
        system_message: Dict[str, Any],
        model_name: str,
        temperature: float = 0,
        max_tokens: Optional[int] = None,
        tool_choice: str = "auto",
        temporary_message: Optional[Dict[str, Any]] = None,
        native_tool_calling: bool = False,
        xml_tool_calling: bool = False,
        execute_tools: bool = True,
        stream: bool = False,
        execute_tools_on_stream: bool = False,
        parallel_tool_execution: bool = False,
    ) -> Union[Dict[str, Any], AsyncGenerator]:
        """Run a conversation thread with specified parameters."""
        logger.info(f"Starting thread execution for thread {thread_id}")
        logger.debug(f"Parameters: model={model_name}, temperature={temperature}, max_tokens={max_tokens}, "
                    f"tool_choice={tool_choice}, native_tool_calling={native_tool_calling}, "
                    f"xml_tool_calling={xml_tool_calling}, execute_tools={execute_tools}, stream={stream}, "
                    f"execute_tools_on_stream={execute_tools_on_stream}, "
                    f"parallel_tool_execution={parallel_tool_execution}")
        
        try:
            # 1. Get messages from thread for LLM call
            messages = await self.get_messages(thread_id)
            
            # 2. Prepare messages for LLM call + add temporary message if it exists
            prepared_messages = [system_message] + messages
            if temporary_message:
                prepared_messages.append(temporary_message)
                logger.debug("Added temporary message to prepared messages")

            if native_tool_calling and xml_tool_calling:
                logger.error("Invalid configuration: Cannot use both native and XML tool calling")
                raise ValueError("Cannot use both native LLM tool calling and XML tool calling simultaneously")

            # 3. Prepare tools for LLM call
            openapi_tool_schemas = None
            if native_tool_calling:
                openapi_tool_schemas = self.tool_registry.get_openapi_schemas()
                available_functions = self.tool_registry.get_available_functions()
                logger.debug(f"Retrieved {len(openapi_tool_schemas)} OpenAPI tool schemas")
            elif xml_tool_calling:
                available_functions = self.tool_registry.get_available_functions()
                logger.debug(f"Retrieved {len(available_functions)} available functions for XML tool calling")
            else:
                available_functions = {}
                logger.debug("No tool calling enabled")

            # 4. Make LLM API call
            logger.info("Making LLM API call")
            try:
                llm_response = await make_llm_api_call(
                    prepared_messages,
                    model_name,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    tools=openapi_tool_schemas,
                    tool_choice=tool_choice if native_tool_calling else None,
                    stream=stream
                )
                logger.debug("Successfully received LLM API response")
            except Exception as e:
                logger.error(f"Failed to make LLM API call: {str(e)}", exc_info=True)
                raise

            # 5. Process LLM response
            if stream:
                logger.info("Received streaming response from LLM API")
                
                # Create a formatted stream that processes each chunk
                async def process_streaming_response():
                    try:
                        async for chunk in llm_response:
                            # Log the chunk contents for debugging
                            if hasattr(chunk, 'choices') and chunk.choices:
                                if hasattr(chunk.choices[0], 'delta'):
                                    delta = chunk.choices[0].delta
                                    
                                    if hasattr(delta, 'content') and delta.content:
                                        print(f"STREAM CONTENT: {delta.content}")
                                        # Yield a formatted content response
                                        yield {"type": "content", "content": delta.content}
                                    
                                    if hasattr(delta, 'tool_calls') and delta.tool_calls:
                                        for tool_call in delta.tool_calls:
                                            if hasattr(tool_call, 'function'):
                                                function_name = tool_call.function.name
                                                arguments = tool_call.function.arguments
                                                print(f"STREAM TOOL CALL: {function_name} - {arguments}")
                                                # Yield a formatted tool call response
                                                yield {
                                                    "type": "tool_call",
                                                    "name": function_name,
                                                    "arguments": arguments
                                                }
                    except Exception as e:
                        logger.error(f"Error processing stream: {str(e)}", exc_info=True)
                        # Yield an error response
                        yield {"type": "error", "message": str(e)}
                
                return process_streaming_response()
            else:
                logger.info("Received non-streaming response from LLM API")
                # Convert non-streaming response into a single-chunk stream
                async def single_chunk_stream():
                    try:
                        formatted_response = {"type": "content", "content": ""}
                        
                        if hasattr(llm_response, 'choices') and llm_response.choices:
                            choice = llm_response.choices[0]
                            
                            if hasattr(choice, 'message'):
                                message = choice.message
                                
                                if hasattr(message, 'content') and message.content:
                                    print(f"RESPONSE CONTENT: {message.content}")
                                    formatted_response = {"type": "content", "content": message.content}
                                
                                if hasattr(message, 'tool_calls') and message.tool_calls:
                                    formatted_response = {"type": "tool_calls", "tool_calls": []}
                                    for tool_call in message.tool_calls:
                                        if hasattr(tool_call, 'function'):
                                            function_name = tool_call.function.name
                                            arguments = tool_call.function.arguments
                                            print(f"RESPONSE TOOL CALL: {function_name} - {arguments}")
                                            formatted_response["tool_calls"].append({
                                                "name": function_name,
                                                "arguments": arguments
                                            })
                        
                        # For debugging, also log the full response
                        print(f"FULL RESPONSE: {json.dumps(llm_response, indent=2, default=str) if hasattr(llm_response, '__dict__') else str(llm_response)}")
                        
                        yield formatted_response
                    except Exception as e:
                        logger.error(f"Error formatting response: {str(e)}", exc_info=True)
                        yield {"type": "error", "message": str(e)}
                
                return single_chunk_stream()
          

        except Exception as e:
            logger.error(f"Error in run_thread: {str(e)}", exc_info=True)
            return {
                "status": "error",
                "message": str(e)
            }