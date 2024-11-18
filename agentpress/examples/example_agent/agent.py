import asyncio
import json
from agentpress.thread_manager import ThreadManager
from tools.files_tool import FilesTool
from agentpress.state_manager import StateManager
from tools.terminal_tool import TerminalTool
import logging
from typing import AsyncGenerator
import sys
from agentpress.xml_tool_parser import XMLToolParser
from agentpress.xml_tool_executor import XMLToolExecutor
from agentpress.xml_results_adder import XMLResultsAdder

async def run_agent(thread_id: str, max_iterations: int = 5):
    # Initialize managers and tools
    thread_manager = ThreadManager()
    state_manager = StateManager()
    
    # Initialize tools with XML schema support
    thread_manager.add_tool(FilesTool)
    thread_manager.add_tool(TerminalTool)

    async def init():
        pass

    async def pre_iteration():
        # Update files state
        files_tool = FilesTool()
        await files_tool._init_workspace_state()

    async def after_iteration():
        # Ask the user for a custom message or use the default
        custom_message = input("Enter a message to send (or press Enter to use 'Continue!!!' as message): ")

        message_content = custom_message if custom_message else """ 
        Continue!!!
        """
        await thread_manager.add_message(thread_id, {
            "role": "user", 
            "content": message_content
        })
 
    async def finalizer():
        pass    

    await init()

    iteration = 0

    while iteration < max_iterations:
        iteration += 1
        await pre_iteration()

# You are a world-class web developer who can create, edit, and delete files, and execute terminal commands. You write clean, well-structured code.

# RESPONSE FORMAT:
# Use XML tags to specify file operations:

# <create-file file_path="path/to/file">
# file contents here
# </create-file>

# <str-replace file_path="path/to/file" old_str="old_str" new_str="new_str">
# </str-replace>

# <delete-file file_path="path/to/file">
# </delete-file>

        system_message = {
            "role": "system", 
            "content": """
You are a world-class web developer who can create, edit, and delete files, and execute terminal commands. You write clean, well-structured code. Keep iterating on existing files, continue working on this existing codebase - do not omit previous progress; instead, keep iterating.

FORMAT:
Use XML tags to specify file operations:

<create-file file_path="path/to/file">
file contents here
</create-file>

<str-replace file_path="path/to/file" old_str="old_str" new_str="new_str">
</str-replace>

<delete-file file_path="path/to/file">
</delete-file>

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
        }

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

        model_name = "anthropic/claude-3-5-haiku-latest"

        registry = thread_manager.tool_registry 
        tool_parser = XMLToolParser(tool_registry=registry)
        tool_executor = XMLToolExecutor(parallel=True, tool_registry=registry)
        results_adder = XMLResultsAdder(thread_manager)

        response = await thread_manager.run_thread(
                    thread_id=thread_id,
                    system_message=system_message,
                    model_name=model_name,
                    temperature=0.1,
                    max_tokens=8096,
                    tool_choice="auto",
                    temporary_message=state_message,
                    use_tools=True,
                    native_tool_calling=False,
                    execute_tools=True,
                    stream=True,
                    immediate_tool_execution=True,
                    parallel_tool_execution=True,
                    tool_parser=tool_parser,
                    tool_executor=tool_executor,
                    results_adder=results_adder
                )
        
        if isinstance(response, AsyncGenerator):
            print("\n🤖 Assistant is responding:")
            try:
                async for chunk in response:
                    if hasattr(chunk.choices[0], 'delta'):
                        delta = chunk.choices[0].delta
                        
                        # Handle content streaming - print immediately without buffering
                        if hasattr(delta, 'content') and delta.content is not None:
                            print(delta.content, end='', flush=True)
                        
                        # Handle tool calls - print immediately
                        if hasattr(delta, 'tool_calls') and delta.tool_calls:
                            for tool_call in delta.tool_calls:
                                if tool_call.function:
                                    # Print tool name immediately when received
                                    if tool_call.function.name:
                                        print(f"\n🛠️  Tool Call: {tool_call.function.name}", flush=True)
                                    
                                    # Print arguments immediately when received
                                    if tool_call.function.arguments:
                                        print(f"   {tool_call.function.arguments}", end='', flush=True)
                
                print("\n✨ Response completed\n")
                
            except Exception as e:
                print(f"\n❌ Error processing stream: {e}", file=sys.stderr)
                logging.error(f"Error processing stream: {e}")
        else:
            print("\n❌ Non-streaming response received:", response)

        await after_iteration()

    await finalizer()

if __name__ == "__main__":
    async def main():
        thread_manager = ThreadManager()
        thread_id = await thread_manager.create_thread()

        await thread_manager.add_message(
            thread_id, 
            {
                "role": "user", 
                "content": "Create a modern, responsive landing page with HTML, CSS and JS."
            }
        )      

        await run_agent(thread_id)
    
    asyncio.run(main())