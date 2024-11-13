import logging
from typing import Dict, Any, AsyncGenerator, Callable
from agentpress.tool_parser import ToolParser
from agentpress.tool_executor import ToolExecutor
import asyncio
import os
import json

class LLMResponseProcessor:
    """
    Handles LLM response processing and tool execution management.
    
    This class manages both streaming and non-streaming responses from Language Models,
    coordinating tool execution timing and order. It maintains message state and handles
    the execution of tool calls either immediately or after collecting a complete response,
    with support for both parallel and sequential execution patterns.
    
    Attributes:
        thread_id (str): Identifier for the conversation thread
        tool_executor (ToolExecutor): Executor for handling tool calls
        tool_parser (ToolParser): Parser for processing LLM responses
        available_functions (Dict): Registry of available tool functions
        add_message (Callable): Callback to add messages to the thread
        update_message (Callable): Callback to update existing messages
        parallel_tool_execution (bool): Whether to execute tools in parallel or sequentially
        tool_calls_buffer (Dict): Buffer for storing incomplete tool calls during streaming
        processed_tool_calls (set): Set of already processed tool call IDs
        current_message (Dict): Current message being processed in streaming mode
        content_buffer (str): Buffer for accumulating content during streaming
        tool_calls_accumulated (list): List of tool calls accumulated during streaming
        message_added (bool): Flag to indicate if a message has been added to the thread
    """
    
    def __init__(
        self,
        thread_id: str,
        tool_executor: ToolExecutor,
        tool_parser: ToolParser,
        available_functions: Dict,
        add_message_callback: Callable,
        update_message_callback: Callable
    ):
        self.thread_id = thread_id
        self.tool_executor = tool_executor
        self.tool_parser = tool_parser
        self.available_functions = available_functions
        self.add_message = add_message_callback
        self.update_message = update_message_callback
        
        # State tracking for streaming responses
        self.tool_calls_buffer = {}
        self.processed_tool_calls = set()
        self.content_buffer = ""
        self.tool_calls_accumulated = []
        self.message_added = False

    async def process_stream(
        self,
        response_stream: AsyncGenerator,
        execute_tools: bool = True,
        immediate_execution: bool = True 
    ) -> AsyncGenerator:
        """
        Process streaming LLM response and handle tool execution.
        Yields chunks immediately while managing message state and tool execution efficiently.
        """
        pending_tool_calls = []
        background_tasks = set()
        last_update_time = 0
        UPDATE_INTERVAL = 0.5  # Minimum seconds between message updates
        tool_results = []  # Track tool results

        async def handle_message_management(chunk):
            try:
                nonlocal last_update_time, tool_results
                current_time = asyncio.get_event_loop().time()

                # Accumulate content
                if hasattr(chunk.choices[0].delta, 'content') and chunk.choices[0].delta.content:
                    self.content_buffer += chunk.choices[0].delta.content
                
                # Parse tool calls only if present in chunk
                if hasattr(chunk.choices[0].delta, 'tool_calls'):
                    parsed_message, is_complete = await self.tool_parser.parse_stream(
                        chunk, 
                        self.tool_calls_buffer
                    )
                    if parsed_message and 'tool_calls' in parsed_message:
                        self.tool_calls_accumulated = parsed_message['tool_calls']

                # Handle tool execution and results
                if execute_tools and self.tool_calls_accumulated:
                    new_tool_calls = [
                        tool_call for tool_call in self.tool_calls_accumulated
                        if tool_call['id'] not in self.processed_tool_calls
                    ]

                    if new_tool_calls and immediate_execution:
                        results = await self.tool_executor.execute_tool_calls(
                            tool_calls=new_tool_calls,
                            available_functions=self.available_functions,
                            thread_id=self.thread_id,
                            executed_tool_calls=self.processed_tool_calls
                        )
                        tool_results.extend(results)
                        for result in results:
                            self.processed_tool_calls.add(result['tool_call_id'])
                    elif new_tool_calls:
                        pending_tool_calls.extend(new_tool_calls)

                # Update message state with rate limiting
                should_update = (
                    chunk.choices[0].finish_reason or 
                    (current_time - last_update_time) >= UPDATE_INTERVAL
                )

                if should_update:
                    # First, add tool results if any
                    for result in tool_results:
                        if not any(msg.get('tool_call_id') == result['tool_call_id'] 
                                 for msg in await self.list_messages(self.thread_id)):
                            await self.add_message(self.thread_id, result)
                    tool_results = []  # Clear processed results

                    # Then add/update assistant message
                    message = {
                        "role": "assistant",
                        "content": self.content_buffer
                    }
                    if self.tool_calls_accumulated:
                        message["tool_calls"] = self.tool_calls_accumulated

                    if not self.message_added:
                        await self.add_message(self.thread_id, message)
                        self.message_added = True
                    else:
                        await self.update_message(self.thread_id, message)
                    last_update_time = current_time

                # Handle stream completion
                if chunk.choices[0].finish_reason:
                    if not immediate_execution and pending_tool_calls:
                        results = await self.tool_executor.execute_tool_calls(
                            tool_calls=pending_tool_calls,
                            available_functions=self.available_functions,
                            thread_id=self.thread_id,
                            executed_tool_calls=self.processed_tool_calls
                        )
                        for result in results:
                            await self.add_message(self.thread_id, result)
                            self.processed_tool_calls.add(result['tool_call_id'])
                        pending_tool_calls.clear()

            except Exception as e:
                logging.error(f"Error in background task: {e}")
                return

        try:
            async for chunk in response_stream:
                # Create and track background task
                task = asyncio.create_task(handle_message_management(chunk))
                background_tasks.add(task)
                task.add_done_callback(background_tasks.discard)
                
                # Immediately yield the chunk
                yield chunk

            # Wait for all background tasks to complete
            if background_tasks:
                await asyncio.gather(*background_tasks, return_exceptions=True)
                
        except Exception as e:
            logging.error(f"Error in stream processing: {e}")
            # Clean up any remaining background tasks
            for task in background_tasks:
                if not task.done():
                    task.cancel()
            raise

    async def process_response(
        self,
        response: Any,
        execute_tools: bool = True
    ) -> None:
        """
        Process complete LLM response and execute tools.
        
        Handles non-streaming responses, parsing the complete response and
        executing any tool calls according to the configured execution strategy.
        
        Args:
            response: Complete response from the LLM
            execute_tools: Whether to execute identified tool calls
        """
        try:
            assistant_message = await self.tool_parser.parse_response(response)
            await self.add_message(self.thread_id, assistant_message)

            if execute_tools and 'tool_calls' in assistant_message and assistant_message['tool_calls']:
                results = await self.tool_executor.execute_tool_calls(
                    tool_calls=assistant_message['tool_calls'],
                    available_functions=self.available_functions,
                    thread_id=self.thread_id,
                    executed_tool_calls=self.processed_tool_calls
                )
                
                for result in results:
                    await self.add_message(self.thread_id, result)
                    logging.info(f"Tool execution result: {result}")
        
        except Exception as e:
            logging.error(f"Error processing response: {e}")
            response_content = response.choices[0].message.get('content', '')
            await self.add_message(self.thread_id, {
                "role": "assistant", 
                "content": response_content or ""
            })

    async def list_messages(self, thread_id: str) -> list:
        """Helper method to get current messages in thread"""
        thread_path = os.path.join(self.threads_dir, f"{thread_id}.json")
        try:
            with open(thread_path, 'r') as f:
                thread_data = json.load(f)
            return thread_data.get("messages", [])
        except Exception:
            return []