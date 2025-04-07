"""
Raw streaming test to analyze tool call streaming behavior.

This script specifically tests how raw streaming chunks are delivered from the Anthropic API
with tool calls containing large JSON payloads.
"""

import asyncio
import json
import sys
import os
from typing import Dict, Any

from anthropic import AsyncAnthropic
from utils.logger import logger

# Example tool schema for Anthropic format
CREATE_FILE_TOOL = {
    "name": "create_file",
    "description": "Create a new file with the provided contents at a given path in the workspace",
    "input_schema": {
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

async def test_raw_streaming():
    """Test tool calling with streaming to observe raw chunk behavior using Anthropic SDK directly."""
    # Setup conversation with a prompt likely to generate large file payloads
    messages = [
        {"role": "user", "content": "Create a CSS file with a comprehensive set of styles for a modern responsive website."}
    ]
    
    print("\n=== Testing Raw Streaming Tool Call Behavior ===\n")
    
    try:
        # Get API key from environment
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            logger.error("ANTHROPIC_API_KEY environment variable not set")
            return
        
        # Initialize Anthropic client
        client = AsyncAnthropic(api_key=api_key)
        
        # Make API call with tool in streaming mode
        print("Sending streaming request...")
        stream = await client.messages.create(
            model="claude-3-5-sonnet-latest",
            max_tokens=4096,
            temperature=0.0,
            system="You are a helpful assistant with access to file management tools.",
            messages=messages,
            tools=[CREATE_FILE_TOOL],
            tool_choice={"type": "tool", "name": "create_file"},
            stream=True
        )
        
        # Process streaming response
        print("\nResponse stream started. Processing raw chunks:\n")
        
        # Stream statistics
        chunk_count = 0
        tool_call_chunks = 0
        accumulated_tool_input = ""
        current_tool_name = None
        accumulated_content = ""
        
        # Process each chunk with ZERO buffering
        print("\n--- BEGINNING STREAM OUTPUT ---\n", flush=True)
        sys.stdout.flush()
        
        # Process each event in the stream
        async for event in stream:
            chunk_count += 1
            
            # Immediate debug output for every chunk
            print(f"\n[CHUNK {chunk_count}] Type: {event.type}", end="", flush=True)
            sys.stdout.flush()
            
            # Process based on event type
            if event.type == "message_start":
                print(f" Message ID: {event.message.id}", end="", flush=True)
            
            elif event.type == "content_block_start":
                print(f" Content block start: {event.content_block.type}", end="", flush=True)
            
            elif event.type == "content_block_delta":
                if hasattr(event.delta, "text") and event.delta.text:
                    text = event.delta.text
                    accumulated_content += text
                    print(f" Content: {repr(text)}", end="", flush=True)
            
            elif event.type == "tool_use":
                current_tool_name = event.tool_use.name
                print(f" Tool use: {current_tool_name}", end="", flush=True)
                
                # If input is available immediately
                if hasattr(event.tool_use, "input") and event.tool_use.input:
                    tool_call_chunks += 1
                    input_json = json.dumps(event.tool_use.input)
                    input_len = len(input_json)
                    print(f" Input[{input_len}]: {input_json[:50]}...", end="", flush=True)
                    accumulated_tool_input = input_json
            
            elif event.type == "tool_use_delta":
                if hasattr(event.delta, "input") and event.delta.input:
                    tool_call_chunks += 1
                    # For streaming tool inputs, we get partial updates
                    # The delta.input is a dictionary with partial updates to specific fields
                    input_json = json.dumps(event.delta.input)
                    input_len = len(input_json)
                    print(f" Input delta[{input_len}]: {input_json[:50]}...", end="", flush=True)
                    
                    # Try to merge the deltas
                    try:
                        if accumulated_tool_input:
                            # Parse existing accumulated JSON
                            existing_input = json.loads(accumulated_tool_input)
                            # Update with new delta
                            existing_input.update(event.delta.input)
                            accumulated_tool_input = json.dumps(existing_input)
                        else:
                            accumulated_tool_input = input_json
                    except json.JSONDecodeError:
                        # If we can't parse JSON yet, just append the raw delta
                        accumulated_tool_input += input_json
            
            elif event.type == "message_delta":
                if hasattr(event.delta, "stop_reason") and event.delta.stop_reason:
                    print(f"\n--- FINISH REASON: {event.delta.stop_reason} ---", flush=True)
            
            elif event.type == "message_stop":
                # Access stop_reason directly from the event
                if hasattr(event, "stop_reason"):
                    print(f"\n--- MESSAGE STOP: {event.stop_reason} ---", flush=True)
                else:
                    print("\n--- MESSAGE STOP ---", flush=True)
            
            # Force flush after every chunk
            sys.stdout.flush()
        
        print("\n\n--- END STREAM OUTPUT ---\n", flush=True)
        sys.stdout.flush()
        
        # Summary after all chunks processed
        print("\n=== Streaming Summary ===")
        print(f"Total chunks: {chunk_count}")
        print(f"Tool call chunks: {tool_call_chunks}")
        
        if current_tool_name:
            print(f"\nTool name: {current_tool_name}")
        
        if accumulated_content:
            print(f"\nAccumulated content:")
            print(accumulated_content)
        
        # Try to parse accumulated arguments as JSON
        try:
            if accumulated_tool_input:
                print(f"\nTotal accumulated tool input length: {len(accumulated_tool_input)}")
                input_obj = json.loads(accumulated_tool_input)
                print(f"\nSuccessfully parsed accumulated tool input as JSON")
                if 'file_path' in input_obj:
                    print(f"file_path: {input_obj['file_path']}")
                if 'file_contents' in input_obj:
                    contents = input_obj['file_contents']
                    print(f"file_contents length: {len(contents)}")
                    print(f"file_contents preview: {contents[:100]}...")
        except json.JSONDecodeError as e:
            print(f"\nError parsing accumulated tool input: {e}")
            print(f"Tool input start: {accumulated_tool_input[:100]}...")
            print(f"Tool input end: {accumulated_tool_input[-100:]}")
    
    except Exception as e:
        logger.error(f"Error in streaming test: {str(e)}", exc_info=True)

async def main():
    """Run the raw streaming test."""
    await test_raw_streaming()

if __name__ == "__main__":
    asyncio.run(main()) 