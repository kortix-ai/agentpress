import json
import logging
import asyncio
from typing import List, Dict, Any, Optional, Callable, AsyncGenerator, Union
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from core.db import Database, Thread, ThreadRun
from core.tools.tool import Tool, ToolResult
from core.llm import make_llm_api_call
# from core.working_memory_manager import WorkingMemory
from datetime import datetime
from core.tools.tool_registry import ToolRegistry
import re
from core.agent_manager import AgentManager

class ThreadManager:
    def __init__(self, db: Database):
        self.db = db
        self.tool_registry = ToolRegistry()
        self.agent_manager = AgentManager(db)

    async def create_thread(self) -> int:
        async with self.db.get_async_session() as session:
            creation_date = datetime.now().isoformat()
            new_thread = Thread(
                messages=json.dumps([]),
                creation_date=creation_date,
                last_updated_date=creation_date
            )
            session.add(new_thread)
            await session.commit()
            await session.refresh(new_thread)  # Ensure thread_id is populated
            return new_thread.thread_id

    async def add_message(self, thread_id: int, message_data: Dict[str, Any], images: Optional[List[Dict[str, Any]]] = None):
        logging.info(f"Adding message to thread {thread_id} with images: {images}")
        async with self.db.get_async_session() as session:
            thread = await session.get(Thread, thread_id)
            if not thread:
                raise ValueError(f"Thread with id {thread_id} not found")

            try:
                messages = json.loads(thread.messages)
                
                # If we're adding a user message, perform checks
                if message_data['role'] == 'user':
                    # Find the last assistant message with tool calls
                    last_assistant_index = next((i for i in reversed(range(len(messages))) if messages[i]['role'] == 'assistant' and 'tool_calls' in messages[i]), None)
                    
                    if last_assistant_index is not None:
                        tool_call_count = len(messages[last_assistant_index]['tool_calls'])
                        tool_response_count = sum(1 for msg in messages[last_assistant_index+1:] if msg['role'] == 'tool')
                        
                        if tool_call_count != tool_response_count:
                            await self.cleanup_incomplete_tool_calls(thread_id)

                # Convert ToolResult objects to strings
                for key, value in message_data.items():
                    if isinstance(value, ToolResult):
                        message_data[key] = str(value)

                # Process images if present
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
                thread.messages = json.dumps(messages)
                thread.last_updated_date = datetime.now().isoformat()
                await session.commit()
                logging.info(f"Message added to thread {thread_id}: {message_data}")
            except Exception as e:
                await session.rollback()
                logging.error(f"Failed to add message to thread {thread_id}: {e}")
                raise e

    async def get_message(self, thread_id: int, message_index: int) -> Optional[Dict[str, Any]]:
        async with self.db.get_async_session() as session:
            thread = await session.get(Thread, thread_id)
            if not thread:
                return None
            messages = json.loads(thread.messages)
            if message_index < len(messages):
                return messages[message_index]
            return None

    async def modify_message(self, thread_id: int, message_index: int, new_message_data: Dict[str, Any]):
        async with self.db.get_async_session() as session:
            thread = await session.get(Thread, thread_id)
            if not thread:
                raise ValueError(f"Thread with id {thread_id} not found")

            try:
                messages = json.loads(thread.messages)
                if message_index < len(messages):
                    messages[message_index] = new_message_data
                    thread.messages = json.dumps(messages)
                    thread.last_updated_date = datetime.now().isoformat()
                    await session.commit()
                else:
                    raise ValueError(f"Message index {message_index} is out of range")
            except Exception as e:
                await session.rollback()
                raise e

    async def remove_message(self, thread_id: int, message_index: int):
        async with self.db.get_async_session() as session:
            thread = await session.get(Thread, thread_id)
            if not thread:
                raise ValueError(f"Thread with id {thread_id} not found")

            try:
                messages = json.loads(thread.messages)
                if message_index < len(messages):
                    del messages[message_index]
                    thread.messages = json.dumps(messages)
                    thread.last_updated_date = datetime.now().isoformat()
                    await session.commit()
            except Exception as e:
                await session.rollback()
                raise e

    async def list_messages(self, thread_id: int, hide_tool_msgs: bool = False, only_latest_assistant: bool = False, regular_list: bool = True) -> List[Dict[str, Any]]:
        async with self.db.get_async_session() as session:
            thread = await session.get(Thread, thread_id)
            if not thread:
                return []
            messages = json.loads(thread.messages)
            
            if only_latest_assistant:
                for msg in reversed(messages):
                    if msg.get('role') == 'assistant':
                        return [msg]
                return []
            
            filtered_messages = messages  # Initialize filtered_messages with all messages
            
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

    async def cleanup_incomplete_tool_calls(self, thread_id: int):
        messages = await self.list_messages(thread_id)
        last_assistant_message = next((m for m in reversed(messages) if m['role'] == 'assistant' and 'tool_calls' in m), None)

        if last_assistant_message:
            tool_calls = last_assistant_message.get('tool_calls', [])
            tool_responses = [m for m in messages[messages.index(last_assistant_message)+1:] if m['role'] == 'tool']

            if len(tool_calls) != len(tool_responses):
                # Create failed ToolResults for incomplete tool calls
                failed_tool_results = []
                for tool_call in tool_calls[len(tool_responses):]:
                    failed_tool_result = {
                        "role": "tool",
                        "tool_call_id": tool_call['id'],
                        "name": tool_call['function']['name'],
                        "content": "ToolResult(success=False, output='Execution interrupted. Session was stopped.')"
                    }
                    failed_tool_results.append(failed_tool_result)

                # Insert failed tool results after the last assistant message
                assistant_index = messages.index(last_assistant_message)
                messages[assistant_index+1:assistant_index+1] = failed_tool_results

                async with self.db.get_async_session() as session:
                    thread = await session.get(Thread, thread_id)
                    if thread:
                        thread.messages = json.dumps(messages)
                        await session.commit()

                return True
        return False

    async def run_thread(
        self,
        thread_id: int,
        agent_id: Optional[int] = None,
        system_message: Optional[Dict[str, Any]] = None,
        model_name: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
        additional_instructions: Optional[str] = None,
        hide_tool_msgs: bool = False,
        execute_tools_async: bool = True,
        use_tool_parser: bool = False,
        stream: bool = False
    ) -> AsyncGenerator[Union[Dict[str, Any], str], None]:
        if agent_id is not None:
            agent = await self.agent_manager.get_agent(agent_id)
            if not agent:
                raise ValueError(f"Agent with id {agent_id} not found")
            system_message = {"role": "system", "content": agent.system_prompt}
            model_name = agent.model
            temperature = agent.temperature
            tools = [self.tool_registry.get_tool(tool).schema()[0] for tool in agent.selected_tools] if agent.selected_tools else None
        elif system_message is None or model_name is None:
            raise ValueError("Either agent_id or system_message and model_name must be provided")

        if await self.should_stop(thread_id):
            yield {"status": "stopped", "message": "Session cancelled"}
            return

        if use_tool_parser:
            hide_tool_msgs = True
        
        await self.cleanup_incomplete_tool_calls(thread_id)
        
        # Prepare messages
        messages = await self.list_messages(thread_id, hide_tool_msgs=hide_tool_msgs)
        prepared_messages = [system_message] + messages
        
        if additional_instructions:
            additional_instruction_message = {
                "role": "user",
                "content": additional_instructions
            }
            prepared_messages.append(additional_instruction_message)
        
        try:
            response_stream = make_llm_api_call(
                prepared_messages, 
                model_name, 
                temperature=temperature, 
                max_tokens=max_tokens,
                tools=tools, 
                tool_choice="auto",
                stream=stream
            )

            async for partial_response in response_stream:
                if stream:
                    yield partial_response
                else:
                    response = partial_response

            if not stream:
                if tools is None or use_tool_parser:
                    await self.handle_response_without_tools(thread_id, response, use_tool_parser)
                else:
                    await self.handle_response_with_tools(thread_id, response, execute_tools_async)

                if await self.should_stop(thread_id):
                    yield {"status": "stopped", "message": "Session cancelled"}
                else:
                    await self.save_thread_run(thread_id)
                    yield response

        except Exception as e:
            error_message = f"Error in API call: {str(e)}\n\nFull error: {repr(e)}"
            logging.error(error_message)
            await self.update_thread_run_with_error(thread_id, error_message)
            yield {"status": "error", "message": error_message}

    async def handle_response_without_tools(self, thread_id: int, response: Any, use_tool_parser: bool):
        response_content = response.choices[0].message['content']
        
        if use_tool_parser:
            await self.handle_tool_parser_response(thread_id, response_content)
        else:
            logging.info("Adding assistant message to thread.")
            await self.add_message(thread_id, {"role": "assistant", "content": response_content})

    async def handle_tool_parser_response(self, thread_id: int, response_content: str):
        tool_call_match = re.search(r'\{[\s\S]*"function_calls"[\s\S]*\}', response_content)
        if tool_call_match:
            try:
                tool_call_json = json.loads(tool_call_match.group())
                tool_calls = tool_call_json.get('function_calls', [])
                
                assistant_message = {
                    "role": "assistant",
                    "content": response_content,
                    "tool_calls": [
                        {
                            "id": f"call_{i}",
                            "type": "function",
                            "function": {
                                "name": call['name'],
                                "arguments": json.dumps(call['arguments'])
                            }
                        } for i, call in enumerate(tool_calls)
                    ]
                }
                await self.add_message(thread_id, assistant_message)

                available_functions = self.get_available_functions()
                
                tool_results = await self.execute_tools(assistant_message['tool_calls'], available_functions, thread_id, execute_tools_async=True)
                
                await self.process_tool_results(thread_id, tool_results)

            except json.JSONDecodeError:
                logging.error("Failed to parse tool call JSON from response")
                await self.add_message(thread_id, {"role": "assistant", "content": response_content})
        else:
            await self.add_message(thread_id, {"role": "assistant", "content": response_content})

    async def handle_response_with_tools(self, thread_id: int, response: Any, execute_tools_async: bool):
        try:
            response_message = response.choices[0].message
            tool_calls = response_message.get('tool_calls', [])
            
            assistant_message = self.create_assistant_message_with_tools(response_message)
            await self.add_message(thread_id, assistant_message)

            available_functions = self.get_available_functions()
            
            if await self.should_stop(thread_id):
                return {"status": "stopped", "message": "Session cancelled"}

            if tool_calls:
                if execute_tools_async:
                    tool_results = await self.execute_tools_async(tool_calls, available_functions, thread_id)
                else:
                    tool_results = await self.execute_tools_sync(tool_calls, available_functions, thread_id)
                
                # Add tool results to messages
                for result in tool_results:
                    await self.add_message(thread_id, result)

            if await self.should_stop(thread_id):
                return {"status": "stopped", "message": "Session cancelled after tool execution"}
        
        except AttributeError as e:
            logging.error(f"AttributeError: {e}")
            content = response_message.get('content', '')
            if content:
                await self.add_message(thread_id, {"role": "assistant", "content": content})

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

    async def execute_tools(self, tool_calls: List[Any], available_functions: Dict[str, Callable], thread_id: int, execute_tools_async: bool) -> List[Dict[str, Any]]:
        if execute_tools_async:
            return await self.execute_tools_async(tool_calls, available_functions, thread_id)
        else:
            return await self.execute_tools_sync(tool_calls, available_functions, thread_id)

    async def execute_tools_async(self, tool_calls, available_functions, thread_id):
        async def execute_single_tool(tool_call):
            if await self.should_stop(thread_id):
                return {"status": "stopped", "message": "Session cancelled"}

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
            if await self.should_stop(thread_id):
                return [{"status": "stopped", "message": "Session cancelled"}]

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

    async def process_tool_results(self, thread_id: int, tool_results: List[Dict[str, Any]]):
        for result in tool_results:
            await self.add_message(thread_id, result['tool_message'])

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

    async def should_stop(self, thread_id: int) -> bool:
        async with self.db.get_async_session() as session:
            stmt = select(ThreadRun).where(
                (ThreadRun.thread_id == thread_id) & 
                (ThreadRun.status.in_(['stopping', 'cancelled', 'paused']))
            )
            result = await session.execute(stmt)
            return result.scalar_one_or_none() is not None

    async def save_thread_run(self, thread_id: int):
        async with self.db.get_async_session() as session:
            thread = await session.get(Thread, thread_id)
            if not thread:
                raise ValueError(f"Thread with id {thread_id} not found")

            messages = json.loads(thread.messages)
            creation_date = datetime.now().isoformat()
            
            new_thread_run = ThreadRun(
                thread_id=thread_id,
                messages=json.dumps(messages),
                creation_date=creation_date,
                status='completed'
            )
            session.add(new_thread_run)
            await session.commit()

    async def get_thread(self, thread_id: int) -> Optional[Thread]:
        async with self.db.get_async_session() as session:
            return await session.get(Thread, thread_id)

    async def update_thread_run_with_error(self, thread_id: int, error_message: str):
        async with self.db.get_async_session() as session:
            stmt = select(ThreadRun).where(ThreadRun.thread_id == thread_id).order_by(ThreadRun.run_id.desc()).limit(1)
            result = await session.execute(stmt)
            thread_run = result.scalar_one_or_none()
            if thread_run:
                thread_run.status = 'error'
                thread_run.error_message = error_message  # Store the full error message
                await session.commit()

    async def get_threads(self) -> List[Thread]:
        async with self.db.get_async_session() as session:
            result = await session.execute(select(Thread).order_by(Thread.thread_id.desc()))
            return result.scalars().all()

    async def get_latest_thread_run(self, thread_id: int):
        async with self.db.get_async_session() as session:
            stmt = select(ThreadRun).where(ThreadRun.thread_id == thread_id).order_by(ThreadRun.run_id.desc()).limit(1)
            result = await session.execute(stmt)
            return result.scalar_one_or_none()

if __name__ == "__main__":
    import asyncio
    from core.db import Database

    async def main():
        db = Database()
        manager = ThreadManager(db)
        
        # Create thread
        thread_id = await manager.create_thread()
        
        # Add message
        await manager.add_message(thread_id, {"role": "user", "content": "How are you?"})
        
        # Run thread
        system_message = {"role": "system", "content": "You are a helpful assistant."}
        response = await manager.run_thread(thread_id, system_message, "gpt-4o")

        await manager.add_message(thread_id, {"role": "user", "content": "What is pi?"})

        response = await manager.run_thread(thread_id, system_message, "gpt-4o") 
        
        print(f"Response: {response}")

    asyncio.run(main())

    asyncio.run(main())