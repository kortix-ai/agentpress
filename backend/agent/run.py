import os
import json
from agentpress.thread_manager import ThreadManager
from agent.tools.files_tool import FilesTool
from agent.tools.terminal_tool import TerminalTool
# from agent.tools.search_tool import CodeSearchTool
from typing import AsyncGenerator, Optional
from agent.test_prompt import get_system_prompt
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def run_agent(thread_id: str, stream: bool = True, thread_manager: Optional[ThreadManager] = None):
    """Run the development agent with specified configuration."""
    
    if not thread_manager:
        thread_manager = ThreadManager()
    
    print("Adding tools to thread manager...")
    thread_manager.add_tool(FilesTool)
    thread_manager.add_tool(TerminalTool)
    # thread_manager.add_tool(CodeSearchTool)
    
    system_message = {
        "role": "system",
        "content": get_system_prompt()
    }

    model_name = "anthropic/claude-3-7-sonnet-latest" #groq/deepseek-r1-distill-llama-70b

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
    print("Starting thread_manager.run_thread...")
    # Force XML tool usage by setting native_tool_calling=False
    response = await thread_manager.run_thread(
        thread_id=thread_id,
        system_prompt=system_message,
        stream=stream,
        temporary_message=state_message,
        llm_model=model_name,
        llm_temperature=0.1,
        llm_max_tokens=64000,
        llm_native_tool_calling_choice="auto",
        native_tool_calling=False,  # Use only XML tools for consistency
        xml_tool_calling=True,
        execute_tools=True,
        execute_on_stream=True,
        execute_tool_sequentially=True
    )
    
    print("Starting to iterate through response chunks...")
    chunk_counter = 0
    
    # Check if response is an error dict
    if isinstance(response, dict) and "status" in response and response["status"] == "error":
        print(f"Error running agent: {response}")
        yield response  # Yield the error as a single chunk
        return
        
    # If it's an async generator, iterate through it
    async for chunk in response:
        chunk_counter += 1
        print(f"Agent yielding chunk #{chunk_counter}: {chunk}")
        yield chunk
    
    print(f"Finished run_agent with {chunk_counter} chunks yielded")



async def test_agent():
    """Test function to run the agent with a sample query"""
    from agentpress.thread_manager import ThreadManager
    
    # Initialize ThreadManager
    thread_manager = ThreadManager()
    
    # Create a test thread
    thread_id = await thread_manager.create_thread()
    print(f"Created test thread: {thread_id}")
    
    # Interactive message input loop
    while True:
        # Get user input
        user_message = input("\nEnter your message (or 'exit' to quit): ")
        if user_message.lower() == 'exit':
            break
            
        # Add the user message to the thread
        await thread_manager.add_message(
            thread_id,
            {
                "role": "user",
                "content": user_message
            }
        )
        
        # Run the agent and print results
        print("\nRunning agent...")
        chunk_counter = 0
        async for chunk in run_agent(thread_id=thread_id, stream=True, thread_manager=thread_manager):
            chunk_counter += 1
            print(f"Received chunk #{chunk_counter}: {chunk}")
        
        print(f"\nIteration completed. Received {chunk_counter} chunks total.")
    
    print("\nTest completed. Exiting...")

if __name__ == "__main__":
    import asyncio
    
    # Configure any environment variables or setup needed for testing
    load_dotenv()  # Ensure environment variables are loaded
    
    # Run the test function
    asyncio.run(test_agent())

