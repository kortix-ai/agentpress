from agentpress.interfaces import ResponseProcessor, ResponseParser, ToolExecutionStrategy, ResultsHandler
from typing import Dict, Any, Optional, List, Callable, AsyncGenerator
import json
import logging
import asyncio

class OpenAPIResponseProcessor(ResponseProcessor):
    def __init__(self, response_parser: ResponseParser):
        self.parser = response_parser
        self.buffer = {}
        self.processed_tool_calls = set()
        self.message_added = False
        self.pending_tool_calls = []
        
    async def process_stream(
        self,
        thread_id: str,
        response_stream: AsyncGenerator,
        execute_tools: bool,
        tool_execution_strategy: ToolExecutionStrategy,
        available_functions: Dict[str, Callable],
        results_handler: ResultsHandler,
        immediate_tool_execution: bool = True
    ) -> AsyncGenerator:
        background_tasks = set()
        tool_results_buffer = []

        async def handle_message_management(chunk):
            try:
                parsed_message, is_complete = await self.parser.parse_stream(chunk, self.buffer)
                
                if parsed_message:
                    if not self.message_added:
                        await results_handler.add_result(thread_id, parsed_message)
                        self.message_added = True
                    else:
                        await results_handler.update_result(thread_id, parsed_message)
                    
                    if execute_tools and 'tool_calls' in parsed_message:
                        new_tool_calls = [
                            tc for tc in parsed_message['tool_calls'] 
                            if tc['id'] not in self.processed_tool_calls
                        ]
                        if new_tool_calls:
                            if immediate_tool_execution:
                                results = await tool_execution_strategy.execute_tools(
                                    new_tool_calls,
                                    available_functions,
                                    thread_id,
                                    self.processed_tool_calls
                                )
                                tool_results_buffer.extend(results)
                            else:
                                self.pending_tool_calls.extend(new_tool_calls)
                            
                if is_complete:
                    if not immediate_tool_execution and self.pending_tool_calls:
                        results = await tool_execution_strategy.execute_tools(
                            self.pending_tool_calls,
                            available_functions,
                            thread_id,
                            self.processed_tool_calls
                        )
                        tool_results_buffer.extend(results)
                        self.pending_tool_calls.clear()

                    for result in tool_results_buffer:
                        await results_handler.add_result(thread_id, result)
                    tool_results_buffer.clear()

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

    async def process_response(
        self,
        thread_id: str,
        response: Any,
        execute_tools: bool,
        tool_execution_strategy: ToolExecutionStrategy,
        available_functions: Dict[str, Callable],
        results_handler: ResultsHandler
    ) -> None:
        try:
            assistant_message = await self.parser.parse_response(response)
            await results_handler.add_result(thread_id, assistant_message)

            if execute_tools and 'tool_calls' in assistant_message:
                results = await tool_execution_strategy.execute_tools(
                    assistant_message['tool_calls'],
                    available_functions,
                    thread_id,
                    self.processed_tool_calls
                )
                
                for result in results:
                    await results_handler.add_result(thread_id, result)

        except Exception as e:
            logging.error(f"Error processing response: {e}")
            raise

class OpenAPIResponseParser(ResponseParser):
    async def parse_response(self, response: Any) -> Dict[str, Any]:
        response_message = response.choices[0].message
        return {
            "role": "assistant",
            "content": response_message.get('content') or "",
            "tool_calls": self._parse_tool_calls(response_message.get('tool_calls', []))
        }
    
    async def parse_stream(self, chunk: Any, buffer: Dict) -> tuple[Optional[Dict[str, Any]], bool]:
        content_chunk = ""
        is_complete = False
        has_complete_tool_call = False
        
        if hasattr(chunk.choices[0], 'delta'):
            delta = chunk.choices[0].delta
            
            if hasattr(delta, 'content') and delta.content:
                content_chunk = delta.content

            if hasattr(delta, 'tool_calls') and delta.tool_calls:
                for tool_call in delta.tool_calls:
                    idx = tool_call.index
                    if idx not in buffer:
                        buffer[idx] = {
                            'id': tool_call.id if hasattr(tool_call, 'id') and tool_call.id else None,
                            'type': 'function',
                            'function': {
                                'name': tool_call.function.name if hasattr(tool_call.function, 'name') and tool_call.function.name else None,
                                'arguments': ''
                            }
                        }
                    
                    current_tool = buffer[idx]
                    if hasattr(tool_call, 'id') and tool_call.id:
                        current_tool['id'] = tool_call.id
                    if hasattr(tool_call.function, 'name') and tool_call.function.name:
                        current_tool['function']['name'] = tool_call.function.name
                    if hasattr(tool_call.function, 'arguments') and tool_call.function.arguments:
                        current_tool['function']['arguments'] += tool_call.function.arguments
                    
                    if (current_tool['id'] and 
                        current_tool['function']['name'] and 
                        current_tool['function']['arguments']):
                        try:
                            json.loads(current_tool['function']['arguments'])
                            has_complete_tool_call = True
                        except json.JSONDecodeError:
                            pass

        if hasattr(chunk.choices[0], 'finish_reason') and chunk.choices[0].finish_reason:
            is_complete = True

        if has_complete_tool_call or is_complete:
            complete_tool_calls = []
            for idx, tool_call in buffer.items():
                try:
                    if (tool_call['id'] and 
                        tool_call['function']['name'] and 
                        tool_call['function']['arguments']):
                        json.loads(tool_call['function']['arguments'])
                        complete_tool_calls.append(tool_call)
                except json.JSONDecodeError:
                    continue
            
            if complete_tool_calls:
                return {
                    "role": "assistant",
                    "content": content_chunk,
                    "tool_calls": complete_tool_calls
                }, is_complete

        return None, is_complete

    def _parse_tool_calls(self, tool_calls: List[Any]) -> List[Dict[str, Any]]:
        return [{
            "id": tc.id,
            "type": "function",
            "function": {
                "name": tc.function.name,
                "arguments": tc.function.arguments
            }
        } for tc in tool_calls]

