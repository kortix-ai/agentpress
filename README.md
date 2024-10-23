# AgentPress

AgentPress is a powerful framework for creating AI agents, with the ThreadManager at its core. This system simplifies the process of building, configuring, and running AI agents that can engage in conversations, perform tasks, and interact with various tools.

## Key Concept: ThreadManager

The ThreadManager is the central component of AgentPress. It manages conversation threads, handles tool integrations, and coordinates the execution of AI models. Here's why it's crucial:

1. **Conversation Management**: It creates and manages threads, allowing for coherent multi-turn conversations.
2. **Tool Integration**: It integrates various tools that the AI can use to perform tasks.
3. **Model Execution**: It handles the execution of AI models, managing the context and responses.
4. **State Management**: It maintains the state of conversations and tool executions across multiple turns.

## How It Works

1. **Create a ThreadManager**: This is your first step in using AgentPress.
2. **Add Tools**: Register any tools your agent might need.
3. **Create a Thread**: Each conversation or task execution is managed in a thread.
4. **Run the Thread**: Execute the AI model within the context of the thread, optionally using tools.

## Standalone Example

Here's how to use the ThreadManager standalone:

```python
import asyncio
from agentpress.thread_manager import ThreadManager
from tools.files_tool import FilesTool

async def main():
    # Create a ThreadManager instance
    thread_manager = ThreadManager()

    # Add a tool
    thread_manager.add_tool(FilesTool)

    # Create a new thread
    thread_id = await thread_manager.create_thread()

    # Add an initial message to the thread
    await thread_manager.add_message(thread_id, {"role": "user", "content": "Create a file named 'hello.txt' with the content 'Hello, World!'"})

    # Run the thread
    response = await thread_manager.run_thread(
        thread_id=thread_id,
        system_message={"role": "system", "content": "You are a helpful assistant that can create and manage files."},
        model_name="gpt-4",
        temperature=0.7,
        max_tokens=150,
        tool_choice="auto"
    )

    # Print the response
    print(response)

    # You can continue the conversation by adding more messages and running the thread again
    await thread_manager.add_message(thread_id, {"role": "user", "content": "Now read the contents of 'hello.txt'"})

    response = await thread_manager.run_thread(
        thread_id=thread_id,
        system_message={"role": "system", "content": "You are a helpful assistant that can create and manage files."},
        model_name="gpt-4",
        temperature=0.7,
        max_tokens=150,
        tool_choice="auto"
    )

    print(response)

if __name__ == "__main__":
    asyncio.run(main())
```

This example demonstrates how to:
1. Create a ThreadManager
2. Add a tool (FilesTool)
3. Create a new thread
4. Add messages to the thread
5. Run the thread, which executes the AI model and potentially uses tools
6. Continue the conversation with additional messages and thread runs

## Building More Complex Agents

While the ThreadManager can be used standalone, it's also the foundation for building more complex agents. You can create custom agent behaviors by defining initialization, pre-iteration, post-iteration, and finalization steps, setting up loops for autonomous iterations, and implementing custom logic for when and how to run threads.

Here's an example of a more complex agent implementation using the `run_agent` function:

```python
async def run_agent(
    thread_manager: ThreadManager,
    thread_id: int,
    max_iterations: int = 10
):
    async def init():
        # Initialization code here
        pass

    async def pre_iteration():
        # Pre-iteration code here
        pass

    async def after_iteration():
        # Post-iteration code here
        await thread_manager.add_message(thread_id, {"role": "user", "content": "CREATE MORE RANDOM FILES WITH RANDOM CONTENTS. JUST CREATE IT – NO QUESTIONS PLEASE."})

    async def finalizer():
        # Finalization code here
        pass    

    await init()

    iteration = 0
    while iteration < max_iterations:
        iteration += 1
        await pre_iteration()

        system_message = {"role": "system", "content": "You are a helpful assistant that can create, read, update, and delete files."}
        model_name = "gpt-4"

        response = await thread_manager.run_thread(
            thread_id=thread_id,
            system_message=system_message,
            model_name=model_name,
            temperature=0.7,
            max_tokens=150,
            tool_choice="auto",
            additional_message=None,            
            execute_tools_async=False,
            execute_model_tool_calls=True                    
        )

        await after_iteration()

    await finalizer()

# Usage
if __name__ == "__main__":
    async def main():
        thread_manager = ThreadManager()
        thread_id = await thread_manager.create_thread()

        await thread_manager.add_message(thread_id, {"role": "user", "content": "Please create a file with a random name with the content 'Hello, world!'"})

        thread_manager.add_tool(FilesTool)
        
        await run_agent(
            thread_manager=thread_manager,
            thread_id=thread_id,
            max_iterations=5
        )

    asyncio.run(main())
```

This more complex example shows how to:
1. Define custom behavior for different stages of the agent's execution
2. Set up a loop for multiple iterations
3. Use the ThreadManager within a larger agent structure

## Documentation

For more detailed information about the AgentPress components:

- `ThreadManager`: The core class that manages threads, tools, and model execution.
- `Tool`: Base class for creating custom tools that can be used by the AI.
- `ToolRegistry`: Manages the registration and retrieval of tools.

Refer to the comments in the source code files for comprehensive documentation on each component.

## Contributing

We welcome contributions to AgentPress! Please feel free to submit issues, fork the repository and send pull requests!

## License

[MIT License](LICENSE)

Built with ❤️ by [Kortix AI Corp](https://www.kortix.ai)
