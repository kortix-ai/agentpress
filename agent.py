from typing import Dict, Any
from agentpress.db import Database
from agentpress.thread_manager import ThreadAgent, ThreadManager
from agentpress.tool_registry import ToolRegistry

async def run_agent():
    db = Database()
    manager = ThreadManager(db)
    tool_registry = ToolRegistry()
    
    thread_id = await manager.create_thread()
    await manager.add_message(thread_id, {"role": "user", "content": "Let's create a Python + HTML website. Start by outlining the project structure. Use the available tools to create and edit files as needed."})
    
    tools = tool_registry.get_all_tools()
    
    async def initializer(agent):
        pass

    async def pre_iteration(iteration: int, agent: ThreadAgent):
        pass

    async def after_iteration(iteration: int, result: Dict[str, Any], agent: ThreadAgent):
        pass

    async def finalizer(status: str, agent: ThreadAgent):
        pass

    system_message = {
        "role": "system", 
        "content": "You are an expert AI Software Developer specializing in creating Python + HTML websites. Your task is to design, structure, and implement a website. Use the available tools to create and edit files for the project. Provide clear explanations and use the tools to implement code snippets directly into the appropriate files."
    }
    
    response = await manager.run_thread_agent(
        thread_id=thread_id,
        system_message=system_message,
        model_name="gpt-4",
        temperature=0.7,
        max_tokens=4096,
        autonomous_iterations_amount=3,
        continue_instructions="Continue developing the Python + HTML website. Focus on one aspect at a time, such as backend setup, frontend design, or specific features. Use the available tools to create new files or edit existing ones. Implement code snippets directly into the appropriate files using the tools.",
        initializer=initializer,
        pre_iteration=pre_iteration,
        after_iteration=after_iteration,
        finalizer=finalizer,
        tools=list(tools.keys())
    )
        
    return response

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_agent())
