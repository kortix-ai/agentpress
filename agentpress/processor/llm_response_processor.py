"""
Response processing system for handling LLM outputs and tool execution.

This module provides comprehensive processing of LLM responses, including:
- Parsing and validation of responses
- Tool execution management
- Message and result handling
- Support for both streaming and complete responses
"""

import asyncio
from typing import Dict, Any, AsyncGenerator
import logging
from agentpress.processor.base_processors import ToolParserBase, ToolExecutorBase, ResultsAdderBase

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
        tool_executor: ToolExecutorBase,
        tool_parser: ToolParserBase,
        available_functions: Dict,
        results_adder: ResultsAdderBase
    ):
        """Initialize the response processor.
        
        Args:
            thread_id: ID of the conversation thread
            tool_executor: Custom tool executor implementation
            tool_parser: Custom tool parser implementation
            available_functions: Dictionary of available tool functions
            results_adder: Custom results adder implementation
        """
        self.thread_id = thread_id
        self.tool_executor = tool_executor
        self.tool_parser = tool_parser
        self.available_functions = available_functions
        self.results_adder = results_adder
        self.content_buffer = ""
        self.tool_calls_buffer = {}
        self.tool_calls_accumulated = []
        self.processed_tool_calls = set()
        self._executing_tools = set()  # Track currently executing tools

    async def process_stream(
        self,
        response_stream: AsyncGenerator,
        execute_tools: bool = True,
        execute_tools_on_stream: bool = True 
    ) -> AsyncGenerator:
        """Process streaming LLM response and handle tool execution."""
        pending_tool_calls = []
        background_tasks = set()
        stream_completed = False  # New flag to track stream completion

        async def handle_message_management(chunk, is_final=False):
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
                        new_tool_calls = [
                            tool_call for tool_call in parsed_message['tool_calls']
                            if tool_call['id'] not in self.processed_tool_calls
                        ]
                        if new_tool_calls:
                            self.tool_calls_accumulated.extend(new_tool_calls)

                # Handle tool execution and results
                if execute_tools and self.tool_calls_accumulated:
                    new_tool_calls = [
                        tool_call for tool_call in self.tool_calls_accumulated
                        if (tool_call['id'] not in self.processed_tool_calls and 
                            tool_call['id'] not in self._executing_tools)
                    ]

                    if new_tool_calls:
                        if execute_tools_on_stream:
                            for tool_call in new_tool_calls:
                                self._executing_tools.add(tool_call['id'])

                            results = await self.tool_executor.execute_tool_calls(
                                tool_calls=new_tool_calls,
                                available_functions=self.available_functions,
                                thread_id=self.thread_id,
                                executed_tool_calls=self.processed_tool_calls
                            )

                            for result in results:
                                await self.results_adder.add_tool_result(self.thread_id, result)
                                self.processed_tool_calls.add(result['tool_call_id'])
                                self._executing_tools.discard(result['tool_call_id'])

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
                if chunk.choices[0].finish_reason or is_final:
                    nonlocal stream_completed
                    stream_completed = True
                    
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

                    # Set final state on the chunk instead of returning it
                    chunk._final_state = {
                        "content": self.content_buffer,
                        "tool_calls": self.tool_calls_accumulated,
                        "processed_tool_calls": list(self.processed_tool_calls)
                    }

            except Exception as e:
                logging.error(f"Error in background task: {e}")
                raise

        try:
            async for chunk in response_stream:
                task = asyncio.create_task(handle_message_management(chunk))
                background_tasks.add(task)
                task.add_done_callback(background_tasks.discard)
                yield chunk

            # Create a final dummy chunk to handle completion
            final_chunk = type('DummyChunk', (), {
                'choices': [type('DummyChoice', (), {
                    'delta': type('DummyDelta', (), {'content': None}),
                    'finish_reason': 'stop'
                })]
            })()
            
            # Process final state
            await handle_message_management(final_chunk, is_final=True)
            yield final_chunk

            # Wait for all background tasks to complete
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
