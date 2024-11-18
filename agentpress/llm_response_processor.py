"""
Response processing system for handling LLM outputs and tool execution.

This module provides comprehensive processing of LLM responses, including:
- Parsing and validation of responses
- Tool execution management
- Message and result handling
- Support for both streaming and complete responses
"""

import asyncio
from typing import Callable, Dict, Any, AsyncGenerator, Optional
import logging
from agentpress.base_processors import ToolParserBase, ToolExecutorBase, ResultsAdderBase
from agentpress.standard_tool_parser import StandardToolParser
from agentpress.standard_tool_executor import StandardToolExecutor
from agentpress.standard_results_adder import StandardResultsAdder

class LLMResponseProcessor:
    """Handles LLM response processing and tool execution management.
    
    Coordinates the parsing of LLM responses, execution of tools, and management
    of results, supporting both streaming and complete response patterns.
    
    Attributes:
        thread_id (str): ID of the current conversation thread
        tool_executor (ToolExecutorBase): Strategy for executing tools
        tool_parser (ToolParserBase): Strategy for parsing responses
        available_functions (Dict): Available tool functions
        results_adder (ResultsAdderBase): Strategy for adding results
        
    Methods:
        process_stream: Handle streaming LLM responses
        process_response: Handle complete LLM responses
    """
    
    def __init__(
        self,
        thread_id: str,
        available_functions: Dict = None,
        add_message_callback: Callable = None,
        update_message_callback: Callable = None,
        list_messages_callback: Callable = None,
        parallel_tool_execution: bool = True,
        threads_dir: str = "threads",
        tool_parser: Optional[ToolParserBase] = None,
        tool_executor: Optional[ToolExecutorBase] = None,
        results_adder: Optional[ResultsAdderBase] = None,
        thread_manager = None
    ):
        """Initialize the response processor.
        
        Args:
            thread_id: ID of the conversation thread
            available_functions: Dictionary of available tool functions
            add_message_callback: Callback for adding messages
            update_message_callback: Callback for updating messages
            list_messages_callback: Callback for listing messages
            parallel_tool_execution: Whether to execute tools in parallel
            threads_dir: Directory for thread storage
            tool_parser: Custom tool parser implementation
            tool_executor: Custom tool executor implementation
            results_adder: Custom results adder implementation
            thread_manager: Optional thread manager instance
        """
        self.thread_id = thread_id
        self.tool_executor = tool_executor or StandardToolExecutor(parallel=parallel_tool_execution)
        self.tool_parser = tool_parser or StandardToolParser()
        self.available_functions = available_functions or {}
        self.threads_dir = threads_dir
        
        # Create minimal thread manager if needed
        if thread_manager is None and (add_message_callback and update_message_callback and list_messages_callback):
            class MinimalThreadManager:
                def __init__(self, add_msg, update_msg, list_msg):
                    self.add_message = add_msg
                    self._update_message = update_msg
                    self.list_messages = list_msg
            thread_manager = MinimalThreadManager(add_message_callback, update_message_callback, list_messages_callback)
        
        self.results_adder = results_adder or StandardResultsAdder(thread_manager)
        
        # State tracking for streaming
        self.tool_calls_buffer = {}
        self.processed_tool_calls = set()
        self.content_buffer = ""
        self.tool_calls_accumulated = []

    async def process_stream(
        self,
        response_stream: AsyncGenerator,
        execute_tools: bool = True,
        execute_tools_on_stream: bool = True 
    ) -> AsyncGenerator:
        """Process streaming LLM response and handle tool execution."""
        pending_tool_calls = []
        background_tasks = set()

        async def handle_message_management(chunk):
            try:
                # Accumulate content
                if hasattr(chunk.choices[0].delta, 'content') and chunk.choices[0].delta.content:
                    self.content_buffer += chunk.choices[0].delta.content
                
                # Parse tool calls if present
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

                    if new_tool_calls:
                        if execute_tools_on_stream:
                            results = await self.tool_executor.execute_tool_calls(
                                tool_calls=new_tool_calls,
                                available_functions=self.available_functions,
                                thread_id=self.thread_id,
                                executed_tool_calls=self.processed_tool_calls
                            )
                            for result in results:
                                await self.results_adder.add_tool_result(self.thread_id, result)
                                self.processed_tool_calls.add(result['tool_call_id'])
                        else:
                            pending_tool_calls.extend(new_tool_calls)

                # Add/update assistant message
                message = {
                    "role": "assistant",
                    "content": self.content_buffer
                }
                if self.tool_calls_accumulated:
                    message["tool_calls"] = self.tool_calls_accumulated

                if not hasattr(self, '_message_added'):
                    await self.results_adder.add_initial_response(
                        self.thread_id,
                        self.content_buffer,
                        self.tool_calls_accumulated
                    )
                    self._message_added = True
                else:
                    await self.results_adder.update_response(
                        self.thread_id,
                        self.content_buffer,
                        self.tool_calls_accumulated
                    )

                # Handle stream completion
                if chunk.choices[0].finish_reason:
                    if not execute_tools_on_stream and pending_tool_calls:
                        results = await self.tool_executor.execute_tool_calls(
                            tool_calls=pending_tool_calls,
                            available_functions=self.available_functions,
                            thread_id=self.thread_id,
                            executed_tool_calls=self.processed_tool_calls
                        )
                        for result in results:
                            await self.results_adder.add_tool_result(self.thread_id, result)
                            self.processed_tool_calls.add(result['tool_call_id'])
                        pending_tool_calls.clear()

            except Exception as e:
                logging.error(f"Error in background task: {e}")

        try:
            async for chunk in response_stream:
                task = asyncio.create_task(handle_message_management(chunk))
                background_tasks.add(task)
                task.add_done_callback(background_tasks.discard)
                yield chunk

            if background_tasks:
                await asyncio.gather(*background_tasks, return_exceptions=True)
                
        except Exception as e:
            logging.error(f"Error in stream processing: {e}")
            for task in background_tasks:
                if not task.done():
                    task.cancel()
            raise

    async def process_response(self, response: Any, execute_tools: bool = True) -> None:
        """Process complete LLM response and execute tools."""
        try:
            assistant_message = await self.tool_parser.parse_response(response)
            await self.results_adder.add_initial_response(
                self.thread_id,
                assistant_message['content'],
                assistant_message.get('tool_calls')
            )

            if execute_tools and 'tool_calls' in assistant_message and assistant_message['tool_calls']:
                results = await self.tool_executor.execute_tool_calls(
                    tool_calls=assistant_message['tool_calls'],
                    available_functions=self.available_functions,
                    thread_id=self.thread_id,
                    executed_tool_calls=self.processed_tool_calls
                )
                
                for result in results:
                    await self.results_adder.add_tool_result(self.thread_id, result)
                    logging.info(f"Tool execution result: {result}")
        
        except Exception as e:
            logging.error(f"Error processing response: {e}")
            response_content = response.choices[0].message.get('content', '')
            await self.results_adder.add_initial_response(self.thread_id, response_content)
