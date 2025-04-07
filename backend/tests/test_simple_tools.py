"""
Simple test script for LLM API with tool calling functionality.

This script tests basic tool calling with both streaming and non-streaming to verify functionality.
"""

import asyncio
import json
from typing import Dict, Any

from services.llm import make_llm_api_call
from utils.logger import logger

# Example tool schema from files_tool.py
CREATE_FILE_SCHEMA = {
    "type": "function",
    "function": {
        "name": "create_file",
        "description": "Create a new file with the provided contents at a given path in the workspace",
        "parameters": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Path to the file to be created"
                },
                "file_contents": {
                    "type": "string",
                    "description": "The content to write to the file"
                }
            },
            "required": ["file_path", "file_contents"]
        }
    }
}

async def test_simple_tool_call():
    """Test a simple non-streaming tool call to verify functionality."""
    # Setup conversation
    messages = [
        {"role": "system", "content": "You are a helpful assistant with access to file management tools."},
        {"role": "user", "content": "Create an HTML file named hello.html with a simple Hello World message."}
    ]
    
    print("\n=== Testing non-streaming tool call ===\n")
    
    try:
        # Make API call with tool
        response = await make_llm_api_call(
            messages=messages,
            model_name="gpt-4o",
            temperature=0.0,
            tools=[CREATE_FILE_SCHEMA],
            tool_choice={"type": "function", "function": {"name": "create_file"}}
        )
        
        # Print basic response info
        print(f"Response model: {response.model}")
        print(f"Response type: {type(response)}")
        
        # Check if the response has tool calls
        assistant_message = response.choices[0].message
        print(f"\nAssistant message content: {assistant_message.content}")
        
        if hasattr(assistant_message, 'tool_calls') and assistant_message.tool_calls:
            print("\nTool calls detected:")
            
            for i, tool_call in enumerate(assistant_message.tool_calls):
                print(f"\nTool call {i+1}:")
                print(f"  ID: {tool_call.id}")
                print(f"  Type: {tool_call.type}")
                print(f"  Function: {tool_call.function.name}")
                print(f"  Arguments:")
                
                try:
                    args = json.loads(tool_call.function.arguments)
                    print(json.dumps(args, indent=4))
                    
                    # Access and print specific arguments 
                    if tool_call.function.name == "create_file":
                        print(f"\nFile path: {args.get('file_path')}")
                        print(f"File contents length: {len(args.get('file_contents', ''))}")
                        print(f"File contents preview: {args.get('file_contents', '')[:100]}...")
                except Exception as e:
                    print(f"Error parsing arguments: {e}")
        else:
            print("\nNo tool calls found in the response.")
            print(f"Full response: {response}")
    
    except Exception as e:
        logger.error(f"Error in test: {str(e)}", exc_info=True)

