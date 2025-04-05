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

    async def create_thread(self, project_id: Optional[str] = None, user_id: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> str:
        """Create a new conversation thread.
        
        Args:
            project_id: Optional project ID to associate with the thread
            user_id: Optional user ID to associate with the thread
            metadata: Optional additional metadata for the thread
            
        Returns:
            The created thread ID
        """
        logger.info("Creating new conversation thread")
        thread_id = str(uuid.uuid4())
        try:
            client = await self.db.client
            
            # Initialize metadata dictionary
            thread_metadata = metadata or {}
            
            # Add project_id and user_id to metadata if provided
            if project_id:
                thread_metadata['project_id'] = project_id
            if user_id:
                thread_metadata['user_id'] = user_id
            
            thread_data = {
                'thread_id': thread_id,
                'metadata': json.dumps(thread_metadata)
            }
            
            await client.table('threads').insert(thread_data).execute()
            logger.info(f"Successfully created thread with ID: {thread_id}")
            return thread_id
        except Exception as e:
            logger.error(f"Failed to create thread: {str(e)}", exc_info=True)
            raise

    async def add_message(
        self, 
        thread_id: str, 
        message_data: Dict[str, Any], 
        images: Optional[List[Dict[str, Any]]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        message_type: Optional[str] = None,
        include_in_llm: Optional[bool] = None
    ):
        """Add a message to an existing thread.
        
        Args:
            thread_id: The ID of the thread to add the message to
            message_data: The message data (content, role, etc)
            images: Optional image attachments for the message
            metadata: Optional metadata to attach to the message
            message_type: Optional explicit message type (overrides autodetection)
            include_in_llm: Whether to include in LLM message history
        """
        logger.info(f"Adding message to thread {thread_id}")
        logger.debug(f"Message data: {message_data}")
        logger.debug(f"Images: {images}")
        
        try:
            # Convert ToolResult instances to strings
            for key, value in message_data.items():
                if isinstance(value, ToolResult):
                    message_data[key] = str(value)

            # Determine message type if not explicitly provided
            if message_type is None:
                message_type = 'other'
                if 'role' in message_data:
                    role = message_data['role']
                    if role == 'user':
                        message_type = 'llm_user_message'
                    elif role == 'assistant':
                        message_type = 'llm_assistant_message'
                    elif role == 'system':
                        message_type = 'llm_system_message'
                    elif role == 'tool':
                        message_type = 'tool_response'

            # Determine whether to include in LLM history
            if include_in_llm is None:
                # By default, include all message types except tool responses and custom types
                include_in_llm = message_type.startswith('llm_')

            # Handle image attachments
            content = message_data.get('content', '')
            if images:
                logger.debug(f"Processing {len(images)} image attachments")
                if isinstance(content, str):
                    content_obj = [{"type": "text", "text": content}]
                elif not isinstance(content, list):
                    content_obj = []
                else:
                    content_obj = content

                for image in images:
                    image_content = {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{image['content_type']};base64,{image['base64']}",
                            "detail": "high"
                        }
                    }
                    content_obj.append(image_content)
                
                # Update the content
                content = content_obj
            
            # Prepare message data to insert
            if isinstance(content, str):
                # Simple text content
                content_json = {
                    "role": message_data.get('role', 'unknown'),
                    "text": content
                }
            else:
                # Complex content (list or object)
                content_json = {
                    "role": message_data.get('role', 'unknown'),
                    "content": content
                }
                
                # If there are tool_calls, include them
                if 'tool_calls' in message_data:
                    content_json["tool_calls"] = message_data['tool_calls']
            
            # Prepare metadata
            message_metadata = metadata or {}
            
            # Add message ID if available
            if 'id' in message_data:
                message_metadata['message_id'] = message_data['id']
                
            # Add tool call info if available
            if 'tool_call_id' in message_data:
                message_metadata['tool_call_id'] = message_data['tool_call_id']
                
            # Insert the message
            client = await self.db.client
            await client.table('messages').insert({
                'thread_id': thread_id,
                'type': message_type,
                'is_llm_message': include_in_llm,
                'content': json.dumps(content_json),
                'metadata': json.dumps(message_metadata)
            }).execute()

            logger.info(f"Successfully added message to thread {thread_id}")
            
        except Exception as e:
            logger.error(f"Failed to add message to thread {thread_id}: {str(e)}", exc_info=True)
            raise

    async def get_messages(
        self, 
        thread_id: str,
        hide_tool_msgs: bool = False,
        only_latest_assistant: bool = False,
        include_metadata: bool = False,
        message_types: Optional[List[str]] = None,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Retrieve messages from a thread with optional filtering.
        
        Args:
            thread_id: The ID of the thread to get messages from
            hide_tool_msgs: Whether to hide tool messages
            only_latest_assistant: Whether to only return the latest assistant message
            include_metadata: Whether to include message metadata in the result
            message_types: Optional list of message types to include
            limit: Optional maximum number of messages to return
            
        Returns:
            A list of messages from the thread
        """
        logger.debug(f"Retrieving messages for thread {thread_id}")
        logger.debug(f"Filters: hide_tool_msgs={hide_tool_msgs}, only_latest_assistant={only_latest_assistant}")
        
        try:
            client = await self.db.client
            
            # Start building the query
            query = client.table('messages').select('*').eq('thread_id', thread_id).order('created_at')
            
            # Add message type filter if specified
            if message_types:
                query = query.in_('type', message_types)
                
            # Add limit if specified
            if limit:
                query = query.limit(limit)
                
            # Execute the query
            result = await query.execute()
            
            if not result.data:
                logger.warning(f"No messages found for thread {thread_id}")
                return []
            
            # Process the messages
            messages = []
            for msg_record in result.data:
                content_obj = json.loads(msg_record['content'])
                
                # Create message in the format expected by the LLM API
                msg = {
                    'role': content_obj.get('role', 'unknown')
                }
                
                # Handle different content formats
                if 'text' in content_obj:
                    msg['content'] = content_obj['text']
                elif 'content' in content_obj:
                    msg['content'] = content_obj['content']
                else:
                    # Fallback
                    msg['content'] = ''
                
                # Include tool_calls if they exist
                if 'tool_calls' in content_obj:
                    msg['tool_calls'] = content_obj['tool_calls']
                
                # Include metadata if requested
                if include_metadata:
                    msg['metadata'] = json.loads(msg_record['metadata'])
                    msg['type'] = msg_record['type']
                    msg['is_llm_message'] = msg_record['is_llm_message']
                    msg['created_at'] = msg_record['created_at']
                    msg['message_id'] = msg_record['message_id']
                
                messages.append(msg)
                
            logger.debug(f"Retrieved {len(messages)} messages")
            
            # Apply filters
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
            
            return messages
            
        except Exception as e:
            logger.error(f"Failed to get messages for thread {thread_id}: {str(e)}", exc_info=True)
            raise

    async def get_messages_for_llm(self, thread_id: str) -> List[Dict[str, Any]]:
        """Retrieve messages suitable for sending to the LLM."""
        logger.debug(f"Retrieving LLM-suitable messages for thread {thread_id}")
        
        try:
            client = await self.db.client
            result = await client.table('messages') \
                .select('*') \
                .eq('thread_id', thread_id) \
                .eq('is_llm_message', True) \
                .order('created_at') \
                .execute()
            
            if not result.data:
                logger.warning(f"No LLM-suitable messages found for thread {thread_id}")
                return []
            
            # Convert from database format to LLM format
            messages = []
            for msg_record in result.data:
                content_obj = json.loads(msg_record['content'])
                
                # Create message in the format expected by the LLM API
                msg = {
                    'role': content_obj.get('role', 'unknown')
                }
                
                # Handle different content formats
                if 'text' in content_obj:
                    msg['content'] = content_obj['text']
                elif 'content' in content_obj:
                    msg['content'] = content_obj['content']
                else:
                    # Fallback
                    msg['content'] = ''
                
                # Include tool_calls if they exist
                if 'tool_calls' in content_obj:
                    msg['tool_calls'] = content_obj['tool_calls']
                
                messages.append(msg)
            
            logger.debug(f"Retrieved {len(messages)} LLM-suitable messages")
            return messages
            
        except Exception as e:
            logger.error(f"Failed to get LLM-suitable messages for thread {thread_id}: {str(e)}", exc_info=True)
            raise

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
            messages = await self.get_messages_for_llm(thread_id)
            
            # 2. Prepare messages for LLM call
            prepared_messages = [system_prompt]
            prepared_messages.extend(messages)
            
            # 3. Add temporary message if provided
            if temporary_message:
                prepared_messages.append(temporary_message)
                logger.debug("Added temporary message to prepared messages")

            # 4. Create or use processor config
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

            # 5. Prepare tools for LLM call
            openapi_tool_schemas = None
            if processor_config.native_tool_calling:
                openapi_tool_schemas = self.tool_registry.get_openapi_schemas()
                logger.debug(f"Retrieved {len(openapi_tool_schemas) if openapi_tool_schemas else 0} OpenAPI tool schemas")

            # 6. Make LLM API call
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

            # 7. Process LLM response using the ResponseProcessor
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