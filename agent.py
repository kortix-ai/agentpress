import asyncio
import json
from agentpress.thread_manager import ThreadManager
from tools.files_tool import FilesTool
from state_manager import StateManager

async def run_agent(
    thread_manager: ThreadManager,
    thread_id: int,
    state_manager: StateManager,
    max_iterations: int = 10
):

    async def init():
        pass

    async def pre_iteration():
        pass

    async def after_iteration():
        await thread_manager.add_message(thread_id, {"role": "user", "content": "CREATE MORE RANDOM FILES WITH RANDOM CONTENTS. JSUT CREATE IT – NO QUESTINS PLEASE.'"})
        pass

    async def finalizer():
        pass    

    await init()

    iteration = 0
    while iteration < max_iterations:
        iteration += 1
        await pre_iteration()

        # Get entire state store
        state = await state_manager.export_store()
        state_info = f"Current state store:\n{json.dumps(state, indent=2)}"

        system_message = {
            "role": "system", 
            "content": f"You are a helpful assistant that can create, read, update, and delete files.\n\n{state_info}"
        }
        model_name = "gpt-4o"

        # Include entire state in additional message
        # additional_message = {
        #     "role": "user",
        #     "content": state_info
        # }

        response = await thread_manager.run_thread(
                    thread_id=thread_id,
                    system_message=system_message,
                    model_name=model_name,
                    temperature=0.7,
                    max_tokens=150,
                    tool_choice="auto",
                    # additional_message=additional_message,            
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
        
        # Read current file contents
        files = await state_manager.get("files")
        
        await thread_manager.add_message(thread_id, {"role": "user", "content": "Please create a file with a random name with the content 'Hello, world!'"})

        thread_manager.add_tool(FilesTool)
        
        await run_agent(
            thread_manager=thread_manager,
            thread_id=thread_id,
            state_manager=state_manager,
            max_iterations=5
        )

    asyncio.run(main())
