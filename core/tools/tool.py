from datetime import datetime
from typing import List, Dict, Any
from dataclasses import dataclass
from abc import ABC, abstractmethod
import json

@dataclass
class ToolResult:
    success: bool
    output: str

class Tool(ABC):
    def __init__(self):
        pass

    @abstractmethod
    def get_schemas(self) -> Dict[str, Dict[str, Any]]:
        pass

    def success_response(self, data: Dict[str, Any] | str) -> ToolResult:
        if isinstance(data, str):
            text = data
        else:
            text = json.dumps(data, indent=2)
        return ToolResult(success=True, output=text)

    def fail_response(self, msg: str) -> ToolResult:
        return ToolResult(success=False, output=msg)

    def format_schema(self, schema: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "type": "function",
            "function": schema
        }