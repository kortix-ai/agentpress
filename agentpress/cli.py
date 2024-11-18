import os
import shutil
import click
import questionary
from typing import List, Dict, Optional, Tuple
import time
import pkg_resources
import requests
from packaging import version
import re

MODULES = {
    "llm": {
        "required": True,
        "files": ["llm.py"],
        "description": "LLM Interface - Core module for interacting with large language models (OpenAI, Anthropic, 100+ LLMs using the OpenAI Input/Output Format powered by LiteLLM). Handles API calls, response streaming, and model-specific configurations."
    },
    "tool": {
        "required": True,
        "files": [
            "tool.py",
            "tool_registry.py"
        ],
        "description": "Tool System Foundation - Defines the base architecture for creating and managing tools. Includes the tool registry for registering, organizing, and accessing tool functions."
    },
    "processors": {
        "required": True,
        "files": [
            "base_processors.py",
            "llm_response_processor.py",
            "standard_tool_parser.py",
            "standard_tool_executor.py", 
            "standard_results_adder.py",
            "xml_tool_parser.py",
            "xml_tool_executor.py",
            "xml_results_adder.py"
        ],
        "description": "Response Processing System - Handles parsing and executing LLM responses, managing tool calls, and processing results. Supports both standard OpenAI-style function calling and XML-based tool execution patterns."
    },
    "thread_management": {
        "required": True,
        "files": [
            "thread_manager.py",
            "thread_viewer_ui.py"
        ],
        "description": "Conversation Management System - Handles message threading, conversation history, and provides a UI for viewing conversation threads. Manages the flow of messages between the user, LLM, and tools."
    },
    "state_management": {
        "required": False,
        "files": ["state_manager.py"],
        "description": "State Persistence System - Provides thread-safe storage and retrieval of conversation state, tool data, and other persistent information. Enables maintaining context across sessions and managing shared state between components."
    }
}

STARTER_EXAMPLES = {
    "simple_web_dev_example_agent": {
        "description": "Interactive web development agent with file and terminal manipulation capabilities. Demonstrates both standard and XML-based tool calling patterns.",
        "files": {
            "agent.py": "agents/simple_web_dev/agent.py",
            "tools/files_tool.py": "agents/simple_web_dev/tools/files_tool.py",
            "tools/terminal_tool.py": "agents/simple_web_dev/tools/terminal_tool.py",
            ".env.example": "agents/.env.example"
        }
    }
}

PACKAGE_NAME = "agentpress"
PYPI_URL = f"https://pypi.org/pypi/{PACKAGE_NAME}/json"

def check_for_updates() -> Tuple[Optional[str], Optional[str], bool]:
    """
    Check if there's a newer version available on PyPI
    Returns: (current_version, latest_version, update_available)
    """
    try:
        current_version = pkg_resources.get_distribution(PACKAGE_NAME).version
        response = requests.get(PYPI_URL, timeout=2)
        response.raise_for_status()  # Raise exception for bad status codes
        
        latest_version = response.json()["info"]["version"]
        
        # Compare versions properly using packaging.version
        current_ver = version.parse(current_version)
        latest_ver = version.parse(latest_version)
        
        return current_version, latest_version, latest_ver > current_ver
        
    except requests.RequestException:
        # Handle network-related errors silently
        return None, None, False
    except Exception as e:
        # Log other unexpected errors but don't break the CLI
        click.echo(f"Warning: Failed to check for updates: {str(e)}", err=True)
        return None, None, False

def show_welcome():
    """Display welcome message with ASCII art"""
    click.clear()
    
    # Check for updates
    current_version, latest_version, update_available = check_for_updates()
    
    click.echo("""
    ╔═══════════════════════════════════════════╗
    ║          Welcome to AgentPress            ║
    ║       Your AI Agent Building Blocks       ║
    ╚═══════════════════════════════════════════╝
    """)
    
    if update_available and current_version and latest_version:
        click.echo(
            f"\n📢 Update available! "
            f"{click.style(f'v{current_version}', fg='yellow')} → "
            f"{click.style(f'v{latest_version}', fg='green')}"
        )
        click.echo("Run: pip install --upgrade agentpress\n")
    
    time.sleep(1)

def copy_module_files(src_dir: str, dest_dir: str, files: List[str]):
    """Copy module files from package to destination"""
    os.makedirs(dest_dir, exist_ok=True)
    
    with click.progressbar(files, label='Copying files') as file_list:
        for file in file_list:
            src = os.path.join(src_dir, file)
            dst = os.path.join(dest_dir, file)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(src, dst)