class ParallelToolExecutionStrategy(ToolExecutionStrategy):
    async def execute_tools(
        self,
        tool_calls: List[Dict[str, Any]],
        available_functions: Dict[str, Callable],
        thread_id: str,
        executed_tool_calls: set
    ) -> List[Dict[str, Any]]:
        async def execute_single_tool(tool_call: Dict[str, Any]) -> Dict[str, Any]:
            if tool_call['id'] in executed_tool_calls:
                return None
                
            try:
                function_name = tool_call['function']['name']
                function_args = tool_call['function']['arguments']
                if isinstance(function_args, str):
                    function_args = json.loads(function_args)
                
                function_to_call = available_functions.get(function_name)
                if not function_to_call:
                    error_msg = f"Function {function_name} not found"
                    logging.error(error_msg)
                    return {
                        "role": "tool",
                        "tool_call_id": tool_call['id'],
                        "name": function_name,
                        "content": f"{{\"success\": false, \"output\": \"{error_msg}\"}}"
                    }

                result = await function_to_call(**function_args)
                logging.info(f"Tool execution result for {function_name}: {result}")
                executed_tool_calls.add(tool_call['id'])
                
                return {
                    "role": "tool",
                    "tool_call_id": tool_call['id'],
                    "name": function_name,
                    "content": str(result)
                }
            except Exception as e:
                error_msg = f"Error executing {function_name}: {str(e)}"
                logging.error(error_msg)
                return {
                    "role": "tool",
                    "tool_call_id": tool_call['id'],
                    "name": function_name,
                    "content": f"{{\"success\": false, \"output\": \"{error_msg}\"}}"
                }

        tasks = [execute_single_tool(tool_call) for tool_call in tool_calls]
        results = await asyncio.gather(*tasks)
        return [r for r in results if r is not None]

class SequentialToolExecutionStrategy(ToolExecutionStrategy):
    async def execute_tools(
        self,
        tool_calls: List[Dict[str, Any]],
        available_functions: Dict[str, Callable],
        thread_id: str,
        executed_tool_calls: set
    ) -> List[Dict[str, Any]]:
        results = []
        for tool_call in tool_calls:
            if tool_call['id'] in executed_tool_calls:
                continue
                
            try:
                function_name = tool_call['function']['name']
                function_args = tool_call['function']['arguments']
                if isinstance(function_args, str):
                    function_args = json.loads(function_args)
                
                function_to_call = available_functions.get(function_name)
                if not function_to_call:
                    error_msg = f"Function {function_name} not found"
                    logging.error(error_msg)
                    result = f"{{\"success\": false, \"output\": \"{error_msg}\"}}"
                else:
                    result = await function_to_call(**function_args)
                    logging.info(f"Tool execution result for {function_name}: {result}")
                    executed_tool_calls.add(tool_call['id'])
                
                results.append({
                    "role": "tool",
                    "tool_call_id": tool_call['id'],
                    "name": function_name,
                    "content": str(result)
                })
            except Exception as e:
                error_msg = f"Error executing {function_name}: {str(e)}"
                logging.error(error_msg)
                results.append({
                    "role": "tool",
                    "tool_call_id": tool_call['id'],
                    "name": function_name,
                    "content": f"{{\"success\": false, \"output\": \"{error_msg}\"}}"
                })
        
        return results

class StandardResultsHandler(ResultsHandler):
    def __init__(self, add_message_callback: Callable, update_message_callback: Callable):
        self.add_message = add_message_callback
        self.update_message = update_message_callback
    
    async def add_result(self, thread_id: str, result: Dict[str, Any]) -> None:
        await self.add_message(thread_id, result)
    
    async def update_result(self, thread_id: str, result: Dict[str, Any]) -> None:
        await self.update_message(thread_id, result) 