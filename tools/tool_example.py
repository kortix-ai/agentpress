from typing import Dict, Any
from core.tool import Tool, ToolResult

class ExampleTool(Tool):
    description = "An example tool for demonstration purposes."
    
    def __init__(self):
        super().__init__()

    async def example_function(self, input_text: str) -> ToolResult:
        try:
            processed_text = input_text.upper()
            return self.success_response({
                "original_text": input_text,
                "processed_text": processed_text
            })
        except Exception as e:
            return self.fail_response(f"Error processing input: {str(e)}")

    def get_schemas(self) -> Dict[str, Dict[str, Any]]:
        schemas = {
            "example_function": {
                "name": "example_function",
                "description": "An example function that demonstrates the usage of the Tool class",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "input_text": {
                            "type": "string",
                            "description": "The text to be processed by the example function"
                        }
                    },
                    "required": ["input_text"]
                }
            }
        }
        return {name: self.format_schema(schema) for name, schema in schemas.items()}