def copy_example_files(src_dir: str, dest_dir: str, files: Dict[str, str]):
    """Copy example files from package to destination"""
    for dest_path, src_path in files.items():
        src = os.path.join(src_dir, src_path)
        dst = os.path.join(dest_dir, dest_path)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(src, dst)
        click.echo(f"  ✓ Created {dest_path}")

def update_file_paths(file_path: str, replacements: Dict[str, str]):
    """Update file paths in the given file"""
    with open(file_path, 'r') as f:
        content = f.read()
    
    for old, new in replacements.items():
        # Escape special characters in the old string
        escaped_old = re.escape(old)
        content = re.sub(escaped_old, new, content)
    
    with open(file_path, 'w') as f:
        f.write(content)

@click.group()
def cli():
    """AgentPress CLI - Initialize your AgentPress modules"""
    pass

@cli.command()
def init():
    """Initialize AgentPress modules in your project"""
    show_welcome()
    
    # Set components directory name to 'agentpress'
    components_dir = "agentpress"

    if os.path.exists(components_dir):
        if not questionary.confirm(
            f"Directory '{components_dir}' already exists. Continue anyway?",
            default=False
        ).ask():
            click.echo("Setup cancelled.")
            return

    # Ask about starter examples
    click.echo("\n📚 Starter Examples")
    example_choices = [
        {
            "name": f"{name}: {example['description']}", 
            "value": name
        } 
        for name, example in STARTER_EXAMPLES.items()
    ]
    example_choices.append({"name": "None - I'll start from scratch", "value": None})
    
    selected_example = questionary.select(
        "Would you like to start with an example?",
        choices=example_choices
    ).ask()

    # Get package directory
    package_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Show all modules status
    click.echo("\n🔧 AgentPress Modules Configuration\n")
    
    # Show required modules including state_manager
    click.echo("📦 Required Modules (pre-selected):")
    required_modules = {name: module for name, module in MODULES.items() 
                       if module["required"] or name == "state_management"}
    for name, module in required_modules.items():
        click.echo(f"  ✓ {click.style(name, fg='green')} - {module['description']}")
    
    # Create selections dict with required modules pre-selected
    selections = {name: True for name in required_modules.keys()}
    
    click.echo("\n🚀 Setting up your AgentPress...")
    time.sleep(0.5)
    
    try:
        # Copy selected modules
        selected_modules = [name for name, selected in selections.items() if selected]
        all_files = []
        for module in selected_modules:
            all_files.extend(MODULES[module]["files"])
        
        # Create components directory and copy module files
        components_dir_path = os.path.abspath(components_dir)
        copy_module_files(package_dir, components_dir_path, all_files)
        
        # Update paths in thread_manager.py and state_manager.py
        project_dir = os.getcwd()
        thread_manager_path = os.path.join(components_dir_path, "thread_manager.py")
        state_manager_path = os.path.join(components_dir_path, "state_manager.py")

        if os.path.exists(thread_manager_path):
            update_file_paths(thread_manager_path, {
                'threads_dir: str = "threads"': f'threads_dir: str = "{os.path.join(project_dir, "threads")}"'
            })

        if os.path.exists(state_manager_path):
            update_file_paths(state_manager_path, {
                'store_file: str = "state.json"': f'store_file: str = "{os.path.join(project_dir, "state.json")}"'
            })

        # Copy example only if a valid example (not None) was selected
        if selected_example and selected_example in STARTER_EXAMPLES:
            click.echo(f"\n📝 Creating {selected_example}...")
            copy_example_files(
                package_dir, 
                os.getcwd(),  # Use current working directory
                STARTER_EXAMPLES[selected_example]["files"]
            )
            # Create threads directory
            os.makedirs(os.path.join(project_dir, "threads"), exist_ok=True)
        
        click.echo("\n✨ Success! Your AgentPress is ready.")
        click.echo(f"\n📁 Components created in: {click.style(components_dir_path, fg='green')}")
        if selected_example and selected_example in STARTER_EXAMPLES:
            click.echo(f"📁 Example agent files created in the current directory.")
        
        click.echo("\n🔥 Quick start:")
        click.echo("Check out the Quick Start guide at:")
        click.echo("https://github.com/kortix-ai/agentpress#quick-start")

        if selected_example:
            click.echo(f"\nRun the example agent:")
            click.echo("  python agent.py")


    except Exception as e:
        click.echo(f"\n❌ Error during setup: {str(e)}", err=True)
        return

def main():
    cli()

if __name__ == '__main__':
    main() 