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

    model_name = "anthropic/claude-3-7-sonnet-latest"

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
