import os
import json
from uuid import uuid4
from typing import Optional

# from agent.tools.message_tool import MessageTool
from agent.tools.message_tool import MessageTool
from agent.tools.sb_deploy_tool import SandboxDeployTool
from agent.tools.web_search_tool import WebSearchTool
from dotenv import load_dotenv

from agentpress.thread_manager import ThreadManager
from agentpress.response_processor import ProcessorConfig
from agent.tools.sb_shell_tool import SandboxShellTool
from agent.tools.sb_files_tool import SandboxFilesTool
from agent.tools.sb_browser_tool import SandboxBrowserTool
from agent.tools.data_providers_tool import DataProvidersTool
from agent.prompt import get_system_prompt
from sandbox.sandbox import create_sandbox, get_or_start_sandbox
from utils.billing import check_billing_status, get_account_id_from_thread

load_dotenv()

async def run_agent(thread_id: str, project_id: str, sandbox, stream: bool = True, thread_manager: Optional[ThreadManager] = None, native_max_auto_continues: int = 25, max_iterations: int = 150):
    """Run the development agent with specified configuration."""
    
    if not thread_manager:
        thread_manager = ThreadManager()
    client = await thread_manager.db.client

    # Get account ID from thread for billing checks
    account_id = await get_account_id_from_thread(client, thread_id)
    if not account_id:
        raise ValueError("Could not determine account ID for thread")

    # Note: Billing checks are now done in api.py before this function is called
    
    thread_manager.add_tool(SandboxShellTool, sandbox=sandbox)
    thread_manager.add_tool(SandboxFilesTool, sandbox=sandbox)
    thread_manager.add_tool(SandboxBrowserTool, sandbox=sandbox, thread_id=thread_id, thread_manager=thread_manager)
    thread_manager.add_tool(SandboxDeployTool, sandbox=sandbox)
    thread_manager.add_tool(MessageTool) # we are just doing this via prompt as there is no need to call it as a tool
 
    if os.getenv("EXA_API_KEY"):
        thread_manager.add_tool(WebSearchTool)
    
    if os.getenv("RAPID_API_KEY"):
        thread_manager.add_tool(DataProvidersTool)

    xml_examples = ""
    for tag_name, example in thread_manager.tool_registry.get_xml_examples().items():
        xml_examples += f"{example}\n"

    system_message = { "role": "system", "content": get_system_prompt() + "\n\n" + f"<tool_examples>\n{xml_examples}\n</tool_examples>" }

    iteration_count = 0
    continue_execution = True
    
    while continue_execution and iteration_count < max_iterations:
        iteration_count += 1
        print(f"Running iteration {iteration_count}...")

        # Billing check on each iteration - still needed within the iterations
        can_run, message, subscription = await check_billing_status(client, account_id)
        if not can_run:
            error_msg = f"Billing limit reached: {message}"
            # Yield a special message to indicate billing limit reached
            yield {
                "type": "status",
                "status": "stopped",
                "message": error_msg
            }
            break
        
        # Check for termination signals in the messages
        should_terminate, termination_reason = await check_for_termination_signals(client, thread_id)
        if should_terminate:
            print(f"Terminating execution: {termination_reason}")
            continue_execution = False
            break
            
        # Get the latest browser state message if available
        latest_browser_state = await client.table('messages').select('*').eq('thread_id', thread_id).eq('type', 'browser_state').order('created_at', desc=True).limit(1).execute()
        temporary_message = None
        if latest_browser_state.data and len(latest_browser_state.data) > 0:
            try:
                content = json.loads(latest_browser_state.data[0]["content"])
                screenshot_base64 = content["screenshot_base64"]
                # Create a copy of the browser state without screenshot
                browser_state = content.copy()
                browser_state.pop('screenshot_base64', None)
                browser_state.pop('screenshot_url', None) 
                browser_state.pop('screenshot_url_base64', None)
                temporary_message = { "role": "user", "content": [] }
                if browser_state:
                    temporary_message["content"].append({
                        "type": "text",
                        "text": f"The following is the current state of the browser:\n{browser_state}"
                    })
                if screenshot_base64:
                    temporary_message["content"].append({
                        "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{screenshot_base64}",
                            }
                    })
                else:
                    print("@@@@@ THIS TIME NO SCREENSHOT!!")
            except Exception as e:
                print(f"Error parsing browser state: {e}")
                # print(latest_browser_state.data[0])

        try:
            # Track if we see ask or complete tool calls
            last_tool_call = None
            response = await thread_manager.run_thread(
                thread_id=thread_id,
                system_prompt=system_message,
                stream=stream,
                llm_model=os.getenv("MODEL_TO_USE", "anthropic/claude-3-7-sonnet-latest"),
                llm_temperature=0,
                llm_max_tokens=64000,
                tool_choice="auto",
                max_xml_tool_calls=1,
                temporary_message=temporary_message,
                processor_config=ProcessorConfig(
                    xml_tool_calling=True,
                    native_tool_calling=False,
                    execute_tools=True,
                    execute_on_stream=True,
                    tool_execution_strategy="parallel",
                    xml_adding_strategy="user_message"
                ),
                native_max_auto_continues=native_max_auto_continues,
                include_xml_examples=True,
            )
                
            if isinstance(response, dict) and "status" in response and response["status"] == "error":
                yield response 
                break
                
            try:
                # Store XML content across chunks for better detection
                accumulated_xml_content = ""
                
                async for chunk in response:
                    # Check if this is a tool call chunk for ask or complete
                    if chunk.get('type') == 'tool_call':
                        tool_call = chunk.get('tool_call', {})
                        function_name = tool_call.get('function', {}).get('name', '')
                        if function_name in ['ask', 'complete']:
                            last_tool_call = function_name
                            print(f"Detected native tool call: {function_name}")
                            
                    # Check for XML versions like <ask> or <complete> in content chunks
                    elif chunk.get('type') == 'content' and 'content' in chunk:
                        content = chunk.get('content', '')
                        # Accumulate content for more reliable XML detection
                        accumulated_xml_content += content
                        
                        # Check for complete XML tags
                        if '<ask>' in accumulated_xml_content and '</ask>' in accumulated_xml_content:
                            last_tool_call = 'ask'
                            print(f"Detected XML ask tool")
                            
                        if '<complete>' in accumulated_xml_content and '</complete>' in accumulated_xml_content:
                            last_tool_call = 'complete'
                            print(f"Detected XML complete tool")
                            
                    # Check if content has a tool call completion status
                    elif chunk.get('type') == 'tool_status':
                        status = chunk.get('status')
                        function_name = chunk.get('function_name', '')
                        
                        if status == 'completed' and function_name in ['ask', 'complete']:
                            last_tool_call = function_name
                            print(f"Detected completed tool call status for: {function_name}")
                            
                    # Check tool result messages for ask/complete tools
                    elif chunk.get('type') == 'tool_result':
                        function_name = chunk.get('name', '')
                        if function_name in ['ask', 'complete']:
                            last_tool_call = function_name
                            print(f"Detected tool result for: {function_name}")
                            
                    # Always yield the chunk to the client
                    yield chunk
                    
                    # Check if we should stop immediately after processing this chunk
                    if last_tool_call in ['ask', 'complete']:
                        print(f"Agent decided to stop with tool: {last_tool_call}")
                        continue_execution = False
                        
                        # Add a clear status message to the database to signal termination
                        await client.table('messages').insert({
                            'thread_id': thread_id,
                            'type': 'status',
                            'content': json.dumps({
                                "status_type": "agent_termination",
                                "reason": f"Tool '{last_tool_call}' executed"
                            }),
                            'is_llm_message': False,
                            'metadata': json.dumps({"termination_signal": True})
                        }).execute()
                        
                        # We don't break here to ensure all chunks are yielded,
                        # but the next iteration won't start due to continue_execution = False
                
            except Exception as stream_error:
                print(f"Error during stream processing: {str(stream_error)}")
                yield {
                    "type": "status",
                    "status": "error",
                    "message": f"Stream processing error: {str(stream_error)}"
                }
                break
            
            # Double-check termination condition after all chunks processed
            if last_tool_call in ['ask', 'complete']:
                print(f"Confirming termination after stream with tool: {last_tool_call}")
                continue_execution = False
        except Exception as e:
            print(f"Error running thread manager: {str(e)}")
            yield {
                "type": "status",
                "status": "error",
                "message": f"Thread manager error: {str(e)}"
            }
            break

