import os
import json
from agentpress.thread_manager import ThreadManager
from agent.tools.files_tool import FilesTool
from agent.tools.terminal_tool import TerminalTool
from agent.tools.search_tool import CodeSearchTool
from typing import AsyncGenerator, Optional
from agent.prompt import get_system_prompt

async def run_agent(thread_id: str, stream: bool = True, thread_manager: Optional[ThreadManager] = None):
    """Run the development agent with specified configuration."""
    
    if not thread_manager:
        thread_manager = ThreadManager()
    
    thread_manager.add_tool(FilesTool)
    thread_manager.add_tool(TerminalTool)
    thread_manager.add_tool(CodeSearchTool)
    system_message = {
        "role": "system",
        "content": get_system_prompt()
    }

#     files_tool = FilesTool()
#     files_state = await files_tool.get_workspace_state()

#     state_message = {
#         "role": "user",
#         "content": f"""
# Current development environment workspace state:
# <current_workspace_state>
# {json.dumps(files_state, indent=2)}
# </current_workspace_state>
#         """
#     }

    model_name = "anthropic/claude-3-7-sonnet-latest" #anthropic/claude-3-7-sonnet-latest

    response = await thread_manager.run_thread(
        thread_id=thread_id,
        system_message=system_message,
        model_name=model_name,
        temperature=0.1,
        max_tokens=64000,
        tool_choice="auto",
        # temporary_message=state_message,
        native_tool_calling=False,
        xml_tool_calling=True,
        stream=stream,
        execute_tools_on_stream=True,
        parallel_tool_execution=False        
    )
    
    # All responses are now async generators yielding formatted responses
    async for chunk in response:
        yield chunk
