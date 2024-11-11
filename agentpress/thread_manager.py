import json
import logging
import asyncio
import os
from typing import List, Dict, Any, Optional, Callable, Type, Union, AsyncGenerator
from agentpress.llm import make_llm_api_call
from agentpress.tool import Tool, ToolResult
from agentpress.tool_registry import ToolRegistry
import uuid

class ThreadManager:
    def __init__(self, threads_dir: str = "threads"):
        self.threads_dir = threads_dir
        self.tool_registry = ToolRegistry()
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
        thread_id = str(uuid.uuid4())
        thread_path = os.path.join(self.threads_dir, f"{thread_id}.json")
        with open(thread_path, 'w') as f:
            json.dump({"messages": []}, f)
        return thread_id

    async def add_message(self, thread_id: str, message_data: Dict[str, Any], images: Optional[List[Dict[str, Any]]] = None):
        logging.info(f"Adding message to thread {thread_id} with images: {images}")
        thread_path = os.path.join(self.threads_dir, f"{thread_id}.json")
        
        try:
            with open(thread_path, 'r') as f:
                thread_data = json.load(f)
            
            messages = thread_data["messages"]
            
            if message_data['role'] == 'user':
                last_assistant_index = next((i for i in reversed(range(len(messages))) if messages[i]['role'] == 'assistant' and 'tool_calls' in messages[i]), None)
                
                if last_assistant_index is not None:
                    tool_call_count = len(messages[last_assistant_index]['tool_calls'])
                    tool_response_count = sum(1 for msg in messages[last_assistant_index+1:] if msg['role'] == 'tool')
                    
                    if tool_call_count != tool_response_count:
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
                    {k: v for k, v in msg.items() if k != 'tool_calls'}
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
        last_assistant_message = next((m for m in reversed(messages) if m['role'] == 'assistant' and 'tool_calls' in m), None)

        if last_assistant_message:
            tool_calls = last_assistant_message.get('tool_calls', [])
            tool_responses = [m for m in messages[messages.index(last_assistant_message)+1:] if m['role'] == 'tool']

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

                assistant_index = messages.index(last_assistant_message)
                messages[assistant_index+1:assistant_index+1] = failed_tool_results

                thread_path = os.path.join(self.threads_dir, f"{thread_id}.json")
                with open(thread_path, 'w') as f:
                    json.dump({"messages": messages}, f)

                return True
        return False

    async def run_thread(self, thread_id: str, system_message: Dict[str, Any], model_name: str, temperature: float = 0, max_tokens: Optional[int] = None, tool_choice: str = "auto", additional_message: Optional[Dict[str, Any]] = None, execute_tools_async: bool = True, execute_model_tool_calls: bool = True, use_tools: bool = False, stream: bool = False) -> Union[Dict[str, Any], AsyncGenerator]:
        """
        Run a thread with the given parameters. If stream=True, returns an AsyncGenerator that yields response chunks.
        Otherwise returns a Dict with the complete response.
        """
        messages = await self.list_messages(thread_id)
        prepared_messages = [system_message] + messages
        
        if additional_message:
            prepared_messages.append(additional_message)
        
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
                return self._handle_streaming_response(thread_id, llm_response, use_tools, execute_model_tool_calls, execute_tools_async)
            
            # For non-streaming, handle the response as before
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
                    "additional_message": additional_message,
                    "execute_tools_async": execute_tools_async,
                    "execute_model_tool_calls": execute_model_tool_calls,
                    "use_tools": use_tools,
                    "stream": stream
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
                    "additional_message": additional_message,
                    "execute_tools_async": execute_tools_async,
                    "execute_model_tool_calls": execute_model_tool_calls,
                    "use_tools": use_tools,
                    "stream": stream
                }
            }

    async def _handle_streaming_response(self, thread_id: str, response_stream: AsyncGenerator, use_tools: bool, execute_model_tool_calls: bool, execute_tools_async: bool) -> AsyncGenerator:
        """Handle streaming response and tool execution"""
        tool_calls_map = {}  # Map to store tool calls by index
        content_buffer = ""
        
        async def process_chunk(chunk):
            nonlocal content_buffer
            
            # Process tool calls in the chunk
            if hasattr(chunk.choices[0], 'delta'):
                delta = chunk.choices[0].delta
                
                # Handle content if present
                if hasattr(delta, 'content') and delta.content:
                    content_buffer += delta.content

                # Handle tool calls
                if hasattr(delta, 'tool_calls') and delta.tool_calls:
                    for tool_call in delta.tool_calls:
                        idx = tool_call.index
                        if idx not in tool_calls_map:
                            tool_calls_map[idx] = {
                                'id': tool_call.id if tool_call.id else None,
                                'type': 'function',
                                'function': {
                                    'name': tool_call.function.name if tool_call.function.name else None,
                                    'arguments': ''
                                }
                            }
                        
                        current_tool = tool_calls_map[idx]
                        if tool_call.id:
                            current_tool['id'] = tool_call.id
                        if tool_call.function.name:
                            current_tool['function']['name'] = tool_call.function.name
                        if tool_call.function.arguments:
                            current_tool['function']['arguments'] += tool_call.function.arguments

            # If this is the final chunk with tool_calls finish_reason
            if chunk.choices[0].finish_reason == 'tool_calls' and use_tools and execute_model_tool_calls:
                try:
                    # Convert tool_calls_map to list and sort by index
                    tool_calls = [tool_calls_map[idx] for idx in sorted(tool_calls_map.keys())]
                    
                    # Create assistant message with tool calls and any content
                    assistant_message = {
                        "role": "assistant",
                        "content": content_buffer,
                        "tool_calls": tool_calls
                    }
                    await self.add_message(thread_id, assistant_message)
                    
                    # Process the complete tool calls
                    processed_tool_calls = []
                    for tool_call in tool_calls:
                        try:
                            args_str = tool_call['function']['arguments']
                            # Try to parse the string as JSON
                            tool_call['function']['arguments'] = json.loads(args_str)
                            processed_tool_calls.append(tool_call)
                            logging.info(f"Processed tool call: {tool_call}")
                        except json.JSONDecodeError as e:
                            logging.error(f"Error parsing tool call arguments: {e}, args: {args_str}")
                            continue
                    
                    # Execute tools with the processed tool calls
                    available_functions = self.get_available_functions()
                    if execute_tools_async:
                        tool_results = await self.execute_tools_async(processed_tool_calls, available_functions, thread_id)
                    else:
                        tool_results = await self.execute_tools_sync(processed_tool_calls, available_functions, thread_id)
                    
                    # Add tool results
                    for result in tool_results:
                        await self.add_message(thread_id, result)
                        logging.info(f"Tool execution result: {result}")
                except Exception as e:
                    logging.error(f"Error executing tools: {str(e)}")
                    logging.error(f"Tool calls: {tool_calls}")
            
            return chunk

        async for chunk in response_stream:
            processed_chunk = await process_chunk(chunk)
            yield processed_chunk

    async def handle_response_without_tools(self, thread_id: str, response: Any):
        response_content = response.choices[0].message['content']
        await self.add_message(thread_id, {"role": "assistant", "content": response_content})

    async def handle_response_with_tools(self, thread_id: str, response: Any, execute_tools_async: bool):
        try:
            response_message = response.choices[0].message
            tool_calls = response_message.get('tool_calls', [])
            
            assistant_message = self.create_assistant_message_with_tools(response_message)
            await self.add_message(thread_id, assistant_message)

            available_functions = self.get_available_functions()
            
            if tool_calls:
                if execute_tools_async:
                    tool_results = await self.execute_tools_async(tool_calls, available_functions, thread_id)
                else:
                    tool_results = await self.execute_tools_sync(tool_calls, available_functions, thread_id)
                
                for result in tool_results:
                    await self.add_message(thread_id, result)
        
        except AttributeError as e:
            logging.error(f"AttributeError: {e}")
            response_content = response.choices[0].message['content']
            await self.add_message(thread_id, {"role": "assistant", "content": response_content or ""})

    def create_assistant_message_with_tools(self, response_message: Any) -> Dict[str, Any]:
        message = {
            "role": "assistant",
            "content": response_message.get('content') or "",
        }
        tool_calls = response_message.get('tool_calls')
        if tool_calls:
            message["tool_calls"] = [
                {
                    "id": tool_call.id,
                    "type": "function",
                    "function": {
                        "name": tool_call.function.name,
                        "arguments": tool_call.function.arguments
                    }
                } for tool_call in tool_calls
            ]
        return message
    
    def get_available_functions(self) -> Dict[str, Callable]:
        available_functions = {}
        for tool_name, tool_info in self.tool_registry.get_all_tools().items():
            tool_instance = tool_info['instance']
            for func_name, func in tool_instance.__class__.__dict__.items():
                if callable(func) and not func_name.startswith("__"):
                    available_functions[func_name] = getattr(tool_instance, func_name)
        return available_functions

    async def execute_tools_async(self, tool_calls, available_functions, thread_id):
        async def execute_single_tool(tool_call):
            try:
                if isinstance(tool_call, dict):
                    function_name = tool_call['function']['name']
                    function_args = tool_call['function']['arguments']  # Already a dict
                    tool_call_id = tool_call['id']
                else:
                    function_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.arguments) if isinstance(tool_call.function.arguments, str) else tool_call.function.arguments
                    tool_call_id = tool_call.id

                function_to_call = available_functions.get(function_name)
                if function_to_call:
                    return await self.execute_tool(function_to_call, function_args, function_name, tool_call_id)
                else:
                    logging.warning(f"Function {function_name} not found in available functions")
                    return None
            except Exception as e:
                logging.error(f"Error executing tool: {str(e)}")
                return None

        tool_results = await asyncio.gather(*[execute_single_tool(tool_call) for tool_call in tool_calls])
        return [result for result in tool_results if result]

    async def execute_tools_sync(self, tool_calls, available_functions, thread_id):
        tool_results = []
        for tool_call in tool_calls:
            try:
                if isinstance(tool_call, dict):
                    function_name = tool_call['function']['name']
                    function_args = tool_call['function']['arguments']  # Already a dict
                    tool_call_id = tool_call['id']
                else:
                    function_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.arguments) if isinstance(tool_call.function.arguments, str) else tool_call.function.arguments
                    tool_call_id = tool_call.id

                function_to_call = available_functions.get(function_name)
                if function_to_call:
                    result = await self.execute_tool(function_to_call, function_args, function_name, tool_call_id)
                    if result:
                        tool_results.append(result)
                else:
                    logging.warning(f"Function {function_name} not found in available functions")
            except Exception as e:
                logging.error(f"Error executing tool: {str(e)}")
        
        return tool_results

    async def execute_tool(self, function_to_call, function_args, function_name, tool_call_id):
        try:
            function_response = await function_to_call(**function_args)
        except Exception as e:
            error_message = f"Error in {function_name}: {str(e)}"
            function_response = ToolResult(success=False, output=error_message)
        
        return {
            "role": "tool",
            "tool_call_id": tool_call_id,
            "name": function_name,
            "content": str(function_response),
        }

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
            "content": "Please create a file with a random name with the content 'Hello, world!' Explain what robotics is in a short message to me.."
        })

        system_message = {
            "role": "system", 
            "content": "You are a helpful assistant that can create, read, update, and delete files."
        }
        model_name = "gpt-4o-mini"
        
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
            execute_model_tool_calls=True 
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

    # Run the async main function
    asyncio.run(main())
