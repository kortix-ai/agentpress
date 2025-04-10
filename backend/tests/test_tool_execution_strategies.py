"""
Tests for tool execution strategies in AgentPress.

This module tests both sequential and parallel execution strategies using the WaitTool
in a realistic thread with XML tool calls.
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

TOOL_XML_SEQUENTIAL = """
Here are some examples of using the wait tool:

<wait seconds="2">This is sequential wait 1</wait>
<wait seconds="2">This is sequential wait 2</wait>
<wait seconds="2">This is sequential wait 3</wait>

Now wait sequence:
<wait-sequence count="3" seconds="1" label="Sequential Test" />
"""

TOOL_XML_PARALLEL = """
Here are some examples of using the wait tool:

<wait seconds="2">This is parallel wait 1</wait>
<wait seconds="2">This is parallel wait 2</wait>
<wait seconds="2">This is parallel wait 3</wait>

Now wait sequence:
<wait-sequence count="3" seconds="1" label="Parallel Test" />
"""

# Create a simple mock function that logs instead of accessing the database
async def mock_add_message(thread_id, message):
    print(f"MOCK: Adding message to thread {thread_id}")
    print(f"MOCK: Message role: {message.get('role')}")
    print(f"MOCK: Content length: {len(message.get('content', ''))}")
    return {"id": "mock-message-id", "thread_id": thread_id}

async def test_execution_strategies():
    """Test both sequential and parallel execution strategies in a thread."""
    print("\n" + "="*80)
    print("🧪 TESTING TOOL EXECUTION STRATEGIES")
    print("="*80 + "\n")
    
    # Initialize ThreadManager and register tools
    thread_manager = ThreadManager()
    thread_manager.add_tool(WaitTool)
    
    # Mock both ThreadManager's and ResponseProcessor's add_message method
    thread_manager.add_message = AsyncMock(side_effect=mock_add_message)
    # This is crucial - the ResponseProcessor receives add_message as a callback
    thread_manager.response_processor.add_message = AsyncMock(side_effect=mock_add_message)

    # Create a test thread - we'll use a dummy ID since we're mocking the database
    thread_id = "test-thread-id"
    print(f"🧵 Using test thread: {thread_id}\n")
    
    # Set up the get_llm_messages mock
    original_get_llm_messages = thread_manager.get_llm_messages
    thread_manager.get_llm_messages = AsyncMock()
    
    # Test both strategies
    test_cases = [
        {"name": "Sequential", "strategy": "sequential", "content": TOOL_XML_SEQUENTIAL},
        {"name": "Parallel", "strategy": "parallel", "content": TOOL_XML_PARALLEL}
    ]
    
    # Expected values for validation - this varies based on XML parsing
    # For reliable testing, we look at <wait> tags which we know are being parsed
    expected_wait_count = 3  # 3 wait tags per test
    test_results = {}
    
    for test in test_cases:
        print("\n" + "-"*60)
        print(f"🔍 Testing {test['name']} Execution Strategy")
        print("-"*60 + "\n")
        
        # Setup mock for get_llm_messages to return our test content
        thread_manager.get_llm_messages.return_value = [
            {
                "role": "system",
                "content": "You are a testing assistant that will execute wait commands."
            },
            {
                "role": "assistant",
                "content": test["content"]
            }
        ]
        
        # Simulate adding message (mocked)
        print(f"MOCK: Adding test message with {test['name']} execution strategy content")
        await thread_manager.add_message(
            thread_id=thread_id,
            type="assistant",
            content={
                "role": "assistant",
                "content": test["content"]
            },
            is_llm_message=True
        )
        
        start_time = asyncio.get_event_loop().time()
        print(f"⏱️ Starting execution with {test['strategy']} strategy at {start_time:.2f}s")
        
        # Process the response with appropriate strategy
        config = ProcessorConfig(
            xml_tool_calling=True,
            native_tool_calling=False,
            execute_tools=True,
            execute_on_stream=False,
            tool_execution_strategy=test["strategy"]
        )
        
        # Get the last message to process (mocked)
        messages = await thread_manager.get_llm_messages(thread_id)
        last_message = messages[-1]
        
        # Create a simple non-streaming response object
        class MockResponse:
            def __init__(self, content):
                self.choices = [type('obj', (object,), {
                    'message': type('obj', (object,), {
                        'content': content
                    })
                })]
        
        mock_response = MockResponse(last_message["content"])
        
        # Process using the response processor
        tool_execution_count = 0
        wait_tool_count = 0
        tool_results = []
        
        async for chunk in thread_manager.response_processor.process_non_streaming_response(
            llm_response=mock_response,
            thread_id=thread_id,
            config=config
        ):
            if chunk.get('type') == 'tool_result':
                tool_name = chunk.get('name', '')
                tool_execution_count += 1
                if tool_name == 'wait':
                    wait_tool_count += 1
                
                elapsed = asyncio.get_event_loop().time() - start_time
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
        
        # Assert correct number of wait tools executions (this is more reliable than total count)
        assert wait_tool_count == expected_wait_count, f"❌ Expected {expected_wait_count} wait tool executions, got {wait_tool_count} in {test['name']} strategy"
        print(f"✅ PASS: {test['name']} executed {wait_tool_count} wait tools as expected")
    
    # Restore original get_llm_messages method
    thread_manager.get_llm_messages = original_get_llm_messages
    
    # Additional assertions for both test cases
    assert 'Sequential' in test_results, "❌ Sequential test not completed"
    assert 'Parallel' in test_results, "❌ Parallel test not completed"
    
    # Validate parallel is faster than sequential for multiple wait tools
    sequential_time = test_results['Sequential']['execution_time']
    parallel_time = test_results['Parallel']['execution_time']
    speedup = sequential_time / parallel_time if parallel_time > 0 else 0
    
    # Parallel should be faster than sequential (at least 1.5x speedup expected)
    print(f"\n⏱️ Execution time comparison:")
    print(f"   Sequential: {sequential_time:.2f}s")
    print(f"   Parallel: {parallel_time:.2f}s")
    print(f"   Speedup: {speedup:.2f}x")
    
    min_expected_speedup = 1.5
    assert speedup >= min_expected_speedup, f"❌ Expected parallel execution to be at least {min_expected_speedup}x faster than sequential, but got {speedup:.2f}x"
    print(f"✅ PASS: Parallel execution is {speedup:.2f}x faster than sequential")
    
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
        asyncio.run(test_execution_strategies())
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