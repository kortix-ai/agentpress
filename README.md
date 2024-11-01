# AgentPress: Building Blocks for AI Agents

AgentPress is not a agent framework - it's a collection of lightweight, modular utilities that serve as building blocks for creating AI agents. Think of it as "shadcn/ui for AI agents" - a set of utils to copy, paste, and customize in order to quickly bootstrap your AI App / Agent.

AgentPress provides Messages[] API on Steroids called "Threads", a ThreadManager with automatic Tool Execution and a simple StateManager.
- **Threads**: Simple message thread handling utilities
- **Automatic Tool**: Flexible tool definition and automatic execution
- **State Management**: Basic JSON-based state persistence
- **LLM Integration**: Provider-agnostic LLM calls via LiteLLM

## Installation & Setup

1. Install the package:
```bash
pip install agentpress
```

2. Initialize AgentPress in your project:
```bash
agentpress init
```
This will create a `agentpress` directory with the core utilities you can customize.


3. If you selected the example agent during initialization:
   - Creates an `agent.py` file with a web development agent example
   - Creates a `tools` directory with example tools:
     - `files_tool.py`: File operations (create/update files, read directory and load into state)
     - `terminal_tool.py`: Terminal command execution
   - Creates a `workspace` directory for the agent to work in


## Quick Start

1. Set up your environment variables (API keys, etc.) in a `.env` file.

2. Create a tool - copy this code directly into your project:
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

3. Use the Thread Manager - customize as needed:
```python
import asyncio
from agentpress.thread_manager import ThreadManager

async def main():
    manager = ThreadManager()
    manager.add_tool(CalculatorTool)
    thread_id = await manager.create_thread()
    
    # Add your custom logic here
    await manager.add_message(thread_id, {
        "role": "user", 
        "content": "What's 2 + 2?"
    })
    
    response = await manager.run_thread(
        thread_id=thread_id,
        system_message={
            "role": "system", 
            "content": "You are a helpful assistant with calculation abilities."
        },
        model_name="gpt-4",
        use_tools=True,
        execute_model_tool_calls=True
    )
    print("Response:", response)

asyncio.run(main())
```

## Building Your Own Agent

Example of a customized autonomous agent:
```python
import asyncio
from agentpress.thread_manager import ThreadManager
from your_custom_tools import CustomTool

async def run_agent(max_iterations=5):
    # Create your own manager instance
    manager = ThreadManager()
    thread_id = await manager.create_thread()
    
    # Add your custom tools
    manager.add_tool(CustomTool)
    
    # Define your agent's behavior
    system_message = {
        "role": "system",
        "content": "Your custom system message here"
    }
    
    # Implement your control loop
    for iteration in range(max_iterations):
        response = await manager.run_thread(
            thread_id=thread_id,
            system_message=system_message,
            model_name="your-preferred-model",
            # Customize parameters as needed
        )
        
        # Add your custom logic here
        process_response(response)

if __name__ == "__main__":
    asyncio.run(run_agent())
```

## Development

1. Clone for reference:
```bash
git clone https://github.com/kortix-ai/agentpress
cd agentpress
```

2. Install dependencies:
```bash
pip install poetry
poetry install
```

## Philosophy

- **Modular**: Pick and choose what you need. Each component is designed to work independently.
- **Agnostic**: Built on LiteLLM, supporting any LLM provider. Minimal opinions, maximum flexibility.
- **Simplicity**: Clean, readable code that's easy to understand and modify.
- **Plug & Play**: Start with our defaults, then customize to your needs.
- **No Lock-in**: Take full ownership of the code. Copy what you need directly into your codebase.

## Contributing

We welcome contributions! Feel free to:
- Submit issues for bugs or suggestions
- Fork the repository and send pull requests
- Share how you've used AgentPress in your projects

## License

[MIT License](LICENSE)

Built with ❤️ by [Kortix AI Corp](https://kortix.ai)