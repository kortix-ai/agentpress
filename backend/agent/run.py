import os
import json
import uuid
from agentpress.thread_manager import ThreadManager
from agent.tools.files_tool import FilesTool
from agent.tools.terminal_tool import TerminalTool
# from agent.tools.search_tool import CodeSearchTool
from typing import Optional
from agent.prompt import get_system_prompt
from agentpress.response_processor import ProcessorConfig
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def run_agent(thread_id: str, stream: bool = True, thread_manager: Optional[ThreadManager] = None, native_max_auto_continues: int = 25):
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

    model_name = "anthropic/claude-3-5-sonnet-latest" 
    
    #anthropic/claude-3-7-sonnet-latest
    #openai/gpt-4o
    #groq/deepseek-r1-distill-llama-70b
    #bedrock/anthropic.claude-3-7-sonnet-20250219-v1:0

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
        tool_choice="any",
        processor_config=ProcessorConfig(
            xml_tool_calling=False,
            native_tool_calling=True,
            execute_tools=True,
            execute_on_stream=True,
            tool_execution_strategy="parallel",
            xml_adding_strategy="user_message"
        ),
        native_max_auto_continues=native_max_auto_continues
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
        tool_call_counter = 0  # Track number of tool calls
        
        async for chunk in run_agent(thread_id=thread_id, stream=True, thread_manager=thread_manager, native_max_auto_continues=25):
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
            elif chunk.get('type') == 'tool_call_chunk':
                # Display native tool call chunks as they arrive
                tool_call = chunk.get('tool_call', {})
                
                # Check if it's a meaningful part of the tool call to display
                if tool_call.get('function', {}).get('arguments'):
                    args = tool_call.get('function', {}).get('arguments', '')
                    
                    # Only show when we have substantial arguments or a function name
                    should_display = (
                        len(args) > 3 or  # More than just '{}'
                        tool_call.get('function', {}).get('name')  # Or we have a name
                    )
                    
                    if should_display:
                        tool_call_counter += 1
                        print("\n" + "-"*50)
                        print(f"🔧 Tool Call #{tool_call_counter}: {tool_call.get('function', {}).get('name', 'Building...')}")
                        
                        # Try to parse and pretty print the arguments if they're JSON
                        try:
                            # Check if it's complete JSON or just a fragment
                            if args.strip().startswith('{') and args.strip().endswith('}'):
                                args_obj = json.loads(args)
                                print(f"📋 Arguments: {json.dumps(args_obj, indent=2)}")
                            else:
                                print(f"📋 Arguments (partial): {args}")
                        except json.JSONDecodeError:
                            print(f"📋 Arguments (building): {args}")
                            
                        print("-"*50)
                        
                        # Return to the current content display
                        if current_response:
                            print("\nContinuing response:", flush=True)
                            print(current_response, end='', flush=True)
            elif chunk.get('type') == 'finish':
                # Just log finish reason to console but don't show to user
                finish_reason = chunk.get('finish_reason', 'unknown')
                print(f"\n[Debug] Received finish_reason: {finish_reason}")
        
        print("\n" + "="*50)
        print(f"✅ Agent completed. Processed {chunk_counter} chunks.")
        if tool_call_counter > 0:
            print(f"🔧 Found {tool_call_counter} native tool calls.")
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