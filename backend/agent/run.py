import os
import json
import uuid
from agentpress.thread_manager import ThreadManager, ToolChoice
from agent.tools.files_tool import FilesTool
from agent.tools.terminal_tool import TerminalTool
from agent.tools.wait_tool import WaitTool
# from agent.tools.search_tool import CodeSearchTool
from typing import Optional
from agent.test_prompt import get_system_prompt
from agentpress.response_processor import ProcessorConfig
from dotenv import load_dotenv
from services.supabase import DBConnection

# Load environment variables
load_dotenv()

async def run_agent(thread_id: str, stream: bool = True, thread_manager: Optional[ThreadManager] = None):
    """Run the development agent with specified configuration."""
    
    if not thread_manager:
        thread_manager = ThreadManager()
    
    print("Adding tools to thread manager...")
    thread_manager.add_tool(FilesTool)
    thread_manager.add_tool(TerminalTool)
    thread_manager.add_tool(WaitTool)
    # thread_manager.add_tool(CodeSearchTool)
    
    system_message = {
        "role": "system",
        "content": get_system_prompt()
    }

    model_name = "anthropic/claude-3-5-sonnet-latest" #groq/deepseek-r1-distill-llama-70b

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

    response = await thread_manager.run_thread(
        thread_id=thread_id,
        system_prompt=system_message,
        stream=stream,
        temporary_message=state_message,
        llm_model=model_name,
        llm_temperature=0.1,
        llm_max_tokens=8000,
        processor_config=ProcessorConfig(
            xml_tool_calling=True,
            native_tool_calling=False,
            execute_tools=True,
            execute_on_stream=True,
            tool_execution_strategy="sequential",
            xml_adding_strategy="assistant_message"
        )
    )
        
    if isinstance(response, dict) and "status" in response and response["status"] == "error":
        yield response 
        return
        
    async for chunk in response:
        yield chunk
    

async def test_agent():
    """Test function to run the agent with a sample query"""
    from agentpress.thread_manager import ThreadManager
    from services.supabase import DBConnection
    
    # Initialize ThreadManager
    thread_manager = ThreadManager()
    
    # Create a test thread directly with Postgres function
    client = await DBConnection().client
    
    try:
        thread_result = await client.table('threads').insert({}).execute()
        thread_data = thread_result.data[0] if thread_result.data else None
        
        if not thread_data:
            print("Error: No thread data returned")
            return
            
        thread_id = thread_data['thread_id']
    except Exception as e:
        print(f"Error creating thread: {str(e)}")
        return
        
    print("\n" + "="*50)
    print(f"🤖 Agent Thread Created: {thread_id}")
    print("="*50 + "\n")
    
    # Interactive message input loop
    while True:
        # Get user input
        user_message = input("\n💬 Enter your message (or 'exit' to quit): ")
        if user_message.lower() == 'exit':
            break
            
        # Add the user message to the thread
        await thread_manager.add_message(
            thread_id=thread_id,
            type="user",
            content={
                "role": "user",
                "content": user_message
            },
            is_llm_message=True
        )
        
        # Run the agent and print results
        print("\n" + "="*50)
        print("🔄 Running agent...")
        print("="*50 + "\n")
        
        chunk_counter = 0
        current_response = ""
        
        async for chunk in run_agent(thread_id=thread_id, stream=True, thread_manager=thread_manager):
            chunk_counter += 1
            
            if chunk.get('type') == 'content':
                current_response += chunk['content']
                # Print the response as it comes in
                print(chunk['content'], end='', flush=True)
            elif chunk.get('type') == 'tool_result':
                print("\n\n" + "="*50)
                print(f"🛠️ Tool Result: {chunk.get('function_name', 'Unknown Tool')}")
                print(f"📝 {chunk.get('result', chunk)}")
                print("="*50 + "\n")
        
        print("\n" + "="*50)
        print(f"✅ Agent completed. Processed {chunk_counter} chunks.")
        print("="*50 + "\n")
    
    print("\n" + "="*50)
    print("👋 Test completed. Goodbye!")
    print("="*50 + "\n")

if __name__ == "__main__":
    import asyncio
    
    # Configure any environment variables or setup needed for testing
    load_dotenv()  # Ensure environment variables are loaded
    
    # Run the test function
    asyncio.run(test_agent())
