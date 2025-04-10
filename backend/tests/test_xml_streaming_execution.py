"""
Tests for XML tool execution in streaming and non-streaming modes.

This module tests XML tool execution with execute_on_stream set to TRUE and FALSE,
to ensure both modes work correctly with the WaitTool.
"""

import os
import asyncio
import sys
from unittest.mock import AsyncMock, patch
from dotenv import load_dotenv
from agentpress.thread_manager import ThreadManager
from agentpress.response_processor import ProcessorConfig
from agent.tools.wait_tool import WaitTool

# Load environment variables
load_dotenv()

# XML content with wait tool calls
XML_CONTENT = """
Here are some examples of using the wait tool:

<wait seconds="1">This is wait 1</wait>
<wait seconds="1">This is wait 2</wait>
<wait seconds="1">This is wait 3</wait>

Now wait sequence:
<wait-sequence count="2" seconds="1" label="Test" />
"""

class MockStreamingResponse:
    """Mock streaming response from an LLM."""
    
    def __init__(self, content):
        self.content = content
        self.chunk_size = 20  # Small chunks to simulate streaming
        
    async def __aiter__(self):
        # Split content into chunks to simulate streaming
        for i in range(0, len(self.content), self.chunk_size):
            chunk = self.content[i:i+self.chunk_size]
            yield type('obj', (object,), {
                'choices': [type('obj', (object,), {
                    'delta': type('obj', (object,), {
                        'content': chunk
                    })
                })]
            })
            # Simulate some network delay
            await asyncio.sleep(0.1)

class MockNonStreamingResponse:
    """Mock non-streaming response from an LLM."""
    
    def __init__(self, content):
        self.choices = [type('obj', (object,), {
            'message': type('obj', (object,), {
                'content': content
            })
        })]

# Create a simple mock function that logs instead of accessing the database
async def mock_add_message(thread_id, message):
    print(f"MOCK: Adding message to thread {thread_id}")
    print(f"MOCK: Message role: {message.get('role')}")
    print(f"MOCK: Content length: {len(message.get('content', ''))}")
    return {"id": "mock-message-id", "thread_id": thread_id}