async def check_for_termination_signals(client, thread_id):
    """Check database for signals that should terminate the agent execution."""
    try:
        # Check the last message type first
        latest_message = await client.table('messages').select('*').eq('thread_id', thread_id).order('created_at', desc=True).limit(1).execute()
        if latest_message.data and len(latest_message.data) > 0:
            message_type = latest_message.data[0].get('type')
            
            # If last message is from assistant, stop execution
            if message_type == 'assistant':
                return True, "Last message was from assistant"
                
            # Check for tool-related termination signals
            if message_type == 'tool':
                try:
                    content = json.loads(latest_message.data[0].get('content', '{}'))
                    if content.get('name') in ['ask', 'complete']:
                        return True, f"Tool '{content.get('name')}' was executed"
                except:
                    pass
                    
            # Check for special status messages with termination signals
            if message_type == 'status':
                try:
                    content = json.loads(latest_message.data[0].get('content', '{}'))
                    metadata = json.loads(latest_message.data[0].get('metadata', '{}'))
                    
                    # Check for explicit termination signal in metadata
                    if metadata.get('termination_signal') == True:
                        return True, "Explicit termination signal found"
                        
                    # Check for agent_termination status type
                    if content.get('status_type') == 'agent_termination':
                        return True, content.get('reason', 'Agent termination status found')
                except:
                    pass
                    
        # Also look for specific ask/complete tool execution in recent messages
        recent_tool_messages = await client.table('messages').select('*').eq('thread_id', thread_id).eq('type', 'tool').order('created_at', desc=True).limit(5).execute()
        if recent_tool_messages.data:
            for msg in recent_tool_messages.data:
                try:
                    content = json.loads(msg.get('content', '{}'))
                    if isinstance(content, dict) and content.get('role') == 'tool':
                        tool_name = content.get('name', '')
                        if tool_name in ['ask', 'complete']:
                            return True, f"Recent '{tool_name}' tool execution found"
                except:
                    continue
                    
        return False, None
    except Exception as e:
        print(f"Error checking for termination signals: {e}")
        return False, None

