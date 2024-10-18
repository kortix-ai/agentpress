# agentpress

AgentPress simplifies the process of creating AI agents by providing a robust thread management system and a flexible tool integration mechanism. With AgentPress, you can easily create, configure, and run AI agents that can engage in conversations, perform tasks, and interact with various tools.

### Key Features

- **Thread Management System**: Manage conversations and task executions through a sophisticated thread system.
- **Flexible Tool Integration**: Easily integrate and use custom tools within your AI agents.
- **Configurable Agent Behavior**: Fine-tune your agent's behavior with customizable settings and callbacks.
- **Autonomous Iterations**: Allow your agent to run multiple iterations autonomously.
- **State Management**: Control your agent's behavior at different stages of execution.

### Getting Started

To get started with AgentPress, all you need to do is write your agent similar to the example in `agent.py`. Here's a basic outline:

1. Import necessary modules:
   ```python
   from agentpress.db import Database
   from agentpress.thread_manager import ThreadManager
   from tools.files_tool import FilesTool
   ```

2. Create a ThreadManager instance:
   ```python
   db = Database()
   manager = ThreadManager(db)
   ```

3. Set up your agent's configuration:
   ```python
   settings = {
       "thread_id": thread_id,
       "system_message": system_message,
       "model_name": "gpt-4",
       "temperature": 0.7,
       "max_tokens": 150,
       "autonomous_iterations_amount": 3,
       "continue_instructions": "Continue the conversation...",
       "tools": list(tool_schemas.keys()),
       "tool_choice": "auto"
   }
   ```

4. Define callback functions (optional):
   ```python
   def initializer():
       # Code to run at the start of the thread
   
   def pre_iteration():
       # Code to run before each iteration
   
   def after_iteration():
       # Code to run after each iteration
   
   def finalizer():
       # Code to run at the end of the thread
   ```

5. Run your agent:
   ```python
   response = await manager.run_thread(settings)
   ```

### Documentation

The core of AgentPress is the `ThreadManager` class in `thread_manager.py`. It provides a comprehensive thread management system where you can:

- Create and manage threads
- Add messages to threads
- Run threads with specific settings
- Configure autonomous iterations
- Integrate and use tools

Tools in AgentPress are based on the `Tool` class defined in `tool.py`. You can create custom tools by inheriting from this class and implementing the required methods. An example is the `FilesTool` in `files_tool.py`.

For more detailed documentation, please refer to the comments in the source code files.

Built with ❤️ by [Kortix AI Corp](https://www.kortix.ai)