async def test_streaming_tool_call():
    """Test tool calling with streaming to observe behavior."""
    # Setup conversation
    messages = [
        {"role": "system", "content": "You are a helpful assistant with access to file management tools. YOU ALWAYS USE MULTIPLE TOOL FUNCTION CALLS AT ONCE. YOU NEVER USE ONE TOOL FUNCTION CALL AT A TIME."},
        {"role": "user", "content": "Create 10 random files with different extensions and content."}
    ]
    
    print("\n=== Testing streaming tool call ===\n")
    
    try:
        # Make API call with tool in streaming mode
        print("Sending streaming request...")
        stream_response = await make_llm_api_call(
            messages=messages,
            model_name="anthropic/claude-3-5-sonnet-latest",
            temperature=0.0,
            tools=[CREATE_FILE_SCHEMA],
            tool_choice="auto",
            stream=True
        )
        
        # Process streaming response
        print("\nResponse stream started. Processing chunks:\n")
        
        # Stream statistics
        chunk_count = 0
        content_chunks = 0
        tool_call_chunks = 0
        accumulated_content = ""
        
        # Storage for accumulated tool calls
        tool_calls = []
        last_chunk = None  # Variable to store the last chunk
        
        # Process each chunk
        async for chunk in stream_response:
            chunk_count += 1
            last_chunk = chunk # Keep track of the last chunk
            
            # Print chunk number and type
            print(f"\n--- Chunk {chunk_count} ---")
            print(f"Chunk type: {type(chunk)}")
            
            if not hasattr(chunk, 'choices') or not chunk.choices:
                print("No choices in chunk")
                continue
            
            delta = chunk.choices[0].delta
            
            # Process content if present
            if hasattr(delta, 'content') and delta.content is not None:
                content_chunks += 1
                accumulated_content += delta.content
                print(f"Content: {delta.content}")
            
            # Look for tool calls
            if hasattr(delta, 'tool_calls') and delta.tool_calls:
                tool_call_chunks += 1
                print("Tool call detected in chunk!")
                
                for tool_call in delta.tool_calls:
                    print(f"Tool call: {tool_call.model_dump()}")
                    
                    # Track tool call parts
                    tool_call_index = tool_call.index if hasattr(tool_call, 'index') else 0
                    
                    # Initialize tool call if new
                    while len(tool_calls) <= tool_call_index:
                        tool_calls.append({
                            "id": "",
                            "type": "function",
                            "function": {"name": "", "arguments": ""}
                        })
                    
                    # Update tool call ID if present
                    if hasattr(tool_call, 'id') and tool_call.id:
                        tool_calls[tool_call_index]["id"] = tool_call.id
                    
                    # Update function name if present
                    if hasattr(tool_call, 'function'):
                        if hasattr(tool_call.function, 'name') and tool_call.function.name:
                            tool_calls[tool_call_index]["function"]["name"] = tool_call.function.name
                        
                        # Update function arguments if present
                        if hasattr(tool_call.function, 'arguments') and tool_call.function.arguments:
                            tool_calls[tool_call_index]["function"]["arguments"] += tool_call.function.arguments
        
        # Summary after all chunks processed
        print("\n=== Streaming Summary ===")
        print(f"Total chunks: {chunk_count}")
        print(f"Content chunks: {content_chunks}")
        print(f"Tool call chunks: {tool_call_chunks}")
        
        if accumulated_content:
            print(f"\nAccumulated content: {accumulated_content}")
        
        if tool_calls:
            print("\nAccumulated tool calls:")
            for i, tool_call in enumerate(tool_calls):
                print(f"\nTool call {i+1}:")
                print(f"  ID: {tool_call['id']}")
                print(f"  Type: {tool_call['type']}")
                print(f"  Function: {tool_call['function']['name']}")
                print(f"  Arguments: {tool_call['function']['arguments']}")
                
                # Try to parse arguments
                try:
                    args = json.loads(tool_call['function']['arguments'])
                    print("\nParsed arguments:")
                    print(json.dumps(args, indent=4))
                except Exception as e:
                    print(f"Error parsing arguments: {str(e)}")
        else:
            print("\nNo tool calls accumulated from streaming response.")

        # --- Added logging for last chunk and finish reason ---
        finish_reason = None
        if last_chunk:
            try:
                if hasattr(last_chunk, 'choices') and last_chunk.choices:
                    finish_reason = last_chunk.choices[0].finish_reason
                last_chunk_data = last_chunk.model_dump() if hasattr(last_chunk, 'model_dump') else vars(last_chunk)
                print("\n--- Last Chunk Received ---")
                print(f"Finish Reason: {finish_reason}")
                print(f"Raw Last Chunk Data: {json.dumps(last_chunk_data, indent=2)}")
            except Exception as log_ex:
                print("\n--- Error logging last chunk ---")
                print(f"Error: {log_ex}")
                print(f"Last Chunk (repr): {repr(last_chunk)}")
        else:
            print("\n--- No last chunk recorded ---")
        # --- End added logging ---
    
    except Exception as e:
        logger.error(f"Error in streaming test: {str(e)}", exc_info=True)

async def main():
    """Run both tests for comparison."""
    # await test_simple_tool_call()
    await test_streaming_tool_call()

if __name__ == "__main__":
    asyncio.run(main()) 