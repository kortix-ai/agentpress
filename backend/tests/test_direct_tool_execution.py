"""
Tests for direct tool execution in AgentPress.

This module tests the performance difference between sequential and parallel 
tool execution strategies by directly calling the execution methods without thread overhead.
"""

import os
import asyncio
import sys
from dotenv import load_dotenv
from agentpress.thread_manager import ThreadManager
from agentpress.response_processor import ProcessorConfig
from agent.tools.wait_tool import WaitTool
from agentpress.tool import ToolResult

# Load environment variables
load_dotenv()

async def test_direct_execution():
    """Directly test sequential vs parallel execution without thread overhead."""
    print("\n" + "="*80)
    print("🧪 TESTING DIRECT TOOL EXECUTION: PARALLEL VS SEQUENTIAL")
    print("="*80 + "\n")
    
    # Initialize ThreadManager and register tools
    thread_manager = ThreadManager()
    thread_manager.add_tool(WaitTool)
    
    # Create wait tool calls
    wait_tool_calls = [
        {"name": "wait", "arguments": {"seconds": 2, "message": "Wait tool 1"}},
        {"name": "wait", "arguments": {"seconds": 2, "message": "Wait tool 2"}}, 
        {"name": "wait", "arguments": {"seconds": 2, "message": "Wait tool 3"}}
    ]
    
    # Expected values for validation
    expected_tool_count = len(wait_tool_calls)
    
    # Test sequential execution
    print("🔄 Testing Sequential Execution")
    print("-"*60)
    sequential_start = asyncio.get_event_loop().time()
    sequential_results = await thread_manager.response_processor._execute_tools(
        wait_tool_calls, 
        execution_strategy="sequential"
    )
    sequential_end = asyncio.get_event_loop().time()
    sequential_time = sequential_end - sequential_start
    
    print(f"Sequential execution completed in {sequential_time:.2f} seconds")
    
    # Validate sequential results - results are a list of tuples (tool_call, tool_result)
    assert len(sequential_results) == expected_tool_count, f"❌ Expected {expected_tool_count} tool results, got {len(sequential_results)} in sequential execution"
    assert all(isinstance(result_tuple, tuple) and len(result_tuple) == 2 for result_tuple in sequential_results), "❌ Not all sequential results are tuples of (tool_call, result)"
    assert all(isinstance(result_tuple[1], ToolResult) for result_tuple in sequential_results), "❌ Not all sequential result values are ToolResult instances"
    assert all(result_tuple[1].success for result_tuple in sequential_results), "❌ Not all sequential tool executions were successful"
    print("✅ PASS: Sequential execution completed all tool calls successfully")
    print()
    
    # Test parallel execution
    print("⚡ Testing Parallel Execution")
    print("-"*60)
    parallel_start = asyncio.get_event_loop().time()
    parallel_results = await thread_manager.response_processor._execute_tools(
        wait_tool_calls, 
        execution_strategy="parallel"
    )
    parallel_end = asyncio.get_event_loop().time()
    parallel_time = parallel_end - parallel_start
    
    print(f"Parallel execution completed in {parallel_time:.2f} seconds")
    
    # Validate parallel results - results are a list of tuples (tool_call, tool_result)
    assert len(parallel_results) == expected_tool_count, f"❌ Expected {expected_tool_count} tool results, got {len(parallel_results)} in parallel execution"
    assert all(isinstance(result_tuple, tuple) and len(result_tuple) == 2 for result_tuple in parallel_results), "❌ Not all parallel results are tuples of (tool_call, result)"
    assert all(isinstance(result_tuple[1], ToolResult) for result_tuple in parallel_results), "❌ Not all parallel result values are ToolResult instances"
    assert all(result_tuple[1].success for result_tuple in parallel_results), "❌ Not all parallel tool executions were successful"
    print("✅ PASS: Parallel execution completed all tool calls successfully")
    print()
    
    # Report results
    print("\n" + "="*80)
    print(f"🧮 RESULTS SUMMARY")
    print("="*80)
    print(f"Sequential: {sequential_time:.2f} seconds")
    print(f"Parallel: {parallel_time:.2f} seconds")
    
    # Calculate and validate speedup
    speedup = sequential_time / parallel_time if parallel_time > 0 else 0
    print(f"Speedup: {speedup:.2f}x faster")
    
    # Validate speedup is significant (at least 1.5x faster)
    min_expected_speedup = 1.5
    assert speedup >= min_expected_speedup, f"❌ Expected parallel execution to be at least {min_expected_speedup}x faster than sequential, but got {speedup:.2f}x"
    print(f"✅ PASS: Parallel execution is {speedup:.2f}x faster than sequential as expected")
    
    # Ideal speedup should be close to the number of tools (3x)
    # But allow for some overhead (at least 1.5x)
    theoretical_max_speedup = len(wait_tool_calls)
    print(f"Note: Theoretical max speedup: {theoretical_max_speedup:.1f}x")
    
    print("\n" + "="*80)
    print("✅ ALL TESTS PASSED")
    print("="*80)
    
    # Return results for potential further analysis
    return {
        "sequential": {
            "time": sequential_time,
            "results": sequential_results
        },
        "parallel": {
            "time": parallel_time,
            "results": parallel_results
        },
        "speedup": speedup
    }
    
if __name__ == "__main__":
    try:
        asyncio.run(test_direct_execution())
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