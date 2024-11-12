from typing import Dict, Any, AsyncGenerator, Callable
import json
from agentpress.tool_executor import ToolExecutor
from agentpress.tool_parser import ToolParser

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
        self.current_message = None

    async def process_stream(
        self,
        response_stream: AsyncGenerator,
        execute_tools: bool = True,
        immediate_execution: bool = True  # Renamed from execute_tools_immediately
    ) -> AsyncGenerator:
        """
        Process streaming LLM response and handle tool execution.
        
        Handles streaming responses chunk by chunk, managing tool execution timing
        based on configuration. Tools can be executed immediately as they are
        identified in the stream, or collected and executed after the complete
        response is received.
        
        Args:
            response_stream: Stream of response chunks from the LLM
            execute_tools: Whether to execute tool calls at all
            immediate_execution: Whether to execute tools as they appear in the stream
                               or wait for complete response
        
        Yields:
            Processed response chunks
        """
        pending_tool_calls = []

        async def process_chunk(chunk):
            parsed_message, is_complete = await self.tool_parser.parse_stream(
                chunk, 
                self.tool_calls_buffer
            )
            
            if parsed_message and 'tool_calls' in parsed_message:
                # Update or create message
                if not self.current_message:
                    self.current_message = parsed_message
                    await self.add_message(self.thread_id, self.current_message)
                else:
                    self.current_message['tool_calls'] = parsed_message['tool_calls']
                    await self.update_message(self.thread_id, self.current_message)

                if execute_tools:
                    new_tool_calls = [
                        tool_call for tool_call in parsed_message['tool_calls']
                        if tool_call['id'] not in self.processed_tool_calls
                    ]

                    if new_tool_calls:
                        if immediate_execution:
                            results = await self.tool_executor.execute_tool_calls(
                                tool_calls=new_tool_calls,
                                available_functions=self.available_functions,
                                thread_id=self.thread_id,
                                executed_tool_calls=self.processed_tool_calls
                            )
                            for result in results:
                                await self.add_message(self.thread_id, result)
                                self.processed_tool_calls.add(result['tool_call_id'])
                        else:
                            pending_tool_calls.extend(new_tool_calls)

            # Process any pending tools at end of response
            if chunk.choices[0].finish_reason and not immediate_execution and pending_tool_calls:
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

            return chunk

        async for chunk in response_stream:
            processed_chunk = await process_chunk(chunk)
            yield processed_chunk

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