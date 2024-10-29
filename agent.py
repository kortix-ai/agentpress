import asyncio
import json
from agentpress.thread_manager import ThreadManager
from tools.files_tool import FilesTool
from agentpress.state_manager import StateManager
from tools.terminal_tool import TerminalTool

async def run_agent(
    thread_manager: ThreadManager,
    thread_id: int,
    state_manager: StateManager,
    max_iterations: int = 10
):
    async def init():
        pass

    async def pre_iteration():
        # Update files state
        files_tool = FilesTool()
        await files_tool._init_workspace_state()
        
        terminal_tool = TerminalTool()
        await terminal_tool.get_command_history()

    async def after_iteration():
        await thread_manager.add_message(thread_id, {
            "role": "user", 
            "content": "Continue developing. "
        })

    async def finalizer():
        pass    

    await init()

    iteration = 0
    while iteration < max_iterations:
        iteration += 1
        await pre_iteration()

        # Get entire state store
        state = await state_manager.export_store()
        state_info = f"Current workspace state:\n{json.dumps(state, indent=2)}"

        system_message = {
            "role": "system", 
            "content": f"""You are a web developer who can create, read, update, and delete files, 
            and execute terminal commands. You write clean, well-structured code and explain your changes.

            Current workspace state:
            {state_info}
            
            Explain what you're doing before making changes."""
        }
        model_name = "anthropic/claude-3-5-sonnet-latest"

        response = await thread_manager.run_thread(
                    thread_id=thread_id,
                    system_message=system_message,
                    model_name=model_name,
                    temperature=0.7,
                    max_tokens=4096,
                    tool_choice="auto",
                    execute_tools_async=False,
                    use_tools=True,
                    execute_model_tool_calls=True                    
                )

        await after_iteration()

    await finalizer()


if __name__ == "__main__":
    async def main():
        thread_manager = ThreadManager()
        state_manager = StateManager("state.json")
        thread_id = await thread_manager.create_thread()
        
        thread_manager.add_tool(FilesTool)
        thread_manager.add_tool(TerminalTool)
        
        await thread_manager.add_message(
            thread_id, 
            {
                "role": "user", 
                "content": "Let's create a marketing website."
            }
        )

        await run_agent(
            thread_manager=thread_manager,
            thread_id=thread_id,
            state_manager=state_manager,
            max_iterations=5
        )

    asyncio.run(main())
