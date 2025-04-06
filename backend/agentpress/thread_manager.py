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

    async def add_message(
        self, 
        thread_id: str, 
        type: str, 
        content: Union[Dict[str, Any], List[Any], str], 
        is_llm_message: bool = False,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Add a message to the thread in the database.

        Args:
            thread_id: The ID of the thread to add the message to.
            type: The type of the message (e.g., 'text', 'image_url', 'tool_call').
            content: The content of the message. Can be a dictionary, list, or string.
                     It will be stored as JSONB in the database.
            is_llm_message: Flag indicating if the message originated from the LLM.
                            Defaults to False (user message).
            metadata: Optional dictionary for additional message metadata.
                      Defaults to None, stored as an empty JSONB object if None.
        """
        logger.debug(f"Adding message of type '{type}' to thread {thread_id}")
        client = await self.db.client
        
        # Prepare data for insertion
        data_to_insert = {
            'thread_id': thread_id,
            'type': type,
            'content': json.dumps(content) if isinstance(content, (dict, list)) else content,
            'is_llm_message': is_llm_message,
            'metadata': json.dumps(metadata or {}), # Ensure metadata is always a JSON object
        }
        
        try:
            result = await client.table('messages').insert(data_to_insert).execute()
            logger.info(f"Successfully added message to thread {thread_id}")
        except Exception as e:
            logger.error(f"Failed to add message to thread {thread_id}: {str(e)}", exc_info=True)
            raise

    async def get_messages(self, thread_id: str) -> List[Dict[str, Any]]:
        """Get all messages for a thread.
        
        Args:
            thread_id: The ID of the thread to get messages for.
            
        Returns:
            List of message objects.
        """
        logger.debug(f"Getting messages for thread {thread_id}")
        client = await self.db.client
        
        try:
            result = await client.rpc('get_llm_formatted_messages', {'p_thread_id': thread_id}).execute()
            
            # Parse the returned data which might be stringified JSON
            if not result.data:
                return []
                
            # Return properly parsed JSON objects
            messages = []
            for item in result.data:
                if isinstance(item, str):
                    try:
                        parsed_item = json.loads(item)
                        messages.append(parsed_item)
                    except json.JSONDecodeError:
                        logger.error(f"Failed to parse message: {item}")
                else:
                    messages.append(item)
                    
            return messages
            
        except Exception as e:
            logger.error(f"Failed to get messages for thread {thread_id}: {str(e)}", exc_info=True)
            return []

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

            # 5. Make LLM API call - removed agent run tracking
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
                response_generator = self.response_processor.process_streaming_response(
                    llm_response=llm_response,
                    thread_id=thread_id,
                    config=processor_config
                )
                
                # Return the generator directly without agent run updates
                return response_generator
            else:
                logger.info("Processing non-streaming response")
                try:
                    response = await self.response_processor.process_non_streaming_response(
                        llm_response=llm_response,
                        thread_id=thread_id,
                        config=processor_config
                    )
                    return response
                except Exception as e:
                    logger.error(f"Error in non-streaming response: {str(e)}", exc_info=True)
                    raise
          
        except Exception as e:
            logger.error(f"Error in run_thread: {str(e)}", exc_info=True)
            return {
                "status": "error",
                "message": str(e)
            }
