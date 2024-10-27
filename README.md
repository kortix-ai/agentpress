# AgentPress: LLM Messages[] API on Steroids called "Threads" with automatic Tool Execution and simple state management.

AgentPress is a lightweight, powerful utility for kickstarting your LLM App or AI Agent. It provides a simple way to manage message threads, execute LLM calls, and automatically handle tool interactions.

## Key Features

- **Thread Management**: Easily create, update, and manage message threads.
- **Automatic Tool Execution**: Define tools as Python classes and have them automatically called by the LLM.
- **Flexible LLM Integration**: Uses LiteLLM under the hood, allowing easy switching between different LLM providers.
- **State Management**: JSON-based state persistence for storing information, tool data, and runtime state.


## Quick Start

1. Clone the repository:
   ```
   git clone https://github.com/kortix-ai/agentpress
   cd agentpress
   ```

2. Install Poetry (if not already installed):
   ```
   pip install poetry
   ```

3. Install dependencies using Poetry:
   ```
   poetry install
   ```

4. Run with poetry:
   ```
   poetry run python agent.py 
   ```

5. Set up your environment variables (API keys, etc.) in a `.env` file.

6. Create a simple tool:
   ```python
   from agentpress.tool import Tool, ToolResult, tool_schema

   class CalculatorTool(Tool):
       @tool_schema({
           "name": "add",
           "description": "Add two numbers",
           "parameters": {
               "type": "object",
               "properties": {
                   "a": {"type": "number"},
                   "b": {"type": "number"}
               },
               "required": ["a", "b"]
           }
       })
       async def add(self, a: float, b: float) -> ToolResult:
           return self.success_response(f"The sum is {a + b}")
   ```

7. Use the ThreadManager to run a conversation:
   ```python
   import asyncio
   from agentpress.thread_manager import ThreadManager

   async def main():
       manager = ThreadManager()
       manager.add_tool(CalculatorTool)
       thread_id = await manager.create_thread()
       await manager.add_message(thread_id, {"role": "user", "content": "What's 2 + 2?"})
       system_message = {"role": "system", "content": "You are a helpful assistant with calculation abilities."}
       response = await manager.run_thread(
           thread_id=thread_id,
           system_message=system_message,
           model_name="gpt-4o",
           execute_model_tool_calls=True
       )
       print("Response:", response)

   asyncio.run(main())
   ```


8. Create an autonomous agent with multiple iterations:
   ```python
   import asyncio
   from agentpress.thread_manager import ThreadManager
   from tools.files_tool import FilesTool

   async def run_autonomous_agent(max_iterations=5):
       thread_manager = ThreadManager()
       thread_id = await thread_manager.create_thread()
       thread_manager.add_tool(FilesTool)

       system_message = {"role": "system", "content": "You are a helpful assistant that can create, read, update, and delete files."}

       for iteration in range(max_iterations):
           print(f"Iteration {iteration + 1}/{max_iterations}")
           
            await thread_manager.add_message(thread_id, {"role": "user", "content": "Continue!"})

           response = await thread_manager.run_thread(
               thread_id=thread_id,
               system_message=system_message,
               model_name="anthropic/claude-3-5-sonnet-20240620",
               temperature=0.7,
               max_tokens=4096,
               tool_choice="auto",
               execute_tools_async=False,
               execute_model_tool_calls=True
           )

   if __name__ == "__main__":
       asyncio.run(run_autonomous_agent())
   ```

   This example demonstrates how to create an autonomous agent that runs for a specified number of iterations. It uses the `FilesTool` to interact with the file system and showcases how to control the behavior of `run_thread` by adjusting parameters like `temperature`, `max_tokens`, and `tool_choice`. The agent creates files autonomously.


## Contributing

We welcome contributions to AgentPress! Please feel free to submit issues, fork the repository and send pull requests!

## License

[MIT License](LICENSE)

Built with ❤️ by [Kortix AI Corp](https://www.kortix.ai)







