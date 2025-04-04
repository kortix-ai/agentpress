"""
Tests for tool execution strategies in AgentPress.

This module tests both sequential and parallel execution strategies using the WaitTool
in a realistic thread with XML tool calls.
"""

import os
import asyncio
import sys
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

async def test_execution_strategies():
    """Test both sequential and parallel execution strategies in a thread."""
    print("\n" + "="*80)
    print("🧪 TESTING TOOL EXECUTION STRATEGIES")
    print("="*80 + "\n")
    
    # Initialize ThreadManager and register tools
    thread_manager = ThreadManager()
    thread_manager.add_tool(WaitTool)
    
    # Create a test thread
    thread_id = await thread_manager.create_thread()
    print(f"🧵 Created test thread: {thread_id}\n")
    
    # Add system message
    await thread_manager.add_message(
        thread_id,
        {
            "role": "system",
            "content": "You are a testing assistant that will execute wait commands."
        }
    )
    
    # Test both strategies
    test_cases = [
        {"name": "Sequential", "strategy": "sequential", "content": TOOL_XML_SEQUENTIAL},
        {"name": "Parallel", "strategy": "parallel", "content": TOOL_XML_PARALLEL}
    ]
    
    # Expected values for validation
    expected_tool_count = 6  # 3 wait calls + 3 wait-sequence calls (count=3)
    test_results = {}
    
    for test in test_cases:
        print("\n" + "-"*60)
        print(f"🔍 Testing {test['name']} Execution Strategy")
        print("-"*60 + "\n")
        
        # Add special assistant message with tool calls
        # This simulates an LLM response with tool calls
        await thread_manager.add_message(
            thread_id,
            {
                "role": "assistant",
                "content": test["content"]
            }
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
        
        # Get the last message to process
        messages = await thread_manager.get_messages(thread_id)
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
        tool_results = []
        
        async for chunk in thread_manager.response_processor.process_non_streaming_response(
            llm_response=mock_response,
            thread_id=thread_id,
            config=config
        ):
            if chunk.get('type') == 'tool_result':
                elapsed = asyncio.get_event_loop().time() - start_time
                print(f"⏱️ [{elapsed:.2f}s] Tool result: {chunk['name']}")
                print(f"   {chunk['result']}")
                print()
                tool_execution_count += 1
                tool_results.append(chunk)
        
        end_time = asyncio.get_event_loop().time()
        elapsed = end_time - start_time
        print(f"\n⏱️ {test['name']} execution completed in {elapsed:.2f} seconds")
        
        # Store results for validation
        test_results[test['name']] = {
            'execution_time': elapsed,
            'tool_count': tool_execution_count,
            'tool_results': tool_results
        }
        
        # Assert correct number of tool executions
        assert tool_execution_count == expected_tool_count, f"❌ Expected {expected_tool_count} tool executions, got {tool_execution_count} in {test['name']} strategy"
        print(f"✅ PASS: {test['name']} executed {tool_execution_count} tools as expected")
    
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
    
    # Check if all tool calls returned success status
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