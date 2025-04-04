"""
Wait Tool for testing sequential vs parallel tool execution.

This tool provides methods with configurable delays to test and demonstrate
the different tool execution strategies in AgentPress.
"""

import asyncio
from agentpress.tool import Tool, ToolResult, openapi_schema, xml_schema
from utils.logger import logger


class WaitTool(Tool):
    """Tool that introduces configurable delays.
    
    This tool is useful for testing and demonstrating sequential vs parallel
    tool execution strategies by creating observable delays.
    """
    
    def __init__(self):
        """Initialize the WaitTool."""
        super().__init__()
        logger.info("Initialized WaitTool for testing execution strategies")

    @xml_schema(
        tag_name="wait",
        mappings=[
            {"param_name": "seconds", "node_type": "attribute", "path": "."},
            {"param_name": "message", "node_type": "content", "path": "."}
        ],
        example='''
        <wait seconds="3">This will wait for 3 seconds</wait>
        '''
    )
    @openapi_schema({
        "type": "function",
        "function": {
            "name": "wait",
            "description": "Wait for a specified number of seconds",
            "parameters": {
                "type": "object",
                "properties": {
                    "seconds": {
                        "type": "number", 
                        "description": "Number of seconds to wait"
                    },
                    "message": {
                        "type": "string",
                        "description": "Message to include in the result"
                    }
                },
                "required": ["seconds"]
            }
        }
    })
    async def wait(self, seconds: float, message: str = "") -> ToolResult:
        """Wait for the specified number of seconds.
        
        Args:
            seconds: Number of seconds to wait
            message: Optional message to include in result
            
        Returns:
            ToolResult with success status and timing information
        """
        try:
            # Limit the wait time to a reasonable range
            seconds = min(max(0.5, float(seconds)), 10.0)
            
            logger.info(f"WaitTool: Starting wait for {seconds} seconds")
            start_time = asyncio.get_event_loop().time()
            
            # Perform the actual wait
            await asyncio.sleep(seconds)
            
            end_time = asyncio.get_event_loop().time()
            elapsed = end_time - start_time
            
            logger.info(f"WaitTool: Completed wait of {elapsed:.2f} seconds")
            
            # Format the result
            if message:
                result = f"Waited for {elapsed:.2f} seconds with message: {message}"
            else:
                result = f"Waited for {elapsed:.2f} seconds"
                
            return self.success_response(result)
            
        except Exception as e:
            logger.error(f"WaitTool error: {str(e)}")
            return self.fail_response(f"Error during wait operation: {str(e)}")

    @xml_schema(
        tag_name="wait-sequence",
        mappings=[
            {"param_name": "count", "node_type": "attribute", "path": "."},
            {"param_name": "seconds", "node_type": "attribute", "path": "."},
            {"param_name": "label", "node_type": "attribute", "path": "."}
        ],
        example='''
        <wait-sequence count="3" seconds="1" label="Test" />
        '''
    )
    @openapi_schema({
        "type": "function",
        "function": {
            "name": "wait_sequence",
            "description": "Execute a sequence of waits with the same duration",
            "parameters": {
                "type": "object",
                "properties": {
                    "count": {
                        "type": "integer", 
                        "description": "Number of sequential waits to perform"
                    },
                    "seconds": {
                        "type": "number",
                        "description": "Duration of each wait in seconds"
                    },
                    "label": {
                        "type": "string",
                        "description": "Label to identify this wait sequence"
                    }
                },
                "required": ["count", "seconds"]
            }
        }
    })
    async def wait_sequence(self, count: int, seconds: float, label: str = "Sequence") -> ToolResult:
        """Perform a sequence of waits with progress reporting.
        
        Args:
            count: Number of sequential waits to perform
            seconds: Duration of each wait in seconds
            label: Label to identify this wait sequence
            
        Returns:
            ToolResult with success status and sequence information
        """
        try:
            # Validate and limit parameters
            count = min(max(1, int(count)), 5)
            seconds = min(max(0.5, float(seconds)), 5.0)
            
            logger.info(f"WaitTool: Starting wait sequence '{label}' with {count} iterations of {seconds}s each")
            
            # Perform the sequential waits
            result_parts = []
            total_time = 0
            
            for i in range(count):
                start = asyncio.get_event_loop().time()
                
                # Log the wait start
                logger.info(f"WaitTool: Sequence '{label}' - Starting iteration {i+1}/{count}")
                
                # Perform the wait
                await asyncio.sleep(seconds)
                
                # Calculate elapsed time
                elapsed = asyncio.get_event_loop().time() - start
                total_time += elapsed
                
                # Add to results
                result_parts.append(f"Step {i+1}/{count}: Waited {elapsed:.2f}s")
                logger.info(f"WaitTool: Sequence '{label}' - Completed iteration {i+1}/{count} in {elapsed:.2f}s")
            
            # Compile the final result
            result = f"Wait Sequence '{label}' completed in {total_time:.2f} seconds:\n"
            result += "\n".join(result_parts)
            
            return self.success_response(result)
            
        except Exception as e:
            logger.error(f"WaitTool error in sequence '{label}': {str(e)}")
            return self.fail_response(f"Error during wait sequence: {str(e)}") 