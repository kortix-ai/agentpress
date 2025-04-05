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
import uuid
from typing import List, Dict, Any, Optional, Type, Union, AsyncGenerator, Tuple, Callable, Literal
from services.llm import make_llm_api_call
from agentpress.tool import Tool, ToolResult
from agentpress.tool_registry import ToolRegistry
from agentpress.response_processor import (
    ResponseProcessor, 
    ProcessorConfig    
)
from services.supabase import DBConnection
from utils.logger import logger

# Type alias for tool choice
ToolChoice = Literal["auto", "required", "none"]

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
        self.response_processor = ResponseProcessor(
            tool_registry=self.tool_registry,
            add_message_callback=self.add_message
        )

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
        system_prompt: Dict[str, Any],
        stream: bool = True,
        temporary_message: Optional[Dict[str, Any]] = None,
        llm_model: str = "gpt-4o",
        llm_temperature: float = 0,
        llm_max_tokens: Optional[int] = None,
        processor_config: Optional[ProcessorConfig] = None,
        tool_choice: ToolChoice = "auto",
    ) -> Union[Dict[str, Any], AsyncGenerator]:
        """Run a conversation thread with LLM integration and tool execution.
        
        Args:
            thread_id: The ID of the thread to run
            system_prompt: System message to set the assistant's behavior
            stream: Use streaming API for the LLM response
            temporary_message: Optional temporary user message for this run only
            llm_model: The name of the LLM model to use
            llm_temperature: Temperature parameter for response randomness (0-1)
            llm_max_tokens: Maximum tokens in the LLM response
            processor_config: Configuration for the response processor
            tool_choice: Tool choice preference ("auto", "required", "none")
            
        Returns:
            An async generator yielding response chunks or error dict
        """
        logger.info(f"Starting thread execution for thread {thread_id}")
        logger.debug(f"Parameters: model={llm_model}, temperature={llm_temperature}, max_tokens={llm_max_tokens}")
        
        try:
            # 1. Get messages from thread for LLM call
            messages = await self.get_messages(thread_id)
            
            # 2. Prepare messages for LLM call + add temporary message if it exists
            prepared_messages = [system_prompt]
            
            # Find the last user message index
            last_user_index = -1
            for i, msg in enumerate(messages):
                if msg.get('role') == 'user':
                    last_user_index = i
            
            # Insert temporary message before the last user message if it exists
            if temporary_message and last_user_index >= 0:
                prepared_messages.extend(messages[:last_user_index])
                prepared_messages.append(temporary_message)
                prepared_messages.extend(messages[last_user_index:])
                logger.debug("Added temporary message before the last user message")
            else:
                # If no user message or no temporary message, just add all messages
                prepared_messages.extend(messages)
                if temporary_message:
                    prepared_messages.append(temporary_message)
                    logger.debug("Added temporary message to the end of prepared messages")

            # 3. Create or use processor config
            if processor_config is None:
                processor_config = ProcessorConfig()
            
            logger.debug(f"Processor config: XML={processor_config.xml_tool_calling}, Native={processor_config.native_tool_calling}, " 
                   f"Execute tools={processor_config.execute_tools}, Strategy={processor_config.tool_execution_strategy}")

            # Check if native_tool_calling is enabled and throw an error if it is
            if processor_config.native_tool_calling:
                error_message = "Native tool calling is not supported in this version"
                logger.error(error_message)
                return {
                    "status": "error",
                    "message": error_message
                }

            # 4. Prepare tools for LLM call
            openapi_tool_schemas = None
            if processor_config.native_tool_calling:
                openapi_tool_schemas = self.tool_registry.get_openapi_schemas()
                logger.debug(f"Retrieved {len(openapi_tool_schemas) if openapi_tool_schemas else 0} OpenAPI tool schemas")

            # 5. Make LLM API call
            logger.info("Making LLM API call")
            try:
                llm_response = await make_llm_api_call(
                    prepared_messages,
                    llm_model,
                    temperature=llm_temperature,
                    max_tokens=llm_max_tokens,
                    tools=openapi_tool_schemas,
                    tool_choice=tool_choice if processor_config.native_tool_calling else None,
                    stream=stream
                )
                logger.debug("Successfully received LLM API response")
            except Exception as e:
                logger.error(f"Failed to make LLM API call: {str(e)}", exc_info=True)
                raise

            # 6. Process LLM response using the ResponseProcessor
            if stream:
                logger.info("Processing streaming response")
                return self.response_processor.process_streaming_response(
                    llm_response=llm_response,
                    thread_id=thread_id,
                    config=processor_config
                )
            else:
                logger.info("Processing non-streaming response")
                return self.response_processor.process_non_streaming_response(
                    llm_response=llm_response,
                    thread_id=thread_id,
                    config=processor_config
                )
          
        except Exception as e:
            logger.error(f"Error in run_thread: {str(e)}", exc_info=True)
            return {
                "status": "error",
                "message": str(e)
            }