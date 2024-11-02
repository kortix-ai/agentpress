import asyncio
import json
from agentpress.thread_manager import ThreadManager
from tools.files_tool import FilesTool
from agentpress.state_manager import StateManager
from tools.terminal_tool import TerminalTool

async def run_agent(thread_id: str, max_iterations: int = 5):
    # Initialize managers and tools
    thread_manager = ThreadManager()
    state_manager = StateManager()
    
    thread_manager.add_tool(FilesTool)
    thread_manager.add_tool(TerminalTool)
    
    await thread_manager.add_message(
        thread_id, 
        {
            "role": "user", 
            "content": "Let's create a marketing website for my AI Agent 'Jarvis' using HTML, CSS, Javascript. Use images from pixabay, pexels, and co. Style it cyberpunk style. Make it like Ironmen Jarvis."
        }
    )

    async def init():
        pass

    async def pre_iteration():
        # Update files state
        files_tool = FilesTool()
        await files_tool._init_workspace_state()

    async def after_iteration():
        # Ask the user for a custom message or use the default
        custom_message = input("Enter a message to send (or press Enter to use 'Continue!!!' as message): ")
        message_content = custom_message if custom_message else "Continue!!!"
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
        
        print(response)

        # Call after_iteration without arguments
        await after_iteration()

    await finalizer()


if __name__ == "__main__":
    async def main():
        thread_manager = ThreadManager()
        thread_id = await thread_manager.create_thread()
        await run_agent(thread_id)
    
    asyncio.run(main())