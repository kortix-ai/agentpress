# AgentPress Tests

This directory contains tests for the AgentPress framework.

## Tool Execution Tests

### `test_tool_execution_strategies.py`

Tests the sequential and parallel tool execution strategies in a realistic environment with a thread and XML tool calls.
This test simulates the full interaction flow including:
1. Creating a thread
2. Adding messages with XML tool calls
3. Processing responses with different execution strategies
4. Measuring execution time and performance

Run with:
```bash
python -m tests.test_tool_execution_strategies
```

### `test_direct_tool_execution.py`

Provides a focused test of the tool execution strategies by directly calling the execution methods without thread overhead.
This test is designed to measure the pure performance difference between sequential and parallel execution.

Run with:
```bash
python -m tests.test_direct_tool_execution
```

### `test_xml_streaming_execution.py`

Tests XML tool execution in both streaming and non-streaming modes by setting the `execute_on_stream` parameter.
This test compares:
1. Non-streaming execution - where tools are executed after the complete response is received
2. Streaming execution - where tools are executed as soon as their XML tags are completed during streaming

Run with:
```bash
python -m tests.test_xml_streaming_execution
```

## Running Tests

To run all tests:
```bash
# From the project root
python -m pytest
```

To run a specific test:
```bash
# From the project root
python -m tests.test_direct_tool_execution
``` 