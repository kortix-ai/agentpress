"""
Interactive web development agent supporting both XML and Standard LLM tool calling.

This agent can:
- Create and modify web projects
- Execute terminal commands
- Handle file operations
- Use either XML or Standard tool calling patterns
"""

import asyncio
import json
from agentpress.thread_manager import ThreadManager
from example.tools.files_tool import FilesTool
from agentpress.state_manager import StateManager
from example.tools.terminal_tool import TerminalTool
import logging
from typing import AsyncGenerator, Optional, Dict, Any
import sys

from agentpress.api.api_factory import register_thread_task_api

BASE_SYSTEM_MESSAGE = """
You are a world-class web developer who can create, edit, and delete files, and execute terminal commands. 
You write clean, well-structured code. Keep iterating on existing files, continue working on this existing 
codebase - do not omit previous progress; instead, keep iterating.
Available tools:
- create_file: Create new files with specified content
- delete_file: Remove existing files
- str_replace: Make precise text replacements in files
- execute_command: Run terminal commands


RULES: 
- All current file contents are available to you in the <current_workspace_state> section
- Each file in the workspace state includes its full content
- Use str_replace for precise replacements in files
- NEVER include comments in any code you write - the code should be self-documenting
- Always maintain the full context of files when making changes
- When creating new files, write clean code without any comments or documentation

<available_tools>
[create_file(file_path, file_contents)] - Create new files
[delete_file(file_path)] - Delete existing files
[str_replace(file_path, old_str, new_str)] - Replace specific text in files
[execute_command(command)] - Execute terminal commands
</available_tools>

ALWAYS RESPOND WITH MULTIPLE SIMULTANEOUS ACTIONS:
<thoughts>
[Provide a concise overview of your planned changes and implementations]
</thoughts>

<actions>
[Include multiple tool calls]
</actions>

EDITING GUIDELINES:
1. Review the current file contents in the workspace state
2. Make targeted changes with str_replace
3. Write clean, self-documenting code without comments
4. Use create_file for new files and str_replace for modifications

Example workspace state for a file:
{
  "index.html": {
    "content": "<!DOCTYPE html>\\n<html>\\n<head>..."
  }
}
Think deeply and step by step.
"""

XML_FORMAT = """
RESPONSE FORMAT:
Use XML tags to specify file operations:

<create-file file_path="path/to/file">
file contents here
</create-file>

<str-replace file_path="path/to/file">
<old_str>text to replace</old_str>
<new_str>replacement text</new_str>
</str-replace>

<delete-file file_path="path/to/file">
</delete-file>

<stop_session></stop_session>
"""

