"""
Conversation thread management system for AgentPress.

This module provides comprehensive conversation management, including:
- Thread creation and persistence
- Message handling with support for text and images
- Tool registration and execution
- LLM interaction with streaming support
- Error handling and cleanup
"""

import json
import logging
import os
import uuid
from typing import List, Dict, Any, Optional, Type, Union, AsyncGenerator
from agentpress.llm import make_llm_api_call
from agentpress.tool import Tool, ToolResult
from agentpress.tool_registry import ToolRegistry
from agentpress.llm_response_processor import LLMResponseProcessor
from agentpress.base_processors import ToolParserBase, ToolExecutorBase, ResultsAdderBase

from agentpress.xml_tool_parser import XMLToolParser
from agentpress.xml_tool_executor import XMLToolExecutor
from agentpress.xml_results_adder import XMLResultsAdder
from agentpress.standard_tool_parser import StandardToolParser
from agentpress.standard_tool_executor import StandardToolExecutor
from agentpress.standard_results_adder import StandardResultsAdder

class ThreadManager:
    """Manages conversation threads with LLM models and tool execution.
    
    Provides comprehensive conversation management, handling message threading,
    tool registration, and LLM interactions with support for both standard and
    XML-based tool execution patterns.
    
    Attributes:
        threads_dir (str): Directory for storing thread files
        tool_registry (ToolRegistry): Registry for managing available tools
        
    Methods:
        add_tool: Register a tool with optional function filtering
        create_thread: Create a new conversation thread
        add_message: Add a message to a thread
        list_messages: Retrieve messages from a thread
        run_thread: Execute a conversation thread with LLM
    """

    def __init__(self, threads_dir: str = "threads"):
        """Initialize ThreadManager.
        
        Args:
            threads_dir: Directory to store thread files
            
        Notes:
            Creates the threads directory if it doesn't exist
        """
        self.threads_dir = threads_dir
        self.tool_registry = ToolRegistry()
        os.makedirs(self.threads_dir, exist_ok=True)

    def add_tool(self, tool_class: Type[Tool], function_names: Optional[List[str]] = None, **kwargs):
        """Add a tool to the ThreadManager.
        
        Args:
            tool_class: The tool class to register
            function_names: Optional list of specific functions to register
            **kwargs: Additional arguments passed to tool initialization
            
        Notes:
            - If function_names is None, all functions are registered
            - Tool instances are created with provided kwargs
        """
        self.tool_registry.register_tool(tool_class, function_names, **kwargs)

    async def create_thread(self) -> str:
        """Create a new conversation thread.
        
        Returns:
            str: Unique thread ID for the created thread
            
        Raises:
            IOError: If thread file creation fails
            
        Notes:
            Creates a new thread file with an empty messages list
        """
        thread_id = str(uuid.uuid4())
        thread_path = os.path.join(self.threads_dir, f"{thread_id}.json")
        with open(thread_path, 'w') as f:
            json.dump({"messages": []}, f)
        return thread_id

    async def add_message(self, thread_id: str, message_data: Dict[str, Any], images: Optional[List[Dict[str, Any]]] = None):
        """Add a message to an existing thread.
        
        Args:
            thread_id: ID of the target thread
            message_data: Message content and metadata
            images: Optional list of image data dictionaries
            
        Raises:
            FileNotFoundError: If thread doesn't exist
            Exception: For other operation failures
            
        Notes:
            - Handles cleanup of incomplete tool calls
            - Supports both text and image content
            - Converts ToolResult instances to strings
        """
        logging.info(f"Adding message to thread {thread_id} with images: {images}")
        thread_path = os.path.join(self.threads_dir, f"{thread_id}.json")
        
        try:
            with open(thread_path, 'r') as f:
                thread_data = json.load(f)
            
            messages = thread_data["messages"]
            
            # Handle cleanup of incomplete tool calls
            if message_data['role'] == 'user':
                last_assistant_index = next((i for i in reversed(range(len(messages))) 
                    if messages[i]['role'] == 'assistant' and 'tool_calls' in messages[i]), None)
                
                if last_assistant_index is not None:
                    tool_call_count = len(messages[last_assistant_index]['tool_calls'])
                    tool_response_count = sum(1 for msg in messages[last_assistant_index+1:] 
                                           if msg['role'] == 'tool')
                    
                    if tool_call_count != tool_response_count:
                        await self.cleanup_incomplete_tool_calls(thread_id)

            # Convert ToolResult instances to strings
            for key, value in message_data.items():
                if isinstance(value, ToolResult):
                    message_data[key] = str(value)

            # Handle image attachments
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

    async def list_messages(
        self, 
        thread_id: str, 
        hide_tool_msgs: bool = False, 
        only_latest_assistant: bool = False, 
        regular_list: bool = True
    ) -> List[Dict[str, Any]]:
        """Retrieve messages from a thread with optional filtering.
        
        Args:
            thread_id: ID of the thread to retrieve messages from
            hide_tool_msgs: If True, excludes tool messages and tool calls
            only_latest_assistant: If True, returns only the most recent assistant message
            regular_list: If True, only includes standard message types
            
        Returns:
            List of messages matching the filter criteria
            
        Notes:
            - Returns empty list if thread doesn't exist
            - Filters can be combined for different views of the conversation
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
        """Clean up incomplete tool calls in a thread.
        
        Args:
            thread_id: ID of the thread to clean up
            
        Returns:
            bool: True if cleanup was performed, False otherwise
            
        Notes:
            - Adds failure results for incomplete tool calls
            - Maintains thread consistency after interruptions
        """
        messages = await self.list_messages(thread_id)
        last_assistant_message = next((m for m in reversed(messages) 
            if m['role'] == 'assistant' and 'tool_calls' in m), None)

        if last_assistant_message:
            tool_calls = last_assistant_message.get('tool_calls', [])
            tool_responses = [m for m in messages[messages.index(last_assistant_message)+1:] 
                            if m['role'] == 'tool']

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

    async def run_thread(
        self,
        thread_id: str,
        system_message: Dict[str, Any],
        model_name: str,
        temperature: float = 0,
        max_tokens: Optional[int] = None,
        tool_choice: str = "auto",
        temporary_message: Optional[Dict[str, Any]] = None,
        native_tool_calling: bool = False,
        xml_tool_calling: bool = False,
        execute_tools: bool = True,
        stream: bool = False,
        execute_tools_on_stream: bool = False,
        parallel_tool_execution: bool = False,
        tool_parser: Optional[ToolParserBase] = None,
        tool_executor: Optional[ToolExecutorBase] = None,
        results_adder: Optional[ResultsAdderBase] = None
    ) -> Union[Dict[str, Any], AsyncGenerator]:
        """Run a conversation thread with specified parameters.
        
        Args:
            thread_id: ID of the thread to run
            system_message: System message for the conversation
            model_name: Name of the LLM model to use
            temperature: Model temperature (0-1)
            max_tokens: Maximum tokens in response
            tool_choice: Tool selection strategy ("auto" or "none")
            temporary_message: Optional message to include temporarily
            native_tool_calling: Whether to use native LLM function calling
            xml_tool_calling: Whether to use XML-based tool calling
            execute_tools: Whether to execute tool calls
            stream: Whether to stream the response
            execute_tools_on_stream: Whether to execute tools during streaming
            parallel_tool_execution: Whether to execute tools in parallel
            tool_parser: Custom tool parser implementation
            tool_executor: Custom tool executor implementation
            results_adder: Custom results adder implementation
            
        Returns:
            Union[Dict[str, Any], AsyncGenerator]: Response or stream
            
        Raises:
            ValueError: If incompatible tool calling options are specified
            Exception: For other execution failures
            
        Notes:
            - Cannot use both native and XML tool calling simultaneously
            - Streaming responses include both content and tool results
        """
        # Validate tool calling configuration
        if native_tool_calling and xml_tool_calling:
            raise ValueError("Cannot use both native LLM tool calling and XML tool calling simultaneously")

        # Initialize tool components if any tool calling is enabled
        if native_tool_calling or xml_tool_calling:
            if tool_parser is None:
                tool_parser = XMLToolParser(tool_registry=self.tool_registry) if xml_tool_calling else StandardToolParser()
            
            if tool_executor is None:
                tool_executor = XMLToolExecutor(parallel=parallel_tool_execution, tool_registry=self.tool_registry) if xml_tool_calling else StandardToolExecutor(parallel=parallel_tool_execution)
            
            if results_adder is None:
                results_adder = XMLResultsAdder(self) if xml_tool_calling else StandardResultsAdder(self)

        try:
            messages = await self.list_messages(thread_id)
            prepared_messages = [system_message] + messages
            if temporary_message:
                prepared_messages.append(temporary_message)

            openapi_tool_schemas = None
            if native_tool_calling:
                openapi_tool_schemas = self.tool_registry.get_openapi_schemas()
                available_functions = self.tool_registry.get_available_functions()
            elif xml_tool_calling:
                available_functions = self.tool_registry.get_available_functions()
            else:
                available_functions = {}

            response_processor = LLMResponseProcessor(
                thread_id=thread_id,
                available_functions=available_functions,
                add_message_callback=self.add_message,
                update_message_callback=self._update_message,
                list_messages_callback=self.list_messages,
                parallel_tool_execution=parallel_tool_execution,
                threads_dir=self.threads_dir,
                tool_parser=tool_parser,
                tool_executor=tool_executor,
                results_adder=results_adder
            )

            llm_response = await self._run_thread_completion(
                messages=prepared_messages,
                model_name=model_name,
                temperature=temperature,
                max_tokens=max_tokens,
                tools=openapi_tool_schemas,
                tool_choice=tool_choice if native_tool_calling else None,
                stream=stream
            )

            if stream:
                return response_processor.process_stream(
                    response_stream=llm_response,
                    execute_tools=execute_tools,
                    execute_tools_on_stream=execute_tools_on_stream
                )

            await response_processor.process_response(
                response=llm_response,
                execute_tools=execute_tools
            )

            return llm_response

        except Exception as e:
            logging.error(f"Error in run_thread: {str(e)}")
            return {
                "status": "error",
                "message": str(e)
            }

    async def _run_thread_completion(
        self,
        messages: List[Dict[str, Any]],
        model_name: str,
        temperature: float,
        max_tokens: Optional[int],
        tools: Optional[List[Dict[str, Any]]],
        tool_choice: Optional[str],
        stream: bool
    ) -> Union[Any, AsyncGenerator]:
        """Get completion from LLM API."""
        return await make_llm_api_call(
            messages,
            model_name,
            temperature=temperature,
            max_tokens=max_tokens,
            tools=tools,
            tool_choice=tool_choice,
            stream=stream
        )

    async def _update_message(self, thread_id: str, message: Dict[str, Any]):
        """Update an existing message in the thread."""
        thread_path = os.path.join(self.threads_dir, f"{thread_id}.json")
        try:
            with open(thread_path, 'r') as f:
                thread_data = json.load(f)
            
            # Find and update the last assistant message
            for i in reversed(range(len(thread_data["messages"]))):
                if thread_data["messages"][i]["role"] == "assistant":
                    thread_data["messages"][i] = message
                    break
            
            with open(thread_path, 'w') as f:
                json.dump(thread_data, f)
        except Exception as e:
            logging.error(f"Error updating message in thread {thread_id}: {e}")
            raise e

if __name__ == "__main__":
    import asyncio
    from agentpress.examples.example_agent.tools.files_tool import FilesTool

    async def main():
        # Initialize managers
        thread_manager = ThreadManager()
        
        # Register available tools
        thread_manager.add_tool(FilesTool)
        
        # Create a new thread
        thread_id = await thread_manager.create_thread()
        
        # Add a test message
        await thread_manager.add_message(thread_id, {
            "role": "user", 
            "content": "Please create 10x files – Each should be a chapter of a book about an Introduction to Robotics.."
        })

        # Define system message
        system_message = {
            "role": "system", 
            "content": "You are a helpful assistant that can create, read, update, and delete files."
        }

        # Test with streaming response and tool execution
        print("\n🤖 Testing streaming response with tools:")
        response = await thread_manager.run_thread(
            thread_id=thread_id,
            system_message=system_message,
            model_name="anthropic/claude-3-5-haiku-latest", 
            temperature=0.7,
            max_tokens=4096,
            stream=True,
            native_tool_calling=True,
            execute_tools=True,
            execute_tools_on_stream=True,
            parallel_tool_execution=True
        )

        # Handle streaming response
        if isinstance(response, AsyncGenerator):
            print("\nAssistant is responding:")
            content_buffer = ""
            try:
                async for chunk in response:
                    if hasattr(chunk.choices[0], 'delta'):
                        delta = chunk.choices[0].delta
                        
                        # Handle content streaming
                        if hasattr(delta, 'content') and delta.content is not None:
                            content_buffer += delta.content
                            if delta.content.endswith((' ', '\n')):
                                print(content_buffer, end='', flush=True)
                                content_buffer = ""
                        
                        # Handle tool calls
                        if hasattr(delta, 'tool_calls') and delta.tool_calls:
                            for tool_call in delta.tool_calls:
                                # Print tool name when it first appears
                                if tool_call.function and tool_call.function.name:
                                    print(f"\n🛠️  Tool Call: {tool_call.function.name}", flush=True)
                                
                                # Print arguments as they stream in
                                if tool_call.function and tool_call.function.arguments:
                                    print(f"   {tool_call.function.arguments}", end='', flush=True)
                
                # Print any remaining content
                if content_buffer:
                    print(content_buffer, flush=True)
                print("\n✨ Response completed\n")
                
            except Exception as e:
                print(f"\n❌ Error processing stream: {e}")
        else:
            print("\n✨ Response completed\n")

        # Display final thread state
        messages = await thread_manager.list_messages(thread_id)
        print("\n📝 Final Thread State:")
        for msg in messages:
            role = msg.get('role', 'unknown')
            content = msg.get('content', '')
            print(f"\n{role.upper()}: {content[:100]}...")

    asyncio.run(main())

