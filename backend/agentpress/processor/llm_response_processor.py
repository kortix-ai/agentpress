"""
Response processing system for handling LLM outputs and tool execution.

This module provides comprehensive processing of LLM responses, including:
- Parsing and validation of responses
- Tool execution management
- Message and result handling
- Support for both streaming and complete responses
"""

import asyncio
from typing import Callable, Dict, Any, AsyncGenerator, Optional, Awaitable
import logging
from agentpress.processor.base_processors import ToolParserBase, ToolExecutorBase, ResultsAdderBase
from agentpress.processor.standard.standard_tool_parser import StandardToolParser
from agentpress.processor.standard.standard_tool_executor import StandardToolExecutor
from agentpress.processor.standard.standard_results_adder import StandardResultsAdder
from backend.utils.logger import logger

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
        available_functions: Dict[str, Any],
        add_message_callback: Callable[[str, Dict[str, Any]], Awaitable[None]],
        update_message_callback: Callable[[str, Dict[str, Any]], Awaitable[None]],
        get_messages_callback: Callable[[str], Awaitable[list]],
        parallel_tool_execution: bool = False,
        tool_parser: Optional[ToolParserBase] = None,
        tool_executor: Optional[ToolExecutorBase] = None,
        results_adder: Optional[ResultsAdderBase] = None
    ):
        """Initialize the response processor.
        
        Args:
            thread_id: ID of the conversation thread
            available_functions: Dictionary of available tool functions
            add_message_callback: Callback for adding messages
            update_message_callback: Callback for updating messages
            get_messages_callback: Callback for listing messages
            parallel_tool_execution: Whether to execute tools in parallel
            tool_parser: Custom tool parser implementation
            tool_executor: Custom tool executor implementation
            results_adder: Custom results adder implementation
        """
        logger.debug(f"Initializing LLMResponseProcessor for thread {thread_id}")
        self.thread_id = thread_id
        self.tool_executor = tool_executor or StandardToolExecutor(parallel=parallel_tool_execution)
        self.tool_parser = tool_parser or StandardToolParser()
        self.available_functions = available_functions
        self.add_message_callback = add_message_callback
        self.update_message_callback = update_message_callback
        self.get_messages_callback = get_messages_callback
        self.parallel_tool_execution = parallel_tool_execution
        self.results_adder = results_adder or StandardResultsAdder()
        
        # State tracking for streaming
        self.tool_calls_buffer = {}
        self.processed_tool_calls = set()
        self.content_buffer = ""
        self.tool_calls_accumulated = []
        logger.debug(f"Available functions: {list(available_functions.keys())}")

    async def process_stream(
        self,
        response_stream: AsyncGenerator[Dict[str, Any], None],
        execute_tools: bool = True,
        execute_tools_on_stream: bool = False
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Process streaming LLM response and handle tool execution."""
        logger.info(f"Processing streaming response for thread {self.thread_id}")
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

    async def process_response(self, response: Dict[str, Any], execute_tools: bool = True) -> None:
        """Process complete LLM response and execute tools."""
        logger.info(f"Processing non-streaming response for thread {self.thread_id}")
        try:
            if 'tool_calls' in response:
                logger.debug(f"Found {len(response['tool_calls'])} tool calls in response")
                if execute_tools:
                    await self._execute_tool_calls(response)
                else:
                    logger.info("Tool execution disabled, skipping tool calls")
            else:
                logger.debug("No tool calls found in response")
                await self.add_message_callback(self.thread_id, response)
        except Exception as e:
            logger.error(f"Error processing response: {str(e)}", exc_info=True)
            raise

    async def _execute_tool_calls(self, response: Dict[str, Any]) -> None:
        """Execute tool calls from the response."""
        logger.info(f"Executing tool calls for thread {self.thread_id}")
        try:
            if not self.tool_parser or not self.tool_executor or not self.results_adder:
                logger.error("Missing required tool processing components")
                raise ValueError("Missing required tool processing components")

            # Parse tool calls
            logger.debug("Parsing tool calls")
            tool_calls = self.tool_parser.parse_tool_calls(response)
            logger.debug(f"Parsed {len(tool_calls)} tool calls")

            # Execute tool calls
            logger.info("Executing tool calls")
            tool_results = await self.tool_executor.execute_tool_calls(tool_calls)
            logger.debug(f"Tool execution completed: {len(tool_results)} results")

            # Add results to thread
            logger.info("Adding tool results to thread")
            await self.results_adder.add_results(self.thread_id, tool_results)
            logger.debug("Successfully added tool results")

        except Exception as e:
            logger.error(f"Error executing tool calls: {str(e)}", exc_info=True)
            raise
