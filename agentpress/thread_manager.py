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
from agentpress.llm import make_llm_api_call
from agentpress.tool import Tool, ToolResult
from agentpress.tool_registry import ToolRegistry
from agentpress.processor.llm_response_processor import LLMResponseProcessor
from agentpress.db_connection import DBConnection

from agentpress.processor.standard.standard_tool_parser import StandardToolParser
from agentpress.processor.standard.standard_tool_executor import StandardToolExecutor
from agentpress.processor.standard.standard_results_adder import StandardResultsAdder
from agentpress.processor.xml.xml_tool_parser import XMLToolParser
from agentpress.processor.xml.xml_tool_executor import XMLToolExecutor
from agentpress.processor.xml.xml_results_adder import XMLResultsAdder

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
        thread_id = str(uuid.uuid4())
        await self.db.execute(
            "INSERT INTO threads (id) VALUES ($1)",
            (thread_id,)
        )
        return thread_id

    async def add_message(
        self, 
        thread_id: str, 
        message_data: Union[str, Dict[str, Any]], 
        images: Optional[List[Dict[str, Any]]] = None,
        include_in_llm_message_history: bool = True,
        message_type: Optional[str] = None
    ):
        """Add a message to an existing thread."""
        logging.info(f"Adding message to thread {thread_id}")
        
        try:
            message_id = str(uuid.uuid4())
            
            # Handle string content
            if isinstance(message_data, str):
                content = message_data
                role = 'unknown'
                
                # Determine message type only for LLM-related messages if not provided
                if message_type is None:
                    type_mapping = {
                        'user': 'user_message',
                        'assistant': 'assistant_message',
                        'tool': 'tool_message',
                        'system': 'system_message'
                    }
                    message_type = type_mapping.get(role, 'unknown_message')
                    
            else:
                # For dict message_data, check if it's an LLM message format
                if 'role' in message_data and 'content' in message_data:
                    content = message_data.get('content', '')
                    role = message_data.get('role', 'unknown')
                    
                    # Determine message type for LLM messages if not provided
                    if message_type is None:
                        type_mapping = {
                            'user': 'user_message',
                            'assistant': 'assistant_message',
                            'tool': 'tool_message',
                            'system': 'system_message'
                        }
                        message_type = type_mapping.get(role, 'unknown_message')
                else:
                    # For non-LLM messages, use the entire message_data as content
                    content = message_data

            # Handle content processing
            if isinstance(content, ToolResult):
                content = str(content)
            
            # Handle image attachments
            if images:
                if isinstance(content, str):
                    content = [{"type": "text", "text": content}]
                elif not isinstance(content, list):
                    content = []

                for image in images:
                    image_content = {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{image['content_type']};base64,{image['base64']}",
                            "detail": "high"
                        }
                    }
                    content.append(image_content)

            # Convert content to JSON string if it's a dict or list
            if isinstance(content, (dict, list)):
                content = json.dumps(content)
            
            # Insert the message
            await self.db.execute(
                """
                INSERT INTO messages (
                    id, thread_id, type, content, include_in_llm_message_history
                ) VALUES ($1, $2, $3, $4, $5)
                """,
                (message_id, thread_id, message_type, content, include_in_llm_message_history)
            )

            logging.info(f"Message added to thread {thread_id}")
            
        except Exception as e:
            logging.error(f"Failed to add message to thread {thread_id}: {e}")
            raise

    async def get_llm_history_messages(
        self, 
        thread_id: str,
        hide_tool_msgs: bool = False,
        only_latest_assistant: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve messages from a thread that are marked for LLM history.
        
        Args:
            thread_id: The thread to get messages from
            hide_tool_msgs: Whether to hide tool messages
            only_latest_assistant: Whether to only return the latest assistant message
            
        Returns:
            List of messages formatted for LLM context
        """
        
        # Get only messages marked for LLM history
        rows = await self.db.fetch_all(
            """
            SELECT type, content 
            FROM messages 
            WHERE thread_id = $1 
            AND include_in_llm_message_history = TRUE
            ORDER BY created_at ASC
            """,
            (thread_id,)
        )
        
        # Convert DB rows to message format
        messages = []
        type_to_role = {
            'user_message': 'user',
            'assistant_message': 'assistant',
            'tool_message': 'tool',
            'system_message': 'system'
        }
        
        for row in rows:
            msg_type, content = row
            
            # Try to parse JSON content
            try:
                content = json.loads(content)
            except (json.JSONDecodeError, TypeError):
                pass  # Keep content as is if it's not JSON
                
            message = {
                'role': type_to_role.get(msg_type, 'unknown'),
                'content': content
            }
            messages.append(message)
        
        # Apply filters
        if only_latest_assistant:
            for msg in reversed(messages):
                if msg.get('role') == 'assistant':
                    return [msg]
            return []
        
        if hide_tool_msgs:
            messages = [
                {k: v for k, v in msg.items() if k != 'tool_calls'}
                for msg in messages
                if msg.get('role') != 'tool'
            ]
        
        
        return messages

    async def _update_message(self, thread_id: str, message: Dict[str, Any]):
        """Update an existing message in the thread."""
        try:
            # Find the latest assistant message for this thread
            row = await self.db.fetch_one(
                """
                SELECT id FROM messages 
                WHERE thread_id = $1 AND type = 'assistant_message'
                ORDER BY created_at DESC LIMIT 1
                """,
                (thread_id,)
            )
            
            if not row:
                return
            
            message_id = row[0]
            
            # Convert content to JSON string if needed
            content = message.get('content', '')
            if isinstance(content, (dict, list)):
                content = json.dumps(content)
            
            # Update the message - Fixed parameter passing
            await self.db.execute(
                """
                UPDATE messages 
                SET content = $1, updated_at = CURRENT_TIMESTAMP 
                WHERE id = $2
                """,
                (content, message_id)
            )
                
        except Exception as e:
            logging.error(f"Failed to update message: {e}")
            raise

    async def cleanup_incomplete_tool_calls(self, thread_id: str):
        """Clean up incomplete tool calls in a thread."""
        messages = await self.get_llm_history_messages(thread_id)
        last_assistant_message = next((m for m in reversed(messages) 
            if m['role'] == 'assistant' and 'tool_calls' in m), None)

        if last_assistant_message:
            tool_calls = last_assistant_message.get('tool_calls', [])
            tool_responses = [m for m in messages[messages.index(last_assistant_message)+1:] 
                            if m['role'] == 'tool']

            if len(tool_calls) != len(tool_responses):
                failed_tool_results = []
                for tool_call in tool_calls[len(tool_responses):]:
                    failed_tool_result = {
                        "role": "tool",
                        "tool_call_id": tool_call['id'],
                        "name": tool_call['function']['name'],
                        "content": "ToolResult(success=False, output='Execution interrupted. Session was stopped.')"
                    }
                    failed_tool_results.append(failed_tool_result)

                # Add failed tool results as new messages instead of updating threads table
                for result in failed_tool_results:
                    await self.add_message(
                        thread_id=thread_id,
                        message_data=result,
                        message_type="tool_message",
                        include_in_llm_message_history=True
                    )
                return True
        return False

    async def run_thread(
        self,
        thread_id: str,
        system_message: Dict[str, str],
        model_name: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        tool_choice: str = "auto",
        temporary_message: Optional[Dict[str, str]] = None,
        native_tool_calling: bool = True,
        xml_tool_calling: bool = False,
        stream: bool = False,
        execute_tools: bool = True,
        execute_tools_on_stream: bool = True,
        parallel_tool_execution: bool = True,
        stop: Optional[Union[str, List[str]]] = None
    ) -> Union[Dict[str, Any], AsyncGenerator]:
        """Run a conversation thread with specified parameters.
        
        Args:
            thread_id: ID of the thread to run
            system_message: System message for the conversation
            model_name: Name of the LLM model to use
            temperature: Model temperature (0-1)
            max_tokens: Maximum tokens in response
            tool_choice: Tool selection strategy ("auto" or "none")
            temporary_message: Optional message to include temporarily
            native_tool_calling: Whether to use native LLM function calling
            xml_tool_calling: Whether to use XML-based tool calling
            execute_tools: Whether to execute tool calls
            stream: Whether to stream the response
            execute_tools_on_stream: Whether to execute tools during streaming
            parallel_tool_execution: Whether to execute tools in parallel
            stop (Union[str, List[str]], optional): Up to 4 sequences where the API will stop generating tokens
            
        Returns:
            Union[Dict[str, Any], AsyncGenerator]: Response or stream
            
        Raises:
            ValueError: If incompatible tool calling options are specified
            Exception: For other execution failures
            
        Notes:
            - Cannot use both native and XML tool calling simultaneously
            - Streaming responses include both content and tool results
        """
        try:
            # Add thread run start message
            await self.add_message(
                thread_id=thread_id,
                message_data={
                    "name": "thread_run",                    
                    "status": "started",
                    "details": {
                        "model": model_name,
                        "temperature": temperature,
                        "native_tool_calling": native_tool_calling,
                        "xml_tool_calling": xml_tool_calling,
                        "execute_tools": execute_tools,
                        "stream": stream
                    }
                },
                message_type="agentpress_system",
                include_in_llm_message_history=False
            )

            try:
                messages = await self.get_llm_history_messages(thread_id)
                prepared_messages = [system_message] + messages
                if temporary_message:
                    prepared_messages.append(temporary_message)

                openapi_tool_schemas = None
                if native_tool_calling:
                    openapi_tool_schemas = self.tool_registry.get_openapi_schemas()
                    available_functions = self.tool_registry.get_available_functions()
                elif xml_tool_calling:
                    available_functions = self.tool_registry.get_available_functions()
                else:
                    available_functions = {}

                # Initialize appropriate tool parser and executor based on calling type
                if xml_tool_calling:
                    tool_parser = XMLToolParser(tool_registry=self.tool_registry)
                    tool_executor = XMLToolExecutor(parallel=parallel_tool_execution, tool_registry=self.tool_registry)
                    results_adder = XMLResultsAdder(self)
                else:
                    tool_parser = StandardToolParser()
                    tool_executor = StandardToolExecutor(parallel=parallel_tool_execution)
                    results_adder = StandardResultsAdder(self)

                # Create a SINGLE response processor instance
                response_processor = LLMResponseProcessor(
                    thread_id=thread_id,
                    tool_executor=tool_executor,
                    tool_parser=tool_parser,
                    available_functions=available_functions,
                    results_adder=results_adder
                )

                response = await self._run_thread_completion(
                    messages=prepared_messages,
                    model_name=model_name,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    tools=openapi_tool_schemas,
                    tool_choice=tool_choice if native_tool_calling else None,
                    stream=stream,
                    stop=stop
                )

                if stream:
                    async def stream_with_completion():
                        processor = response_processor.process_stream(
                            response_stream=response,
                            execute_tools=execute_tools,
                            execute_tools_on_stream=execute_tools_on_stream
                        )
                        
                        final_state = None
                        async for chunk in processor:
                            yield chunk
                            if hasattr(chunk, '_final_state'):
                                final_state = chunk._final_state

                        # Add completion message after stream ends
                        completion_message = {
                            "name": "thread_run",
                            "status": "completed",
                            "details": {
                                "model": model_name,
                                "temperature": temperature,
                                "native_tool_calling": native_tool_calling,
                                "xml_tool_calling": xml_tool_calling,
                                "execute_tools": execute_tools,
                                "stream": stream
                            }
                        }

                        # TODO: Add usage, cost information – from final llm response

                        # # Add usage information from final state
                        # if final_state and 'usage' in final_state:
                        #     completion_message["usage"] = final_state["usage"]
                        # elif hasattr(response, 'cost_tracker'):
                        #     completion_message["usage"] = {
                        #         "prompt_tokens": response.cost_tracker['prompt_tokens'],
                        #         "completion_tokens": response.cost_tracker['completion_tokens'],
                        #         "total_tokens": response.cost_tracker['total_tokens'],
                        #         "cost_usd": response.cost_tracker['cost']
                        #     }

                        await self.add_message(
                            thread_id=thread_id,
                            message_data=completion_message,
                            message_type="agentpress_system",
                            include_in_llm_message_history=False
                        )

                    return stream_with_completion()

                # For non-streaming, process response once
                await response_processor.process_response(
                    response=response,
                    execute_tools=execute_tools
                )

                # Add completion message on success with cost information
                completion_message = {
                    "name": "thread_run",
                    "status": "completed",
                    "details": {
                        "model": model_name,
                        "temperature": temperature,
                        "native_tool_calling": native_tool_calling,
                        "xml_tool_calling": xml_tool_calling,
                        "execute_tools": execute_tools,
                        "stream": stream
                    }
                }

                # TODO: Add usage, cost information – from final llm response 
                
                # # Add cost information if available
                # if hasattr(response, 'cost'):
                #     completion_message["usage"] = {
                #         "cost_usd": response.cost
                #     }
                # if hasattr(response, 'usage'):
                #     if "usage" not in completion_message:
                #         completion_message["usage"] = {}
                #     completion_message["usage"].update({
                #         "prompt_tokens": response.usage.prompt_tokens,
                #         "completion_tokens": response.usage.completion_tokens,
                #         "total_tokens": response.usage.total_tokens
                #     })

                await self.add_message(
                    thread_id=thread_id,
                    message_data=completion_message,
                    message_type="agentpress_system",
                    include_in_llm_message_history=False
                )

                return response

            except Exception as e:
                # Add error message if something goes wrong

                # TODO: FIX THAT THREAD RUN CATCHES ERRORS FROM LLM.PY from RUN_THREAD_COMPLETION & CORRECTLY ADD ERROR MESSAGE TO THREAD

                await self.add_message(
                    thread_id=thread_id,
                    message_data={
                        "name": "thread_run",                                    
                        "status": "error",
                        "error": str(e),
                        "details": {
                            "error_type": type(e).__name__
                        }
                    },
                    message_type="agentpress_system",
                    include_in_llm_message_history=False
                )
                raise

        except Exception as e:
            logging.error(f"Error in run_thread: {str(e)}")
            return {
                "status": "error",
                "message": str(e)
            }

    async def _run_thread_completion(
        self,
        messages: List[Dict[str, Any]],
        model_name: str,
        temperature: float,
        max_tokens: Optional[int],
        tools: Optional[List[Dict[str, Any]]],
        tool_choice: Optional[str],
        stream: bool,
        stop: Optional[Union[str, List[str]]] = None
    ) -> Union[Dict[str, Any], AsyncGenerator]:
        """Get completion from LLM API."""
        response = await make_llm_api_call(
            messages,
            model_name,
            temperature=temperature,
            max_tokens=max_tokens,
            tools=tools,
            tool_choice=tool_choice,
            stream=stream,
            stop=stop
        )

        # For streaming responses, wrap in a cost-tracking generator
        if stream:
            async def cost_tracking_stream():
                try:
                    async for chunk in response:
                        # Update token counts if available
                        if hasattr(chunk, 'usage'):
                            response.cost_tracker['prompt_tokens'] = chunk.usage.prompt_tokens
                            response.cost_tracker['completion_tokens'] = chunk.usage.completion_tokens
                            response.cost_tracker['total_tokens'] = chunk.usage.total_tokens
                            
                            # Calculate running cost
                            input_cost = response.model_info['input_cost_per_token']
                            output_cost = response.model_info['output_cost_per_token']
                            
                            cost = (response.cost_tracker['prompt_tokens'] * input_cost +
                                   response.cost_tracker['completion_tokens'] * output_cost)
                            response.cost_tracker['cost'] = cost

                        # Attach cost tracker to the chunk for final state
                        if hasattr(chunk, '_final_state'):
                            chunk._final_state['usage'] = {
                                "prompt_tokens": response.cost_tracker['prompt_tokens'],
                                "completion_tokens": response.cost_tracker['completion_tokens'],
                                "total_tokens": response.cost_tracker['total_tokens'],
                                "cost_usd": response.cost_tracker['cost']
                            }
                        yield chunk
                except Exception as e:
                    logging.error(f"Error in cost tracking stream: {e}")
                    raise

            return cost_tracking_stream()

        return response

    async def get_messages(
        self,
        thread_id: str,
        message_types: Optional[List[str]] = None,
        limit: Optional[int] = 50,  # Default limit of 50 messages
        offset: Optional[int] = 0,  # Starting offset for pagination
        before_timestamp: Optional[str] = None,
        after_timestamp: Optional[str] = None,
        include_in_llm_message_history: Optional[bool] = None,
        order: str = "asc"
    ) -> Dict[str, Any]:
        """
        Retrieve messages from a thread with optional filtering and pagination.
        
        Args:
            thread_id: The thread to get messages from
            message_types: Optional list of message types to filter by
            limit: Maximum number of messages to return (default: 50)
            offset: Number of messages to skip (for pagination)
            before_timestamp: Optional timestamp to filter messages before
            after_timestamp: Optional timestamp to filter messages after
            include_in_llm_message_history: Optional bool to filter messages by LLM history inclusion
            order: Sort order - "asc" or "desc"
            
        Returns:
            Dict containing messages list and pagination info
        """
        try:
            # Build the base query for total count
            count_query = """
                SELECT COUNT(*) 
                FROM messages 
                WHERE thread_id = $1
            """
            count_params = [thread_id]

            # Build the base query for messages
            query = """
                SELECT id, type, content, created_at, updated_at, include_in_llm_message_history
                FROM messages 
                WHERE thread_id = $1
            """
            params = [thread_id]

            # Add filters to both queries
            if message_types:
                placeholders = ','.join('$' + str(i+2) for i in range(len(message_types)))
                filter_sql = f" AND type IN ({placeholders})"
                query += filter_sql
                count_query += filter_sql
                params.extend(message_types)
                count_params.extend(message_types)
                
            if before_timestamp:
                query += " AND created_at < $" + str(len(params)+1)
                count_query += " AND created_at < $" + str(len(params)+1)
                params.append(before_timestamp)
                count_params.append(before_timestamp)
                
            if after_timestamp:
                query += " AND created_at > $" + str(len(params)+1)
                count_query += " AND created_at > $" + str(len(params)+1)
                params.append(after_timestamp)
                count_params.append(after_timestamp)

            if include_in_llm_message_history is not None:
                query += " AND include_in_llm_message_history = $" + str(len(params)+1)
                count_query += " AND include_in_llm_message_history = $" + str(len(params)+1)
                params.append(include_in_llm_message_history)
                count_params.append(include_in_llm_message_history)

            # Get total count for pagination
            total_count = await self.db.fetch_one(count_query, tuple(count_params))
            total_count = total_count[0] if total_count else 0

            # Add ordering and pagination
            query += f" ORDER BY created_at {'ASC' if order.lower() == 'asc' else 'DESC'}"
            query += " LIMIT $" + str(len(params)+1) + " OFFSET $" + str(len(params)+2)
            params.extend([limit, offset])

            # Execute query
            rows = await self.db.fetch_all(query, tuple(params))

            # Convert rows to dictionaries
            messages = []
            for row in rows:
                message = {
                    'id': row[0],
                    'type': row[1],
                    'content': row[2],
                    'created_at': row[3],
                    'updated_at': row[4],
                    'include_in_llm_message_history': bool(row[5])
                }

                # Try to parse JSON content
                try:
                    message['content'] = json.loads(message['content'])
                except (json.JSONDecodeError, TypeError):
                    pass  # Keep content as is if it's not JSON

                messages.append(message)

            # Return messages with pagination info
            return {
                "messages": messages,
                "pagination": {
                    "total": total_count,
                    "limit": limit,
                    "offset": offset,
                    "has_more": (offset + limit) < total_count
                }
            }

        except Exception as e:
            logging.error(f"Failed to get messages from thread {thread_id}: {e}")
            raise

    async def thread_exists(self, thread_id: str) -> bool:
        """
        Check if a thread exists.
        
        Args:
            thread_id: The ID of the thread to check
            
        Returns:
            bool: True if thread exists, False otherwise
        """
        try:
            row = await self.db.fetch_one(
                "SELECT 1 FROM threads WHERE id = $1",
                (thread_id,)
            )
            return row is not None
        except Exception as e:
            logging.error(f"Error checking thread existence: {e}")
            return False