@register_thread_task_api("/agent")
async def run_agent(
    thread_id: str,
    max_iterations: int = 5,
    user_input: Optional[str] = None,
) -> Dict[str, Any]:
    """Run the development agent with specified configuration.
    
    Args:
        thread_id (str): The ID of the thread.
        max_iterations (int, optional): The maximum number of iterations. Defaults to 5.
        user_input (Optional[str], optional): The user input. Defaults to None.
    """
    thread_manager = ThreadManager()
    state_manager = StateManager(thread_id) 

    if user_input:
        await thread_manager.add_message(
            thread_id,
            {
                "role": "user",
                "content": user_input
            }
        )

    thread_manager.add_tool(FilesTool, thread_id=thread_id)
    thread_manager.add_tool(TerminalTool, thread_id=thread_id)

    system_message = {
        "role": "system",
        "content": BASE_SYSTEM_MESSAGE + XML_FORMAT
    }

    iteration = 0
    while iteration < max_iterations:
        iteration += 1
        
        files_tool = FilesTool(thread_id=thread_id)

        state = await state_manager.export_store()      

        temporary_message_content = f"""
        You are tasked to complete the LATEST USER REQUEST!
        <latest_user_request>
        {user_input}
        </latest_user_request>

        Current development environment workspace state:
        <current_workspace_state>
        {json.dumps(state, indent=2) if state else "{}"}
        </current_workspace_state>

        CONTINUE WITH THE TASK! USE THE SESSION TOOL TO STOP THE SESSION IF THE TASK IS COMPLETE.
        """

        await thread_manager.add_message(
            thread_id=thread_id,
            message_data=temporary_message_content,
            message_type="temporary_message",
            include_in_llm_message_history=False
        )

        temporary_message = {
            "role": "user", 
            "content": temporary_message_content 
        }

        model_name = "anthropic/claude-3-5-sonnet-latest" 

        response = await thread_manager.run_thread(
            thread_id=thread_id,
            system_message=system_message,
            model_name=model_name,
            temperature=0.1,
            max_tokens=8096,
            tool_choice="auto",
            temporary_message=temporary_message,
            native_tool_calling=False,
            xml_tool_calling=True,
            stream=True,
            execute_tools_on_stream=True,
            parallel_tool_execution=True,
        )

        if isinstance(response, AsyncGenerator):
            print("\n🤖 Assistant is responding:")
            try:
                async for chunk in response:
                    if hasattr(chunk.choices[0], 'delta'):
                        delta = chunk.choices[0].delta
                        
                        if hasattr(delta, 'content') and delta.content is not None:
                            content = delta.content
                            print(content, end='', flush=True)
                            
                            # Check for open_files_in_editor tag and continue if found
                            if '</open_files_in_editor>' in content:
                                print("\n📂 Opening files in editor, continuing to next iteration...")
                                continue
                        
                        if hasattr(delta, 'tool_calls') and delta.tool_calls:
                            for tool_call in delta.tool_calls:
                                if tool_call.function:
                                    if tool_call.function.name:
                                        print(f"\n🛠️  Tool Call: {tool_call.function.name}", flush=True)
                                    if tool_call.function.arguments:
                                        print(f"   {tool_call.function.arguments}", end='', flush=True)
                
                print("\n✨ Response completed\n")
                
            except Exception as e:
                print(f"\n❌ Error processing stream: {e}", file=sys.stderr)
                logging.error(f"Error processing stream: {e}")
        else:
            print("\nNon-streaming response received:", response)

        # # Get latest assistant message and check for stop_session
        # latest_msg = await thread_manager.get_llm_history_messages(
        #     thread_id=thread_id,
        #     only_latest_assistant=True
        # )        
        # if latest_msg and '</stop_session>' in latest_msg:
        #     break


if __name__ == "__main__":
    print("\n🚀 Welcome to AgentPress!")
    
    project_description = input("What would you like to build? (default: Create a modern, responsive landing page)\n> ")
    if not project_description.strip():
        project_description = "Create a modern, responsive landing page"
    
    print("\nChoose your agent type:")
    print("1. XML-based Tool Calling")
    print("   - Structured XML format for tool execution")
    print("   - Parses tool calls using XML outputs in the LLM response")
    
    print("\n2. Standard Function Calling")
    print("   - Native LLM function calling format")
    print("   - JSON-based parameter passing")
    
    use_xml = input("\nSelect tool calling format [1/2] (default: 1): ").strip() != "2"
    
    print(f"\n{'XML-based' if use_xml else 'Standard'} agent will help you build: {project_description}")
    print("Use Ctrl+C to stop the agent at any time.")
    
    async def test_agent():
        thread_manager = ThreadManager()
        thread_id = await thread_manager.create_thread()
        logging.info(f"Created new thread: {thread_id}")
        
        try:
            result = await run_agent(
                thread_id=thread_id,
                max_iterations=5,
                user_input=project_description,
            )
            print("\n✅ Test completed successfully!")
            
        except Exception as e:
            print(f"\n❌ Test failed: {str(e)}")
            raise

    try:
        asyncio.run(test_agent())
    except KeyboardInterrupt:
        print("\n⚠️ Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Test failed with error: {str(e)}")
        raise