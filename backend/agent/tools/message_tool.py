import os
from typing import List, Optional, Union
from agentpress.tool import Tool, ToolResult, openapi_schema, xml_schema

class MessageTool(Tool):
    """Tool for user communication and interaction.
    
    This tool provides methods for notifying users and asking questions, with support for
    attachments and user takeover suggestions.
    """
    
    def __init__(self):
        super().__init__()
    
    @openapi_schema({
        "type": "function",
        "function": {
            "name": "message_notify_user",
            "description": "Send a message to user without requiring a response. Use for: 1) Progress updates during long-running tasks, 2) Acknowledging receipt of user instructions, 3) Reporting completion of major milestones, 4) Explaining changes in approach or strategy, 5) Summarizing findings or results without requiring input.",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {
                        "type": "string",
                        "description": "Message text to display to user - should be informative and actionable"
                    },
                    "attachments": {
                        "anyOf": [
                            {"type": "string"},
                            {"items": {"type": "string"}, "type": "array"}
                        ],
                        "description": "(Optional) List of attachments to show to user, can be file paths or URLs. Include when referencing created files, analysis results, or external resources."
                    }
                },
                "required": ["text"]
            }
        }
    })
    @xml_schema(
        tag_name="message-notify-user",
        mappings=[
            {"param_name": "text", "node_type": "content", "path": "."},
            {"param_name": "attachments", "node_type": "attribute", "path": ".", "required": False}
        ],
        example='''
        <message-notify-user attachments="output/analysis_results.csv,output/visualization.png">
            I've completed the data analysis and generated visualizations of the key trends. The analysis shows a 15% increase in engagement metrics over the last quarter, with the most significant growth in mobile users.
        </message-notify-user>
        '''
    )
    async def message_notify_user(self, text: str, attachments: Optional[Union[str, List[str]]] = None) -> ToolResult:
        """Send a notification message to the user without requiring a response.
        
        Args:
            text: The message to display to the user
            attachments: Optional file paths or URLs to attach to the message
            
        Returns:
            ToolResult indicating success or failure of the notification
        """
        try:
            # Convert single attachment to list for consistent handling
            if attachments and isinstance(attachments, str):
                attachments = [attachments]
                
            # Format the response message
            response_text = f"NOTIFICATION: {text}"
            
            # Add attachments information if present
            if attachments:
                attachment_list = "\n- ".join(attachments)
                response_text += f"\n\nAttachments:\n- {attachment_list}"
            
            return self.success_response(response_text)
        except Exception as e:
            return self.fail_response(f"Error sending notification: {str(e)}")
    
    @openapi_schema({
        "type": "function",
        "function": {
            "name": "message_ask_user",
            "description": "Ask user a question and wait for response. Use for: 1) Requesting clarification on ambiguous requirements, 2) Seeking confirmation before proceeding with high-impact changes, 3) Gathering additional information needed to complete a task, 4) Offering options and requesting user preference, 5) Validating assumptions when critical to task success.",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {
                        "type": "string",
                        "description": "Question text to present to user - should be specific and clearly indicate what information you need"
                    },
                    "attachments": {
                        "anyOf": [
                            {"type": "string"},
                            {"items": {"type": "string"}, "type": "array"}
                        ],
                        "description": "(Optional) List of question-related files or reference materials. Include when the question references specific content the user needs to see."
                    },
                    "suggest_user_takeover": {
                        "type": "string",
                        "enum": ["none", "browser"],
                        "description": "(Optional) Suggested operation for user takeover. Use 'browser' when user might need to access a website for authentication or manual interaction."
                    }
                },
                "required": ["text"]
            }
        }
    })
    @xml_schema(
        tag_name="message-ask-user",
        mappings=[
            {"param_name": "text", "node_type": "content", "path": "."},
            {"param_name": "attachments", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "suggest_user_takeover", "node_type": "attribute", "path": ".", "required": False}
        ],
        example='''
        <message-ask-user attachments="config/database_options.json,scripts/migration_plan.md" suggest_user_takeover="none">
            I've prepared two database migration approaches (attached). The first minimizes downtime but requires more storage temporarily, while the second has longer downtime but uses less resources. Which approach would you prefer to implement?
        </message-ask-user>
        '''
    )
    async def message_ask_user(self, text: str, attachments: Optional[Union[str, List[str]]] = None, 
                              suggest_user_takeover: str = "none") -> ToolResult:
        """Ask the user a question and wait for a response.
        
        Args:
            text: The question to present to the user
            attachments: Optional file paths or URLs to attach to the question
            suggest_user_takeover: Optional suggestion for user takeover (none, browser)
            
        Returns:
            ToolResult indicating the question was successfully sent
        """
        try:
            # Convert single attachment to list for consistent handling
            if attachments and isinstance(attachments, str):
                attachments = [attachments]
                
            # Format the question message
            response_text = f"QUESTION: {text}"
            
            # Add attachments information if present
            if attachments:
                attachment_list = "\n- ".join(attachments)
                response_text += f"\n\nAttachments:\n- {attachment_list}"
            
            # Add user takeover suggestion if not "none"
            if suggest_user_takeover and suggest_user_takeover != "none":
                response_text += f"\n\nSuggested takeover: {suggest_user_takeover}"
            
            return self.success_response(response_text, requires_response=True)
        except Exception as e:
            return self.fail_response(f"Error asking user: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "idle",
            "description": "A special tool to indicate you have completed all tasks and are about to enter idle state. Use ONLY when: 1) All tasks in todo.md are marked complete, 2) The user's original request has been fully addressed, 3) There are no pending actions or follow-ups required, 4) You've delivered all final outputs and results to the user.",
            "parameters": {
                "type": "object"
            }
        }
    })
    @xml_schema(
        tag_name="idle",
        mappings=[],
        example='''
        <idle>
        <!-- Use this tool only after completing all tasks and delivering all final outputs -->
        <!-- All todo.md items must be marked complete [x] before using this tool -->
        </idle>
        '''
    )
    async def idle(self) -> ToolResult:
        """Indicate that the agent has completed all tasks and is entering idle state.
        
        Returns:
            ToolResult indicating successful transition to idle state
        """
        try:
            return self.success_response("Entering idle state")
        except Exception as e:
            return self.fail_response(f"Error entering idle state: {str(e)}")


if __name__ == "__main__":
    import asyncio
    
    async def test_message_tool():
        message_tool = MessageTool()
        
        # Test notification
        notify_result = await message_tool.message_notify_user(
            "Processing has completed successfully!",
            attachments=["results.txt", "output.log"]
        )
        print("Notification result:", notify_result)
        
        # Test question
        ask_result = await message_tool.message_ask_user(
            "Would you like to proceed with the next phase?",
            attachments="summary.pdf",
            suggest_user_takeover="browser"
        )
        print("Question result:", ask_result)
    
    asyncio.run(test_message_tool())
