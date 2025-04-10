import json
from uuid import uuid4
from typing import Optional

from dotenv import load_dotenv

from agentpress.thread_manager import ThreadManager
from agentpress.response_processor import ProcessorConfig
from agent.tools.sb_browse_tool import SandboxBrowseTool
from agent.tools.sb_shell_tool import SandboxShellTool
from agent.tools.sb_website_tool import SandboxWebsiteTool
from agent.tools.sb_files_tool import SandboxFilesTool
from agent.prompt import get_system_prompt
from agent.tools.utils.daytona_sandbox import daytona, create_sandbox
from daytona_api_client.models.workspace_state import WorkspaceState
load_dotenv()

async def run_agent(thread_id: str, project_id: str, stream: bool = True, thread_manager: Optional[ThreadManager] = None, native_max_auto_continues: int = 25):
    """Run the development agent with specified configuration."""
    
    if not thread_manager:
        thread_manager = ThreadManager()
    
    client = await thread_manager.db.client
    ## probably want to move to api.py
    project = await client.table('projects').select('*').eq('project_id', project_id).execute()
    if project.data[0]['sandbox_id']:
        sandbox_id = project.data[0]['sandbox_id']
        sandbox_pass = project.data[0]['sandbox_pass']
        sandbox = daytona.get_current_sandbox(sandbox_id)
        if sandbox.instance.state == WorkspaceState.ARCHIVED or sandbox.instance.state == WorkspaceState.STOPPED:
            try:
                daytona.start(sandbox)
            except Exception as e:
                print(f"Error starting sandbox: {e}")
                raise e
    else:
        sandbox_pass = str(uuid4())
        sandbox = create_sandbox(sandbox_pass)
        await client.table('projects').update({ 'sandbox_id': sandbox.id, 'sandbox_pass': sandbox_pass }).eq('project_id', project_id).execute()
    ### ---

    print("Adding tools to thread manager...")
    thread_manager.add_tool(SandboxBrowseTool, sandbox=sandbox)
    thread_manager.add_tool(SandboxWebsiteTool, sandbox=sandbox)
    thread_manager.add_tool(SandboxShellTool, sandbox=sandbox)
    thread_manager.add_tool(SandboxFilesTool, sandbox=sandbox)

    system_message = { "role": "system", "content": get_system_prompt() }

    # model_name = "anthropic/claude-3-5-sonnet-latest" 
    model_name = "bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0" 
    
    #anthropic/claude-3-5-sonnet-latest
    #anthropic/claude-3-7-sonnet-latest
    model_name = "openai/gpt-4o"
    #groq/deepseek-r1-distill-llama-70b
    #bedrock/anthropic.claude-3-7-sonnet-20250219-v1:0

    files_tool = SandboxFilesTool(sandbox=sandbox)

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
        tool_choice="auto",
        max_xml_tool_calls=1,
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
        thread_result = await client.table('projects').insert({"name": "test", "user_id": "68e1da55-0749-49db-937a-ff56bf0269a0"}).execute()
        thread_result = await client.table('threads').insert({'project_id': thread_result.data[0]['project_id']}).execute()
        thread_data = thread_result.data[0] if thread_result.data else None
        
        if not thread_data:
            print("Error: No thread data returned")
            return
            
        thread_id = thread_data['thread_id']
        project_id = thread_data['project_id']
    except Exception as e:
        print(f"Error creating thread: {str(e)}")
        return
        
    print(f"\n🤖 Agent Thread Created: {thread_id}\n")
    
    # Interactive message input loop
    while True:
        # Get user input
        user_message = input("\n💬 Enter your message (or 'exit' to quit): ")
        if user_message.lower() == 'exit':
            break
        
        if not user_message.strip():
            print("\n🔄 Running agent...\n")
            await process_agent_response(thread_id, project_id, thread_manager)
            continue
            
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
        
        print("\n🔄 Running agent...\n")
        await process_agent_response(thread_id, project_id, thread_manager)
    
    print("\n👋 Test completed. Goodbye!")

async def process_agent_response(thread_id: str, project_id: str, thread_manager: ThreadManager):
    """Process the streaming response from the agent."""
    chunk_counter = 0
    current_response = ""
    tool_call_counter = 0  # Track number of tool calls
    
    async for chunk in run_agent(thread_id=thread_id, project_id=project_id, stream=True, thread_manager=thread_manager, native_max_auto_continues=25):
        chunk_counter += 1
        
        if chunk.get('type') == 'content' and 'content' in chunk:
            current_response += chunk.get('content', '')
            # Print the response as it comes in
            print(chunk.get('content', ''), end='', flush=True)
        elif chunk.get('type') == 'tool_result':
            # Add timestamp and format tool result nicely
            tool_name = chunk.get('function_name', 'Tool')
            result = chunk.get('result', '')
            print(f"\n\n🛠️  TOOL RESULT [{tool_name}] → {result}")
        elif chunk.get('type') == 'tool_call':
            # Display native tool call chunks as they arrive
            tool_call = chunk.get('tool_call', {})
            
            # Check if it's a meaningful part of the tool call to display
            args = tool_call.get('function', {}).get('arguments', '')
            
            # Only show when we have substantial arguments or a function name
            should_display = (
                len(args) > 3 or  # More than just '{}'
                tool_call.get('function', {}).get('name')  # Or we have a name
            )
            
            if should_display:
                tool_call_counter += 1
                tool_name = tool_call.get('function', {}).get('name', 'Building...')
                
                # Print tool call header with counter and tool name
                print(f"\n🔧 TOOL CALL #{tool_call_counter} [{tool_name}]")
                
                # Try to parse and pretty print the arguments if they're JSON
                try:
                    # Check if it's complete JSON or just a fragment
                    if args.strip().startswith('{') and args.strip().endswith('}'):
                        args_obj = json.loads(args)
                        # Only print non-empty args to reduce clutter
                        if args_obj and args_obj != {}:
                            # Format JSON with nice indentation and color indicators for readability
                            print(f"  ARGS: {json.dumps(args_obj, indent=2)}")
                    else:
                        # Only print if there's actual content to show
                        if args.strip():
                            print(f"  ARGS: {args}")
                except json.JSONDecodeError:
                    if args.strip():
                        print(f"  ARGS: {args}")
                
                # Add a separator for visual clarity
                print("  " + "-" * 40)
                
                # Return to the current content display
                if current_response:
                    print("\nContinuing response:", flush=True)
                    print(current_response, end='', flush=True)
        elif chunk.get('type') == 'tool_status':
            # Log tool status changes
            status = chunk.get('status', '')
            function_name = chunk.get('function_name', '')
            if status and function_name:
                status_emoji = "✅" if status == "completed" else "⏳" if status == "started" else "❌"
                print(f"\n{status_emoji} TOOL {status.upper()}: {function_name}")
        elif chunk.get('type') == 'finish':
            # Just log finish reason to console but don't show to user
            finish_reason = chunk.get('finish_reason', '')
            if finish_reason:
                print(f"\n📌 Finished: {finish_reason}")
    
    print(f"\n\n✅ Agent run completed with {tool_call_counter} tool calls")

if __name__ == "__main__":
    import asyncio
    
    # Configure any environment variables or setup needed for testing
    load_dotenv()  # Ensure environment variables are loaded
    
    # Run the test function
    asyncio.run(test_agent())