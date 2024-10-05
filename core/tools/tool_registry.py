from typing import Dict, Type, Any
from core.tools.tool import Tool
from core.config import settings
import importlib.util
import os
import inspect

class ToolRegistry:
    def __init__(self):
        self.tools: Dict[str, Dict[str, Any]] = {}
        self.register_all_tools()

    def register_tool(self, tool_cls: Type[Tool]):
        tool_instance = tool_cls()
        schemas = tool_instance.get_schemas()
        for func_name, schema in schemas.items():
            self.tools[func_name] = {
                "instance": tool_instance,
                "schema": schema
            }

    def register_all_tools(self):
        tools_dir = settings.tools_dir
        for file in os.listdir(tools_dir):
            if file.endswith('.py') and file not in ['__init__.py', 'tool.py', 'tool_registry.py']:
                module_path = os.path.join(tools_dir, file)
                module_name = os.path.splitext(file)[0]
                try:
                    spec = importlib.util.spec_from_file_location(module_name, module_path)
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)
                    
                    for name, obj in inspect.getmembers(module):
                        if inspect.isclass(obj) and issubclass(obj, Tool) and obj != Tool:
                            print(f"Registering tool: {name}")  # Debug print
                            self.register_tool(obj)
                except Exception as e:
                    print(f"Error importing {module_path}: {e}")  # Debug print

        print(f"Registered tools: {list(self.tools.keys())}")  # Debug print

    def get_tool(self, tool_name: str) -> Dict[str, Any]:
        return self.tools.get(tool_name)

    def get_all_tools(self) -> Dict[str, Dict[str, Any]]:
        return self.tools