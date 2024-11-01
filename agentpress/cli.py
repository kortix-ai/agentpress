import os
import shutil
import click
import questionary
from typing import List, Dict
import time

MODULES = {
    "llm": {
        "required": True,
        "files": ["llm.py"],
        "description": "Core LLM integration module - Handles API calls to language models like GPT-4, Claude, etc."
    },
    "thread_manager": {
        "required": True,
        "files": ["thread_manager.py"],
        "description": "Message thread management module - Manages conversation history and message flows"
    },
    "tool_system": {
        "required": True,
        "files": [
            "tool.py", 
            "tool_registry.py"
        ],
        "description": "Tool execution system - Enables LLMs to use Python functions as tools"
    },
    "state_manager": {
        "required": False,
        "files": ["state_manager.py"],
        "description": "State persistence module - Saves and loads conversation state and tool data"
    }
}

STARTER_EXAMPLES = {
    "example-agent": {
        "description": "Web development agent with file and terminal tools",
        "files": {
            "agent.py": "examples/example-agent/agent.py",
            "tools/files_tool.py": "examples/example-agent/tools/files_tool.py",
            "tools/terminal_tool.py": "examples/example-agent/tools/terminal_tool.py",
        }
    }
}

def show_welcome():
    """Display welcome message with ASCII art"""
    click.clear()
    click.echo("""
    ╔═══════════════════════════════════════════╗
    ║          Welcome to AgentPress            ║
    ║       Your AI Agent Building Blocks       ║
    ╚═══════════════════════════════════════════╝
    """)
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

@click.group()
def cli():
    """AgentPress CLI - Initialize your project with AgentPress modules"""
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
                       if module["required"] or name == "state_manager"}
    for name, module in required_modules.items():
        click.echo(f"  ✓ {click.style(name, fg='green')} - {module['description']}")
    
    # Create selections dict with required modules pre-selected
    selections = {name: True for name in required_modules.keys()}
    
    click.echo("\n🚀 Setting up your project...")
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
        
        # Copy example if selected
        if selected_example:
            click.echo(f"\n📝 Creating {selected_example}...")
            copy_example_files(
                package_dir, 
                os.getcwd(),  # Use current working directory
                STARTER_EXAMPLES[selected_example]["files"]
            )
            # Create workspace directory
            os.makedirs(os.path.join(os.getcwd(), "workspace"), exist_ok=True)
        
        click.echo("\n✨ Success! Your AgentPress project is ready.")
        click.echo(f"\n📁 Components created in: {click.style(components_dir_path, fg='green')}")
        if selected_example:
            click.echo(f"📁 Example agent files created in the current directory.")
        
        click.echo("\n🔥 Quick start:")
        click.echo("1. Create and activate a virtual environment:")
        click.echo("  python -m venv venv")
        click.echo("  source venv/bin/activate  # On Windows: .\\venv\\Scripts\\activate")
        
        if selected_example:
            click.echo(f"\n2. Run the example agent:")
            click.echo("  python agent.py")
        
        click.echo("\n📚 Import components in your code:")
        click.echo(f"  from {components_dir}.llm import make_llm_api_call")
        click.echo(f"  from {components_dir}.thread_manager import ThreadManager")
        
    except Exception as e:
        click.echo(f"\n❌ Error during setup: {str(e)}", err=True)
        return

def main():
    cli()

if __name__ == '__main__':
    main() 