import os
import json
from agentpress.thread_manager import ThreadManager
from agent.tools.files_tool import FilesTool
from agent.tools.terminal_tool import TerminalTool
from typing import AsyncGenerator, Optional
from agent.prompt import INSTRUCTIONS

async def run_agent(thread_id: str, stream: bool = True, thread_manager: Optional[ThreadManager] = None):
    """Run the development agent with specified configuration."""
    
    if not thread_manager:
        thread_manager = ThreadManager()
    
    thread_manager.add_tool(FilesTool)
    thread_manager.add_tool(TerminalTool)
    system_message = {
        "role": "system",
        "content": INSTRUCTIONS
    }

    files_tool = FilesTool()
    files_state = await files_tool.get_workspace_state()

    state_message = {
        "role": "user",
        "content": f"""
Current development environment workspace state:
<current_workspace_state>
{json.dumps(files_state, indent=2)}
</current_workspace_state>
        """
    }

    model_name = "anthropic/claude-3-7-sonnet-latest"

    response = await thread_manager.run_thread(
        thread_id=thread_id,
        system_message=system_message,
        model_name=model_name,
        temperature=0.1,
        max_tokens=16000,
        tool_choice="auto",
        temporary_message=state_message,
        native_tool_calling=False,
        xml_tool_calling=True,
        stream=stream,
        execute_tools_on_stream=False,
        parallel_tool_execution=False        
    )
    
    if stream:
        if isinstance(response, AsyncGenerator):
            async for chunk in response:
                # print(f"\n[run.py] ===== CHUNK START =====")
                # print(f"[run.py] Raw chunk: {chunk}")
                # print(f"[run.py] Chunk type: {type(chunk)}")
                # print(f"[run.py] Chunk dir: {dir(chunk)}")
                if hasattr(chunk, 'choices'):
                    # print(f"[run.py] Choices: {chunk.choices}")
                    # print(f"[run.py] Choices type: {type(chunk.choices)}")
                    for i, choice in enumerate(chunk.choices):
                        # print(f"[run.py] Choice {i} dir: {dir(choice)}")
                        # print(f"[run.py] Choice {i} delta: {choice.delta}")
                        if hasattr(choice.delta, 'tool_calls'):
                            # print(f"[run.py] Tool calls: {choice.delta.tool_calls}")
                            pass
                # print(f"[run.py] ===== CHUNK END =====\n")
                yield str(chunk)  # Convert to string to ensure we capture everything
        else:
            # print(f"[run.py] Non-generator response: {response}")
            # print(f"[run.py] Response type: {type(response)}")
            # print(f"[run.py] Response dir: {dir(response)}")
            yield str(response)
    else:
        # print(f"[run.py] Non-streaming response: {response}")
        # print(f"[run.py] Response type: {type(response)}")
        # print(f"[run.py] Response dir: {dir(response)}")
        yield str(response)
