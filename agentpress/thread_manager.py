import json
import logging
import asyncio
import os
from typing import List, Dict, Any, Optional, Callable, Type, Union, AsyncGenerator
from agentpress.llm import make_llm_api_call
from agentpress.tool import Tool, ToolResult
from agentpress.tool_registry import ToolRegistry
from agentpress.tool_parser import ToolParser, StandardToolParser
from agentpress.tool_executor import ToolExecutor, StandardToolExecutor, SequentialToolExecutor
import uuid

class ThreadManager:
    """
    Manages conversation threads with LLM models and tool execution.
    
    The ThreadManager handles:
    - Creating and managing conversation threads
    - Adding/retrieving messages in threads
    - Executing LLM calls with optional tool usage
    - Managing tool registration and execution
    - Supporting both streaming and non-streaming responses
    
    Attributes:
        threads_dir (str): Directory where thread files are stored
        tool_registry (ToolRegistry): Registry for managing available tools
        tool_parser (ToolParser): Parser for handling tool calls/responses
        tool_executor (ToolExecutor): Executor for running tool functions
    """

    def __init__(
        self, 
        threads_dir: str = "threads", 
        tool_parser: Optional[ToolParser] = None,
        tool_executor: Optional[ToolExecutor] = None
    ):
        """Initialize ThreadManager with optional custom tool parser and executor.
        
        Args:
            threads_dir (str): Directory to store thread files
            tool_parser (Optional[ToolParser]): Custom tool parser implementation
            tool_executor (Optional[ToolExecutor]): Custom tool executor implementation
        """
        self.threads_dir = threads_dir
        self.tool_registry = ToolRegistry()
        self.tool_parser = tool_parser or StandardToolParser()
        self.tool_executor = tool_executor or StandardToolExecutor()
        os.makedirs(self.threads_dir, exist_ok=True)

    def add_tool(self, tool_class: Type[Tool], function_names: Optional[List[str]] = None, **kwargs):
        """
        Add a tool to the ThreadManager.
        If function_names is provided, only register those specific functions.
        If function_names is None, register all functions from the tool.
        
        Args:
            tool_class: The tool class to register
            function_names: Optional list of function names to register
            **kwargs: Additional keyword arguments passed to tool initialization
        """
        self.tool_registry.register_tool(tool_class, function_names, **kwargs)

    async def create_thread(self) -> str:
        """
        Create a new conversation thread.
        
        Returns:
            str: Unique thread ID for the created thread
        """
        thread_id = str(uuid.uuid4())
        thread_path = os.path.join(self.threads_dir, f"{thread_id}.json")
        with open(thread_path, 'w') as f:
            json.dump({"messages": []}, f)
        return thread_id

    async def add_message(self, thread_id: str, message_data: Dict[str, Any], images: Optional[List[Dict[str, Any]]] = None):
        """
        Add a message to an existing thread.
        
        Args:
            thread_id (str): ID of the thread to add message to
            message_data (Dict[str, Any]): Message data including role and content
            images (Optional[List[Dict[str, Any]]]): List of image data to include
                Each image dict should contain 'content_type' and 'base64' keys
        
        Raises:
            Exception: If message addition fails
        """
        logging.info(f"Adding message to thread {thread_id} with images: {images}")
        thread_path = os.path.join(self.threads_dir, f"{thread_id}.json")
        
        try:
            with open(thread_path, 'r') as f:
                thread_data = json.load(f)
            
            messages = thread_data["messages"]
            
            if message_data['role'] == 'user':
                last_assistant_index = next(
                    (i for i in reversed(range(len(messages)))
                     if messages[i]['role'] == 'assistant' and 'tool_use' in messages[i]),
                    None
                )

                if last_assistant_index is not None:
                    tool_use_count = len(messages[last_assistant_index]['tool_use'])
                    tool_response_count = sum(
                        1 for msg in messages[last_assistant_index + 1:]
                        if msg['role'] == 'tool'
                    )

                    if tool_use_count != tool_response_count:
                        await self.cleanup_incomplete_tool_calls(thread_id)

            for key, value in message_data.items():
                if isinstance(value, ToolResult):
                    message_data[key] = str(value)

            if images:
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

            messages.append(message_data)
            thread_data["messages"] = messages
            
            with open(thread_path, 'w') as f:
                json.dump(thread_data, f)
            
            logging.info(f"Message added to thread {thread_id}: {message_data}")
        except Exception as e:
            logging.error(f"Failed to add message to thread {thread_id}: {e}")
            raise e

    async def list_messages(self, thread_id: str, hide_tool_msgs: bool = False, only_latest_assistant: bool = False, regular_list: bool = True) -> List[Dict[str, Any]]:
        """
        Retrieve messages from a thread with optional filtering.
        
        Args:
            thread_id (str): ID of the thread to retrieve messages from
            hide_tool_msgs (bool): If True, excludes tool messages and tool calls
            only_latest_assistant (bool): If True, returns only the most recent assistant message
            regular_list (bool): If True, only includes standard message types
        
        Returns:
            List[Dict[str, Any]]: List of messages matching the filter criteria
        """
        thread_path = os.path.join(self.threads_dir, f"{thread_id}.json")
        
        try:
            with open(thread_path, 'r') as f:
                thread_data = json.load(f)
            messages = thread_data["messages"]
            
            if only_latest_assistant:
                for msg in reversed(messages):
                    if msg.get('role') == 'assistant':
                        return [msg]
                return []
            
            filtered_messages = messages
            
            if hide_tool_msgs:
                filtered_messages = [
                    {k: v for k, v in msg.items() if k != 'tool_use'}
                    for msg in filtered_messages
                    if msg.get('role') != 'tool'
                ]
        
            if regular_list:
                filtered_messages = [
                    msg for msg in filtered_messages
                    if msg.get('role') in ['system', 'assistant', 'tool', 'user']
                ]
            
            return filtered_messages
        except FileNotFoundError:
            return []

    async def cleanup_incomplete_tool_calls(self, thread_id: str):
        messages = await self.list_messages(thread_id)
        last_assistant_message = next((m for m in reversed(messages) if m['role'] == 'assistant' and 'tool_use' in m), None)

        if last_assistant_message:
            tool_use_count = len(last_assistant_message.get('tool_use', []))
            tool_response_count = sum(1 for msg in messages[messages.index(last_assistant_message)+1:] if msg['role'] == 'tool')

            if tool_use_count != tool_response_count:
                failed_tool_results = []
                for tool_use in last_assistant_message.get('tool_use', [])[len(tool_response_count):]:
                    failed_tool_result = {
                        "role": "tool",
                        "tool_use_id": tool_use['id'],
                        "name": tool_use['function']['name'],
                        "content": "ToolResult(success=False, output='Execution interrupted. Session was stopped.')"
                    }
                    failed_tool_results.append(failed_tool_result)

                assistant_index = messages.index(last_assistant_message)
                messages[assistant_index+1:assistant_index+1] = failed_tool_results

                thread_path = os.path.join(self.threads_dir, f"{thread_id}.json")
                with open(thread_path, 'w') as f:
                    json.dump({"messages": messages}, f)

                return True
        return False

    async def run_thread(
        self, 
        thread_id: str, 
        system_message: Dict[str, Any], 
        model_name: str, 
        temperature: float = 0, 
        max_tokens: Optional[int] = None, 
        tool_choice: str = "auto", 
        temporary_message: Optional[Dict[str, Any]] = None, 
        use_tools: bool = False, 
        execute_tools_async: bool = True, 
        execute_model_tool_calls: bool = True, 
        stream: bool = False,
        execute_tools_on_stream: bool = False
    ) -> Union[Dict[str, Any], AsyncGenerator]:
        """
        Run a conversation thread with the specified parameters.
        
        Args:
            thread_id (str): ID of the thread to run
            system_message (Dict[str, Any]): System message to guide model behavior
            model_name (str): Name of the LLM model to use
            temperature (float): Sampling temperature for model responses
            max_tokens (Optional[int]): Maximum tokens in model response
            tool_choice (str): How tools should be selected ('auto' or 'none')
            temporary_message (Optional[Dict[str, Any]]): Extra temporary message to include at the end of the LLM api request. Without adding it permanently to the Thread.
            use_tools (bool): Whether to enable tool usage
            execute_tools_async (bool): Whether to execute tools concurrently or synchronously if off.
            execute_model_tool_calls (bool): Whether to execute parsed tool calls
            stream (bool): Whether to stream the response
            execute_tools_on_stream (bool): Whether to execute tools during streaming, or waiting for full response before executing.
        
        Returns:
            Union[Dict[str, Any], AsyncGenerator]: 
                - Dict with response data for non-streaming
                - AsyncGenerator yielding chunks for streaming
        
        Raises:
            Exception: If API call or tool execution fails
        """
        messages = await self.list_messages(thread_id)
        prepared_messages = [system_message] + messages
        
        if temporary_message:
            prepared_messages.append(temporary_message)
        
        tools = self.tool_registry.get_all_tool_schemas() if use_tools else None

        try:
            llm_response = await make_llm_api_call(
                prepared_messages, 
                model_name, 
                temperature=temperature, 
                max_tokens=max_tokens,
                tools=tools,
                tool_choice=tool_choice if use_tools else None,
                stream=stream
            )

            if stream:
                return self._handle_streaming_response(
                    thread_id=thread_id,
                    response_stream=llm_response,
                    use_tools=use_tools,
                    execute_model_tool_calls=execute_model_tool_calls,
                    execute_tools_async=execute_tools_async,
                    execute_tools_on_stream=execute_tools_on_stream
                )
            
            # For non-streaming, handle the response
            if use_tools and execute_model_tool_calls:
                await self.handle_response_with_tools(thread_id, llm_response, execute_tools_async)
            else:
                await self.handle_response_without_tools(thread_id, llm_response)

            return {
                "llm_response": llm_response,
                "run_thread_params": {
                    "thread_id": thread_id,
                    "system_message": system_message,
                    "model_name": model_name,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "tool_choice": tool_choice,
                    "temporary_message": temporary_message,
                    "execute_tools_async": execute_tools_async,
                    "execute_model_tool_calls": execute_model_tool_calls,
                    "use_tools": use_tools,
                    "stream": stream,
                    "execute_tools_on_stream": execute_tools_on_stream
                }
            }

        except Exception as e:
            logging.error(f"Error in API call: {str(e)}")
            return {
                "status": "error",
                "message": str(e),
                "run_thread_params": {
                    "thread_id": thread_id,
                    "system_message": system_message,
                    "model_name": model_name,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "tool_choice": tool_choice,
                    "temporary_message": temporary_message,
                    "execute_tools_async": execute_tools_async,
                    "execute_model_tool_calls": execute_model_tool_calls,
                    "use_tools": use_tools,
                    "stream": stream,
                    "execute_tools_on_stream": execute_tools_on_stream
                }
            }

    async def _handle_streaming_response(
        self, 
        thread_id: str, 
        response_stream: AsyncGenerator, 
        use_tools: bool, 
        execute_model_tool_calls: bool, 
        execute_tools_async: bool,
        execute_tools_on_stream: bool
    ) -> AsyncGenerator:
        """Handle streaming response and tool execution."""
        tool_calls_buffer = {}  # Buffer to store tool calls by index
        executed_tool_calls = set()  # Track which tool calls have been executed
        content_buffer = ""  # Buffer for content
        current_assistant_message = None  # Track current assistant message
        tool_results_buffer = []  # Buffer for tool results
        available_functions = self.get_available_functions() if use_tools else {}

        async def process_chunk(chunk):
            nonlocal content_buffer, current_assistant_message, tool_results_buffer
            
            # Use tool parser to parse the chunk
            message, is_complete = await self.tool_parser.parse_stream(chunk, tool_calls_buffer)
            
            # Handle content from the chunk
            if hasattr(chunk.choices[0], 'delta'):
                delta = chunk.choices[0].delta
                if hasattr(delta, 'content') and delta.content:
                    content_buffer += delta.content

            # Execute tools during streaming if enabled
            if execute_tools_on_stream and use_tools and execute_model_tool_calls and message and message.get('tool_use'):
                if not current_assistant_message:
                    current_assistant_message = message
                    await self.add_message(thread_id, current_assistant_message)

                # Execute tools using the appropriate executor
                if execute_tools_async:
                    tool_results = await self.tool_executor.execute_tool_calls(
                        tool_calls=message["tool_use"],
                        available_functions=available_functions,
                        thread_id=thread_id,
                        executed_tool_calls=executed_tool_calls
                    )
                else:
                    sequential_executor = SequentialToolExecutor()
                    tool_results = await sequential_executor.execute_tool_calls(
                        tool_calls=message["tool_use"],
                        available_functions=available_functions,
                        thread_id=thread_id,
                        executed_tool_calls=executed_tool_calls
                    )
                
                tool_results_buffer.extend(tool_results)

            # Handle end of response
            if chunk.choices[0].finish_reason:
                if not current_assistant_message:
                    current_assistant_message = {
                        "role": "assistant",
                        "content": content_buffer,
                        "tool_use": list(tool_calls_buffer.values()) if tool_calls_buffer else None
                    }
                    await self.add_message(thread_id, current_assistant_message)

                # Execute remaining tools if not streaming execution
                if not execute_tools_on_stream and use_tools and execute_model_tool_calls:
                    remaining_tool_calls = [
                        tool_call for tool_call in tool_calls_buffer.values()
                        if tool_call.get('id') and tool_call['id'] not in executed_tool_calls
                    ]
                    
                    if remaining_tool_calls:
                        if execute_tools_async:
                            tool_results = await self.tool_executor.execute_tool_calls(
                                tool_calls=remaining_tool_calls,
                                available_functions=available_functions,
                                thread_id=thread_id,
                                executed_tool_calls=executed_tool_calls
                            )
                        else:
                            sequential_executor = SequentialToolExecutor()
                            tool_results = await sequential_executor.execute_tool_calls(
                                tool_calls=remaining_tool_calls,
                                available_functions=available_functions,
                                thread_id=thread_id,
                                executed_tool_calls=executed_tool_calls
                            )
                        tool_results_buffer.extend(tool_results)

                # Add all buffered tool results
                if tool_results_buffer:
                    for result in tool_results_buffer:
                        await self.add_message(thread_id, result)
                    tool_results_buffer = []

            return chunk

        async for chunk in response_stream:
            processed_chunk = await process_chunk(chunk)
            yield processed_chunk

    async def handle_response_without_tools(self, thread_id: str, response: Any):
        response_content = response.choices[0].message['content']
        await self.add_message(thread_id, {"role": "assistant", "content": response_content})

    async def handle_response_with_tools(self, thread_id: str, response: Any, execute_tools_async: bool):
        """
        Handle LLM response that includes tool calls.
        """
        try:
            # Parse the response and get tool calls
            assistant_message = await self.tool_parser.parse_response(response)
            
            # Add the assistant message to the thread
            await self.add_message(thread_id, assistant_message)

            # Execute tool calls if present
            if "tool_use" in assistant_message and assistant_message["tool_use"]:
                tool_calls = assistant_message["tool_use"]
                available_functions = self.get_available_functions()
                
                # Execute tool calls based on execution mode
                if execute_tools_async:
                    tool_results = await self.tool_executor.execute_tool_calls(
                        tool_calls=tool_calls,
                        available_functions=available_functions,
                        thread_id=thread_id
                    )
                else:
                    sequential_executor = SequentialToolExecutor()
                    tool_results = await sequential_executor.execute_tool_calls(
                        tool_calls=tool_calls,
                        available_functions=available_functions,
                        thread_id=thread_id
                    )
                
                # Add tool results to thread
                for result in tool_results:
                    await self.add_message(thread_id, result)
        
        except Exception as e:
            logging.error(f"Error in handle_response_with_tools: {e}")
            # Fallback to content-only message if tool handling fails
            response_content = response.choices[0].message.get('content', '')
            await self.add_message(thread_id, {
                "role": "assistant", 
                "content": response_content or "Error processing tool calls"
            })

    def get_available_functions(self) -> Dict[str, Callable]:
        available_functions = {}
        for tool_name, tool_info in self.tool_registry.get_all_tools().items():
            tool_instance = tool_info['instance']
            for func_name, func in tool_instance.__class__.__dict__.items():
                if callable(func) and not func_name.startswith("__"):
                    available_functions[func_name] = getattr(tool_instance, func_name)
        return available_functions

    async def get_thread(self, thread_id: str) -> Optional[Dict[str, Any]]:
        thread_path = os.path.join(self.threads_dir, f"{thread_id}.json")
        try:
            with open(thread_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return None

if __name__ == "__main__":
    import asyncio
    from agentpress.examples.example_agent.tools.files_tool import FilesTool

    async def main():
        manager = ThreadManager()
        manager.add_tool(FilesTool, ['create_file'])
        thread_id = await manager.create_thread()
        
        # Add a test message
        await manager.add_message(thread_id, {
            "role": "user", 
            "content": "Please create 10x files – Each should be a chapter of a book about an Introduction to Robotics.."
        })

        system_message = {
            "role": "system", 
            "content": "You are a helpful assistant that can create, read, update, and delete files."
        }
        model_name = "anthropic/claude-3-5-haiku-latest"
        # model_name = "gpt-4o-mini"
        
        # Test with tools (non-streaming)
        print("\n🤖 Testing non-streaming response with tools:")
        response = await manager.run_thread(
            thread_id=thread_id,
            system_message=system_message,
            model_name=model_name,
            temperature=0.7,
            stream=False,
            use_tools=True,
            execute_model_tool_calls=True
        )
        
        # Print the non-streaming response
        if "error" in response:
            print(f"Error: {response['message']}")
        else:
            print(response["llm_response"].choices[0].message.content)
            print("\n✨ Response completed.\n")

        # Test streaming
        print("\n🤖 Testing streaming response:")
        stream_response = await manager.run_thread(
            thread_id=thread_id,
            system_message=system_message,
            model_name=model_name,
            temperature=0.7,
            stream=True,  
            use_tools=True,
            execute_model_tool_calls=True,
            execute_tools_on_stream=True
        )

        buffer = ""
        async for chunk in stream_response:
            if isinstance(chunk, dict) and 'choices' in chunk:
                content = chunk['choices'][0]['delta'].get('content', '')
            else:
                # For non-dict responses (like ModelResponse objects)
                content = chunk.choices[0].delta.content
            
            if content:
                buffer += content
                # Print complete words/sentences when we hit whitespace
                if content[-1].isspace():
                    print(buffer, end='', flush=True)
                    buffer = ""
        
        # Print any remaining content
        if buffer:
            print(buffer, flush=True)
        print("\n✨ Stream completed.\n")

    asyncio.run(main())
