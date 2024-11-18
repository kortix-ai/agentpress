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
from tools.files_tool import FilesTool
from agentpress.state_manager import StateManager
from tools.terminal_tool import TerminalTool
import logging
from typing import AsyncGenerator
import sys

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

"""

async def run_agent(thread_id: str, use_xml: bool = True, max_iterations: int = 5):
    """Run the development agent with specified configuration."""
    thread_manager = ThreadManager()
    state_manager = StateManager()
    
    thread_manager.add_tool(FilesTool)
    thread_manager.add_tool(TerminalTool)

    # Combine base message with XML format if needed
    system_message = {
        "role": "system",
        "content": BASE_SYSTEM_MESSAGE + (XML_FORMAT if use_xml else "")
    }

    async def pre_iteration():
        files_tool = FilesTool()
        await files_tool._init_workspace_state()

    async def after_iteration():
        custom_message = input("\nEnter a message (or press Enter to continue): ")
        message_content = custom_message if custom_message else "Continue!!!"
        await thread_manager.add_message(thread_id, {
            "role": "user", 
            "content": message_content
        })

    iteration = 0
    while iteration < max_iterations:
        iteration += 1
        await pre_iteration()

        state = await state_manager.export_store()
        state_message = {
            "role": "user",
            "content": f"""
Current development environment workspace state:
<current_workspace_state>
{json.dumps(state, indent=2)}
</current_workspace_state>
            """
        }

        model_name = "anthropic/claude-3-5-sonnet-latest"

        response = await thread_manager.run_thread(
            thread_id=thread_id,
            system_message=system_message,
            model_name=model_name,
            temperature=0.1,
            max_tokens=8096,
            tool_choice="auto",
            temporary_message=state_message,
            native_tool_calling=not use_xml,
            xml_tool_calling=use_xml,
            stream=True,
            execute_tools_on_stream=True,
            parallel_tool_execution=True
        )
        
        if isinstance(response, AsyncGenerator):
            print("\n🤖 Assistant is responding:")
            try:
                async for chunk in response:
                    if hasattr(chunk.choices[0], 'delta'):
                        delta = chunk.choices[0].delta
                        
                        if hasattr(delta, 'content') and delta.content is not None:
                            print(delta.content, end='', flush=True)
                        
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

        await after_iteration()

def main():
    """Main entry point with synchronous setup."""
    print("\n🚀 Welcome to AgentPress Web Developer Example!")
    
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
    
    async def async_main():
        thread_manager = ThreadManager()
        thread_id = await thread_manager.create_thread()
        await thread_manager.add_message(
            thread_id, 
            {
                "role": "user", 
                "content": project_description
            }
        )
        await run_agent(thread_id, use_xml)

    asyncio.run(async_main())

if __name__ == "__main__":
    main()