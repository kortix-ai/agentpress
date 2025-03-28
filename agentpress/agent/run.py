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
from agentpress.framework.thread_manager import ThreadManager
from agentpress.tools.files_tool import FilesTool
from agentpress.framework.state_manager import StateManager
from agentpress.tools.terminal_tool import TerminalTool
from typing import AsyncGenerator, Optional, Dict, Any
import sys

BASE_SYSTEM_MESSAGE = """
You are a world-class game developer who can create, edit, and delete files, and execute terminal commands. 
You write clean, well-structured code for game-based applications. Keep iterating on existing files, continue working on this existing 
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
  "game.js": {
    "content": "const game = {\\n  init() {\\n    // Game initialization code\\n  }\\n};"
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


async def run_agent(thread_id: str, stream: bool = True, use_xml: bool = True, state_message: Optional[Dict[str, Any]] = None, max_iterations: int = 1, thread_manager: Optional[ThreadManager] = None, state_manager: Optional[StateManager] = None, store_id: Optional[str] = None):
    """Run the development agent with specified configuration."""
    
    if not thread_manager:
        thread_manager = ThreadManager()
    if not store_id:
        store_id = await StateManager.create_store()
    if not state_manager:
        state_manager = StateManager(store_id)
    
    thread_manager.add_tool(FilesTool, store_id=store_id)
    thread_manager.add_tool(TerminalTool, store_id=store_id)

    system_message = {
        "role": "system",
        "content": BASE_SYSTEM_MESSAGE + (XML_FORMAT if use_xml else "")
    }

    async def pre_iteration():
        files_tool = FilesTool()
        await files_tool._init_workspace_state()

    iteration = 0
    while iteration < max_iterations:
        iteration += 1
        await pre_iteration()

        if not state_message:
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
            stream=stream,
            execute_tools_on_stream=True,
            parallel_tool_execution=True
        )
        
        if stream:
            if isinstance(response, AsyncGenerator):
                async for chunk in response:
                    if hasattr(chunk.choices[0], 'delta'):
                        delta = chunk.choices[0].delta
                        
                        if hasattr(delta, 'content') and delta.content is not None:
                            yield f"data: {json.dumps({'type': 'content', 'content': delta.content})}\n\n"
                        
                        if hasattr(delta, 'tool_calls') and delta.tool_calls:
                            for tool_call in delta.tool_calls:
                                if tool_call.function:
                                    tool_data = {
                                        'type': 'tool_call',
                                        'name': tool_call.function.name if tool_call.function.name else '',
                                        'arguments': tool_call.function.arguments if tool_call.function.arguments else ''
                                    }
                                    yield f"data: {json.dumps(tool_data)}\n\n"
            else:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Invalid response type'})}\n\n"
        else:
            if isinstance(response, AsyncGenerator):
                full_response = []
                async for chunk in response:
                    if hasattr(chunk.choices[0], 'delta'):
                        delta = chunk.choices[0].delta
                        if hasattr(delta, 'content') and delta.content is not None:
                            full_response.append(delta.content)
                yield f"data: {json.dumps({'type': 'content', 'content': ''.join(full_response)})}\n\n"
            else:
                yield f"data: {json.dumps({'type': 'content', 'content': response})}\n\n"
