import os
from typing import List, Optional, Union
from agentpress.tool import Tool, ToolResult, openapi_schema, xml_schema

class MessageTool(Tool):
    """Tool for user communication and interaction.
    
    This tool provides methods for asking questions, with support for
    attachments and user takeover suggestions.
    """
    
    def __init__(self):
        super().__init__()
    
    @openapi_schema({
        "type": "function",
        "function": {
            "name": "ask",
            "description": "Ask user a question and wait for response. Use for: 1) Requesting clarification on ambiguous requirements, 2) Seeking confirmation before proceeding with high-impact changes, 3) Gathering additional information needed to complete a task, 4) Offering options and requesting user preference, 5) Validating assumptions when critical to task success. IMPORTANT: Use this tool only when user input is essential to proceed. Always provide clear context and options when applicable. Include relevant attachments when the question relates to specific files or resources.",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {
                        "type": "string",
                        "description": "Question text to present to user - should be specific and clearly indicate what information you need. Include: 1) Clear question or request, 2) Context about why the input is needed, 3) Available options if applicable, 4) Impact of different choices, 5) Any relevant constraints or considerations."
                    },
                    "attachments": {
                        "anyOf": [
                            {"type": "string"},
                            {"items": {"type": "string"}, "type": "array"}
                        ],
                        "description": "(Optional) List of files or URLs to attach to the question. Include when: 1) Question relates to specific files or configurations, 2) User needs to review content before answering, 3) Options or choices are documented in files, 4) Supporting evidence or context is needed. Always use relative paths to /workspace directory."
                    }
                },
                "required": ["text"]
            }
        }
    })
    @xml_schema(
        tag_name="ask",
        mappings=[
            {"param_name": "text", "node_type": "content", "path": "."},
            {"param_name": "attachments", "node_type": "attribute", "path": ".", "required": False}
        ],
        example='''
        <!-- Use ask when you need user input to proceed -->
        <!-- Examples of when to use ask: -->
        <!-- 1. Clarifying ambiguous requirements -->
        <!-- 2. Confirming high-impact changes -->
        <!-- 3. Choosing between implementation options -->
        <!-- 4. Validating critical assumptions -->
        <!-- 5. Getting missing information -->
        
        <ask attachments="recipes/chocolate_cake.txt,photos/cake_examples.jpg">
            I'm planning to bake the chocolate cake for your birthday party. The recipe mentions "rich frosting" but doesn't specify what type. Could you clarify your preferences? For example:
            1. Would you prefer buttercream or cream cheese frosting?
            2. Do you want any specific flavor added to the frosting (vanilla, coffee, etc.)?
            3. Should I add any decorative toppings like sprinkles or fruit?
            4. Do you have any dietary restrictions I should be aware of?
            
            This information will help me make sure the cake meets your expectations for the celebration.
        </ask>
        '''
    )
    async def ask(self, text: str, attachments: Optional[Union[str, List[str]]] = None) -> ToolResult:
        """Ask the user a question and wait for a response.
        
        Args:
            text: The question to present to the user
            attachments: Optional file paths or URLs to attach to the question
            
        Returns:
            ToolResult indicating the question was successfully sent
        """
        try:
            # Convert single attachment to list for consistent handling
            if attachments and isinstance(attachments, str):
                attachments = [attachments]
                
            return self.success_response({"Success"})
        except Exception as e:
            return self.fail_response(f"Error asking user: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "complete",
            "description": "A special tool to indicate you have completed all tasks and are about to enter complete state. Use ONLY when: 1) All tasks in todo.md are marked complete [x], 2) The user's original request has been fully addressed, 3) There are no pending actions or follow-ups required, 4) You've delivered all final outputs and results to the user. IMPORTANT: This is the ONLY way to properly terminate execution. Never use this tool unless ALL tasks are complete and verified. Always ensure you've provided all necessary outputs and references before using this tool.",
            "parameters": {
                "type": "object"
            }
        }
    })
    @xml_schema(
        tag_name="complete",
        mappings=[],
        example='''
        <!-- Use complete ONLY when ALL tasks are finished -->
        <!-- Prerequisites for using complete: -->
        <!-- 1. All todo.md items marked complete [x] -->
        <!-- 2. User's original request fully addressed -->
        <!-- 3. All outputs and results delivered -->
        <!-- 4. No pending actions or follow-ups -->
        <!-- 5. All tasks verified and validated -->
        
        <complete>
        <!-- This tool indicates successful completion of all tasks -->
        <!-- The system will stop execution after this tool is used -->
        </complete>
        '''
    )
    async def complete(self) -> ToolResult:
        """Indicate that the agent has completed all tasks and is entering complete state.
        
        Returns:
            ToolResult indicating successful transition to complete state
        """
        try:
            return self.success_response({"status": "complete"})
        except Exception as e:
            return self.fail_response(f"Error entering complete state: {str(e)}")


if __name__ == "__main__":
    import asyncio
    
    async def test_message_tool():
        message_tool = MessageTool()
        
        # Test question
        ask_result = await message_tool.ask(
            "Would you like to proceed with the next phase?",
            attachments="summary.pdf"
        )
        print("Question result:", ask_result)
    
    asyncio.run(test_message_tool())
