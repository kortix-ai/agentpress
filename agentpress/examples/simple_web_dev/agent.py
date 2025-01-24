"""
Interactive web development agent supporting both XML and Standard LLM tool calling.

This agent can:
- Create and modify web projects
- Execute terminal commands
- Handle file operations
- Use either XML or Standard tool calling patterns
"""

import os
import asyncio
import json
from agentpress.thread_manager import ThreadManager
from tools.files_tool import FilesTool
from agentpress.state_manager import StateManager
from tools.terminal_tool import TerminalTool
from agentpress.api_factory import register_api_endpoint
import logging
from typing import AsyncGenerator, Optional, Dict, Any
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

def get_anthropic_api_key():
    """Get Anthropic API key from environment or prompt user."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        api_key = input("\n🔑 Please enter your Anthropic API key: ").strip()
        if not api_key:
            print("❌ No API key provided. Please set ANTHROPIC_API_KEY environment variable or enter a key.")
            sys.exit(1)
        os.environ["ANTHROPIC_API_KEY"] = api_key
    return api_key

@register_api_endpoint("/main_agent")
async def run_agent(
    thread_id: str,
    use_xml: bool = True,
    max_iterations: int = 5,
    project_description: Optional[str] = None
) -> Dict[str, Any]:
    """Run the development agent with specified configuration."""
    # Initialize managers
    thread_manager = ThreadManager()
    await thread_manager.initialize()
    
    state_manager = StateManager(thread_id)
    await state_manager.initialize()

    # Register tools
    thread_manager.add_tool(FilesTool, thread_id=thread_id)
    thread_manager.add_tool(TerminalTool, thread_id=thread_id)

    # Add initial project description if provided
    if project_description:
        await thread_manager.add_message(
            thread_id,
            {
                "role": "user",
                "content": project_description
            }
        )

    # Set up system message with appropriate format
    system_message = {
        "role": "system",
        "content": BASE_SYSTEM_MESSAGE + (XML_FORMAT if use_xml else "")
    }

    # Create initial event to track agent loop
    await thread_manager.create_event(
        thread_id=thread_id,
        event_type="agent_loop_started",
        content={
            "max_iterations": max_iterations,
            "use_xml": use_xml,
            "project_description": project_description
        },
        include_in_llm_message_history=False
    )

    results = []
    iteration = 0
    while iteration < max_iterations:
        iteration += 1
        
        files_tool = FilesTool(thread_id)
        await files_tool._init_workspace_state()

        state = await state_manager.get_latest_state()
        
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
            execute_tools_on_stream=False,
            parallel_tool_execution=True
        )

        # Handle both streaming and regular responses
        if hasattr(response, '__aiter__'):
            chunks = []
            try:
                async for chunk in response:
                    chunks.append(chunk)
            except Exception as e:
                logging.error(f"Error processing stream: {e}")
                raise
            response = chunks

        results.append({
            "iteration": iteration,
            "response": response
        })

        # Create iteration completion event
        await thread_manager.create_event(
            thread_id=thread_id,
            event_type="iteration_complete",
            content={
                "iteration_number": iteration,
                "max_iterations": max_iterations,
                # "state": state
            },
            include_in_llm_message_history=False
        )

    return {
        "thread_id": thread_id,
        "iterations": results,
    }

if __name__ == "__main__":
    print("\n🚀 Welcome to AgentPress Web Developer Example!")
    
    get_anthropic_api_key()
    
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
        logging.info(f"Created new thread: {thread_id}")
        await run_agent(thread_id, use_xml, project_description=project_description)

    asyncio.run(async_main())