"""
Simplified test for sequential vs parallel tool execution.
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

async def test_execution():
    """Directly test sequential vs parallel execution."""
    print("\n" + "="*80)
    print("🧪 TESTING PARALLEL VS SEQUENTIAL EXECUTION")
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
    
    # Test sequential execution
    print("🔄 Testing Sequential Execution")
    print("-"*60)
    sequential_start = asyncio.get_event_loop().time()
    sequential_results = await thread_manager.response_processor._execute_tools(
        wait_tool_calls, 
        sequential=True,
        execution_strategy="sequential"
    )
    sequential_end = asyncio.get_event_loop().time()
    sequential_time = sequential_end - sequential_start
    
    print(f"Sequential execution completed in {sequential_time:.2f} seconds")
    print()
    
    # Test parallel execution
    print("⚡ Testing Parallel Execution")
    print("-"*60)
    parallel_start = asyncio.get_event_loop().time()
    parallel_results = await thread_manager.response_processor._execute_tools(
        wait_tool_calls, 
        sequential=False,
        execution_strategy="parallel"
    )
    parallel_end = asyncio.get_event_loop().time()
    parallel_time = parallel_end - parallel_start
    
    print(f"Parallel execution completed in {parallel_time:.2f} seconds")
    print()
    
    # Report results
    print("\n" + "="*80)
    print(f"🧮 RESULTS SUMMARY")
    print("="*80)
    print(f"Sequential: {sequential_time:.2f} seconds")
    print(f"Parallel: {parallel_time:.2f} seconds")
    print(f"Speedup: {sequential_time/parallel_time:.2f}x faster")
    
if __name__ == "__main__":
    try:
        asyncio.run(test_execution())
    except KeyboardInterrupt:
        print("\n\n❌ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error during test: {str(e)}")
        sys.exit(1) 