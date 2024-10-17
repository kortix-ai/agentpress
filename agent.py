import asyncio
from agentpress.db import Database
from agentpress.thread_manager import ThreadManager
from tools.files_tool import FilesTool

async def run_agent():
    db = Database()
    manager = ThreadManager(db)
    
    thread_id = await manager.create_thread()
    await manager.add_message(thread_id, {"role": "user", "content": "Let's have a conversation about artificial intelligence and create a file summarizing our discussion."})
    
    system_message = {"role": "system", "content": "You are an AI expert engaging in a conversation about artificial intelligence. You can also create and manage files."}
    
    files_tool = FilesTool()
    tool_schemas = files_tool.get_schemas()

    def initializer():
        print("Initializing thread run...")
        manager.run_config['temperature'] = 0.8

    def pre_iteration():
        print(f"Preparing iteration {manager.current_iteration}...")
        manager.run_config['max_tokens'] = 200 if manager.current_iteration > 3 else 150

    def after_iteration():
        print(f"Completed iteration {manager.current_iteration}. Status: {manager.run_config['status']}")
        manager.run_config['continue_instructions'] = "Let's focus more on AI ethics in the next iteration and update our summary file."

    def finalizer():
        print(f"Thread run finished with status: {manager.run_config['status']}")
        print(f"Final configuration: {manager.run_config}")

    settings = {
        "thread_id": thread_id,
        "system_message": system_message,
        "model_name": "gpt-4",
        "temperature": 0.7,
        "max_tokens": 150,
        "autonomous_iterations_amount": 3,
        "continue_instructions": "Continue the conversation about AI, introducing new aspects or asking thought-provoking questions. Don't forget to update our summary file.",
        "initializer": initializer,
        "pre_iteration": pre_iteration,
        "after_iteration": after_iteration,
        "finalizer": finalizer,
        "tools": list(tool_schemas.keys()),
        "tool_choice": "auto"
    }

    response = await manager.run_thread(settings)
    
    print(f"Thread run response: {response}")

    messages = await manager.list_messages(thread_id)
    print("\nFinal conversation:")
    for msg in messages:
        print(f"{msg['role'].capitalize()}: {msg['content']}")

if __name__ == "__main__":
    asyncio.run(run_agent())
