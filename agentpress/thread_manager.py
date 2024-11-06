import json
import logging
import asyncio
import os
from typing import List, Dict, Any, Optional, Callable, Type
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

    async def run_thread(self, thread_id: str, system_message: Dict[str, Any], model_name: str, temperature: float = 0, max_tokens: Optional[int] = None, tool_choice: str = "auto", additional_message: Optional[Dict[str, Any]] = None, execute_tools_async: bool = True, execute_model_tool_calls: bool = True, use_tools: bool = False) -> Dict[str, Any]:
        
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
                stream=False
            )
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
                    "use_tools": use_tools
                }
            }

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
                "use_tools": use_tools
            }
        }

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
            function_name = tool_call.function.name
            function_args = json.loads(tool_call.function.arguments)
            tool_call_id = tool_call.id

            function_to_call = available_functions.get(function_name)
            if function_to_call:
                return await self.execute_tool(function_to_call, function_args, function_name, tool_call_id)
            else:
                logging.warning(f"Function {function_name} not found in available functions")
                return None

        tool_results = await asyncio.gather(*[execute_single_tool(tool_call) for tool_call in tool_calls])
        return [result for result in tool_results if result]

    async def execute_tools_sync(self, tool_calls, available_functions, thread_id):
        tool_results = []
        for tool_call in tool_calls:
            function_name = tool_call.function.name
            function_args = json.loads(tool_call.function.arguments)
            tool_call_id = tool_call.id

            function_to_call = available_functions.get(function_name)
            if function_to_call:
                result = await self.execute_tool(function_to_call, function_args, function_name, tool_call_id)
                if result:
                    tool_results.append(result)
            else:
                logging.warning(f"Function {function_name} not found in available functions")
        
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
    from tools.files_tool import FilesTool

    async def main():
        manager = ThreadManager()

        manager.add_tool(FilesTool, ['create_file', 'read_file'])

        thread_id = await manager.create_thread()

        await manager.add_message(thread_id, {"role": "user", "content": "Please create a file with a random name with the content 'Hello, world!'"})

        system_message = {"role": "system", "content": "You are a helpful assistant that can create, read, update, and delete files."}
        model_name = "gpt-4o"
        
        # Test with tools
        response_with_tools = await manager.run_thread(
            thread_id=thread_id,
            system_message=system_message,
            model_name=model_name,
            temperature=0.7,
            max_tokens=150,
            tool_choice="auto",
            additional_message=None,            
            execute_tools_async=True,
            execute_model_tool_calls=True,
            use_tools=True
        )

        print("Response with tools:", response_with_tools)

        # Test without tools
        response_without_tools = await manager.run_thread(
            thread_id=thread_id,
            system_message=system_message,
            model_name=model_name,
            temperature=0.7,
            max_tokens=150,
            additional_message={"role": "user", "content": "What's the capital of France?"},
            use_tools=False
        )

        print("Response without tools:", response_without_tools)

        # List messages in the thread
        messages = await manager.list_messages(thread_id)
        print("\nMessages in the thread:")
        for msg in messages:
            print(f"{msg['role'].capitalize()}: {msg['content']}")

    # Run the async main function
    asyncio.run(main())
