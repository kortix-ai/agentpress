import os
import shutil
import click
import questionary
from typing import Dict
import time
import pkg_resources
import requests
from packaging import version

PACKAGE_NAME = "agentpress"
PYPI_URL = f"https://pypi.org/pypi/{PACKAGE_NAME}/json"

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

def check_for_updates():
    """Check if there's a newer version available on PyPI"""
    try:
        current_version = pkg_resources.get_distribution(PACKAGE_NAME).version
        response = requests.get(PYPI_URL, timeout=2)
        response.raise_for_status()
        
        latest_version = response.json()["info"]["version"]
        
        current_ver = version.parse(current_version)
        latest_ver = version.parse(latest_version)
        
        return current_version, latest_version, latest_ver > current_ver
        
    except requests.RequestException:
        return None, None, False
    except Exception as e:
        click.echo(f"Warning: Failed to check for updates: {str(e)}", err=True)
        return None, None, False

def show_welcome():
    """Display welcome message with ASCII art"""
    click.clear()
    
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

def copy_package_files(src_dir: str, dest_dir: str):
    """Copy all package files except agents folder to destination"""
    os.makedirs(dest_dir, exist_ok=True)
    
    def ignore_patterns(path, names):
        # Ignore the agents directory and any __pycache__ directories
        return [n for n in names if n == 'agents' or n == '__pycache__']
    
    with click.progressbar(length=1, label='Copying files') as bar:
        shutil.copytree(src_dir, dest_dir, dirs_exist_ok=True, ignore=ignore_patterns)
        bar.update(1)

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
    """AgentPress CLI - Initialize your AgentPress modules"""
    pass

@cli.command()
def init():
    """Initialize AgentPress modules in your project"""
    show_welcome()
    
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
    
    click.echo("\n🚀 Setting up your AgentPress...")
    time.sleep(0.5)
    
    try:
        # Create components directory and copy all files except agents folder
        components_dir_path = os.path.abspath(components_dir)
        copy_package_files(package_dir, components_dir_path)

        # Copy example if selected
        if selected_example and selected_example in STARTER_EXAMPLES:
            click.echo(f"\n📝 Creating {selected_example}...")
            copy_example_files(
                package_dir, 
                os.getcwd(),
                STARTER_EXAMPLES[selected_example]["files"]
            )
            
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