# TESTING

async def test_agent():
    """Test function to run the agent with a sample query"""
    from agentpress.thread_manager import ThreadManager
    from services.supabase import DBConnection
    
    # Initialize ThreadManager
    thread_manager = ThreadManager()
    
    # Create a test thread directly with Postgres function
    client = await DBConnection().client
    
    try:
        # Get user's personal account
        account_result = await client.rpc('get_personal_account').execute()
        
        # if not account_result.data:
        #     print("Error: No personal account found")
        #     return
            
        account_id = "a5fe9cb6-4812-407e-a61c-fe95b7320c59"
        
        if not account_id:
            print("Error: Could not get account ID")
            return
        
        # Find or create a test project in the user's account
        project_result = await client.table('projects').select('*').eq('name', 'test11').eq('account_id', account_id).execute()
        
        if project_result.data and len(project_result.data) > 0:
            # Use existing test project
            project_id = project_result.data[0]['project_id']
            print(f"\n🔄 Using existing test project: {project_id}")
        else:
            # Create new test project if none exists
            project_result = await client.table('projects').insert({
                "name": "test11", 
                "account_id": account_id
            }).execute()
            project_id = project_result.data[0]['project_id']
            print(f"\n✨ Created new test project: {project_id}")
        
        # Create a thread for this project
        thread_result = await client.table('threads').insert({
            'project_id': project_id,
            'account_id': account_id
        }).execute()
        thread_data = thread_result.data[0] if thread_result.data else None
        
        if not thread_data:
            print("Error: No thread data returned")
            return
            
        thread_id = thread_data['thread_id']
    except Exception as e:
        print(f"Error setting up thread: {str(e)}")
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
    
    # Create a test sandbox for processing
    sandbox_pass = str(uuid4())
    sandbox = create_sandbox(sandbox_pass)
    print(f"\033[91mTest sandbox created: {sandbox.get_preview_link(6080)}/vnc_lite.html?password={sandbox_pass}\033[0m")
    
    async for chunk in run_agent(thread_id=thread_id, project_id=project_id, sandbox=sandbox, stream=True, thread_manager=thread_manager, native_max_auto_continues=25):
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