async def test_xml_streaming_execution():
    """Test XML tool execution in both streaming and non-streaming modes."""
    print("\n" + "="*80)
    print("🧪 TESTING XML TOOL EXECUTION: STREAMING VS NON-STREAMING")
    print("="*80 + "\n")
    
    # Initialize ThreadManager and register tools
    thread_manager = ThreadManager()
    thread_manager.add_tool(WaitTool)
    
    # Mock both ThreadManager's and ResponseProcessor's add_message method
    thread_manager.add_message = AsyncMock(side_effect=mock_add_message)
    thread_manager.response_processor.add_message = AsyncMock(side_effect=mock_add_message)
    
    # Set up the get_llm_messages mock
    original_get_llm_messages = thread_manager.get_llm_messages
    thread_manager.get_llm_messages = AsyncMock()
    
    # Test cases for streaming and non-streaming
    test_cases = [
        {"name": "Non-Streaming", "execute_on_stream": False},
        {"name": "Streaming", "execute_on_stream": True}
    ]
    
    # Expected values for validation - focus specifically on wait tools
    expected_wait_count = 3  # 3 wait tags in the XML content
    test_results = {}

    for test in test_cases:
        # Create a test thread ID - we're mocking so no actual creation
        thread_id = f"test-thread-{test['name'].lower()}"
        
        print("\n" + "-"*60)
        print(f"🔍 Testing XML Tool Execution - {test['name']} Mode")
        print("-"*60 + "\n")
        
        # Setup mock for get_llm_messages to return test content
        thread_manager.get_llm_messages.return_value = [
            {
                "role": "system",
                "content": "You are a testing assistant that will execute wait commands."
            },
            {
                "role": "assistant", 
                "content": XML_CONTENT
            }
        ]
        
        # Simulate adding system message (mocked)
        print(f"MOCK: Adding system message to thread {thread_id}")
        await thread_manager.add_message(
            thread_id=thread_id,
            type="system",
            content={
                "role": "system",
                "content": "You are a testing assistant that will execute wait commands."
            },
            is_llm_message=False
        )
        
        # Simulate adding message with XML content (mocked)
        print(f"MOCK: Adding message with XML content to thread {thread_id}")
        await thread_manager.add_message(
            thread_id=thread_id,
            type="assistant",
            content={
                "role": "assistant",
                "content": XML_CONTENT
            },
            is_llm_message=True
        )
        
        print(f"🧵 Using test thread: {thread_id}")
        print(f"⚙️ execute_on_stream: {test['execute_on_stream']}")
        
        # Prepare the response processor config
        config = ProcessorConfig(
            xml_tool_calling=True,
            native_tool_calling=False,
            execute_tools=True,
            execute_on_stream=test['execute_on_stream'],
            tool_execution_strategy="sequential"
        )
        
        # Get the last message to process (using mock)
        messages = await thread_manager.get_llm_messages(thread_id)
        last_message = messages[-1]
        
        # Process response based on mode
        start_time = asyncio.get_event_loop().time()
        
        print(f"⏱️ Starting execution at {start_time:.2f}s")
        tool_execution_count = 0
        wait_tool_count = 0
        tool_results = []
        
        if test['execute_on_stream']:
            # Create streaming response
            streaming_response = MockStreamingResponse(last_message["content"])
            
            # Process streaming response
            async for chunk in thread_manager.response_processor.process_streaming_response(
                llm_response=streaming_response,
                thread_id=thread_id,
                config=config
            ):
                if chunk.get('type') == 'tool_result':
                    elapsed = asyncio.get_event_loop().time() - start_time
                    tool_name = chunk.get('name', '')
                    tool_execution_count += 1
                    if tool_name == 'wait':
                        wait_tool_count += 1
                        
                    print(f"⏱️ [{elapsed:.2f}s] Tool result: {chunk['name']}")
                    print(f"   {chunk['result']}")
                    print()
                    tool_results.append(chunk)
        else:
            # Create non-streaming response
            non_streaming_response = MockNonStreamingResponse(last_message["content"])
            
            # Process non-streaming response
            async for chunk in thread_manager.response_processor.process_non_streaming_response(
                llm_response=non_streaming_response,
                thread_id=thread_id,
                config=config
            ):
                if chunk.get('type') == 'tool_result':
                    elapsed = asyncio.get_event_loop().time() - start_time
                    tool_name = chunk.get('name', '')
                    tool_execution_count += 1
                    if tool_name == 'wait':
                        wait_tool_count += 1
                        
                    print(f"⏱️ [{elapsed:.2f}s] Tool result: {chunk['name']}")
                    print(f"   {chunk['result']}")
                    print()
                    tool_results.append(chunk)
        
        end_time = asyncio.get_event_loop().time()
        elapsed = end_time - start_time
        
        print(f"\n⏱️ {test['name']} execution completed in {elapsed:.2f} seconds")
        print(f"🔢 Total tool executions: {tool_execution_count}")
        print(f"🔢 Wait tool executions: {wait_tool_count}")
        
        # Store results for validation
        test_results[test['name']] = {
            'execution_time': elapsed,
            'tool_count': tool_execution_count,
            'wait_count': wait_tool_count,
            'tool_results': tool_results
        }
        
        # Assert correct number of wait tool executions
        assert wait_tool_count == expected_wait_count, f"❌ Expected {expected_wait_count} wait tool executions, got {wait_tool_count} in {test['name']} mode"
        print(f"✅ PASS: {test['name']} executed {wait_tool_count} wait tools as expected")
    
    # Restore original get_llm_messages method
    thread_manager.get_llm_messages = original_get_llm_messages
    
    # Additional assertions for both test cases
    assert 'Non-Streaming' in test_results, "❌ Non-streaming test not completed"
    assert 'Streaming' in test_results, "❌ Streaming test not completed"
    
    # Validate streaming has different timing characteristics than non-streaming
    non_streaming_time = test_results['Non-Streaming']['execution_time']
    streaming_time = test_results['Streaming']['execution_time']
    
    # Streaming should have different timing due to the nature of execution
    # We don't assert strict timing as it can vary, but we validate the tests ran successfully
    print(f"\n⏱️ Execution time comparison:")
    print(f"   Non-Streaming: {non_streaming_time:.2f}s")
    print(f"   Streaming: {streaming_time:.2f}s")
    print(f"   Time difference: {abs(non_streaming_time - streaming_time):.2f}s")
    
    # Check if all results have a status field
    all_have_status = all(
        'status' in result
        for test_data in test_results.values() 
        for result in test_data['tool_results']
    )
    
    # If results have a status field, check if they're all successful
    if all_have_status:
        all_successful = all(
            result.get('status') == 'success' 
            for test_data in test_results.values() 
            for result in test_data['tool_results']
        )
        assert all_successful, "❌ Not all tool executions were successful"
        print("✅ PASS: All tool executions completed successfully")
    
    print("\n" + "="*80)
    print("✅ ALL TESTS PASSED")
    print("="*80 + "\n")
    
    return test_results

if __name__ == "__main__":
    try:
        asyncio.run(test_xml_streaming_execution())
        print("\n✅ Test completed successfully")
        sys.exit(0)
    except AssertionError as e:
        print(f"\n\n❌ Test failed: {str(e)}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n❌ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error during test: {str(e)}")
        sys.exit(1) 