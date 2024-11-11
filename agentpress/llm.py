from typing import Union, Dict, Any
import litellm
import os
import json
import openai
from openai import OpenAIError
import asyncio
import logging

OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY')
GROQ_API_KEY = os.environ.get('GROQ_API_KEY')
AGENTOPS_API_KEY = os.environ.get('AGENTOPS_API_KEY')

os.environ['OPENAI_API_KEY'] = OPENAI_API_KEY
os.environ['ANTHROPIC_API_KEY'] = ANTHROPIC_API_KEY
os.environ['GROQ_API_KEY'] = GROQ_API_KEY

async def make_llm_api_call(
    messages: list, 
    model_name: str, 
    response_format: Any = None, 
    temperature: float = 0, 
    max_tokens: int = None, 
    tools: list = None, 
    tool_choice: str = "auto", 
    api_key: str = None, 
    api_base: str = None, 
    agentops_session: Any = None, 
    stream: bool = False, 
    top_p: float = None
) -> Union[Dict[str, Any], Any]:
    """
    Make an API call to a language model using litellm.
    
    This function provides a unified interface for making calls to various LLM providers
    (OpenAI, Anthropic, Groq, etc.) with support for streaming, tool calls, and retry logic.
    
    Args:
        messages (list): List of message dictionaries for the conversation
        model_name (str): Name of the model to use (e.g., "gpt-4", "claude-3")
        response_format (Any, optional): Desired format for the response
        temperature (float, optional): Sampling temperature. Defaults to 0
        max_tokens (int, optional): Maximum tokens in the response
        tools (list, optional): List of tool definitions for function calling
        tool_choice (str, optional): How to select tools ("auto" or "none")
        api_key (str, optional): Override default API key
        api_base (str, optional): Override default API base URL
        agentops_session (Any, optional): Session for agentops integration
        stream (bool, optional): Whether to stream the response. Defaults to False
        top_p (float, optional): Top-p sampling parameter
        
    Returns:
        Union[Dict[str, Any], Any]: API response, either complete or streaming
        
    Raises:
        Exception: If API call fails after retries
    """
    # litellm.set_verbose = True

    async def attempt_api_call(api_call_func, max_attempts=3):
        """
        Attempt an API call with retries.
        
        Args:
            api_call_func: Async function that makes the API call
            max_attempts (int): Maximum number of retry attempts
            
        Returns:
            API response if successful
            
        Raises:
            Exception: If all retry attempts fail
        """
        for attempt in range(max_attempts):
            try:
                return await api_call_func()
            except litellm.exceptions.RateLimitError as e:
                logging.warning(f"Rate limit exceeded. Waiting for 30 seconds before retrying...")
                await asyncio.sleep(30)
            except OpenAIError as e:
                logging.info(f"API call failed, retrying attempt {attempt + 1}. Error: {e}")
                await asyncio.sleep(5)
            except json.JSONDecodeError:
                logging.error(f"JSON decoding failed, retrying attempt {attempt + 1}")
                await asyncio.sleep(5)
        raise Exception("Failed to make API call after multiple attempts.")

    async def api_call():
        """
        Prepare and execute the API call with the specified parameters.
        
        Returns:
            API response from the language model
        """
        api_call_params = {
            "model": model_name,
            "messages": messages,
            "temperature": temperature,
            "response_format": response_format,
            "top_p": top_p,
            "stream": stream,
        }

        # Add optional parameters if provided
        if api_key:
            api_call_params["api_key"] = api_key
        if api_base:
            api_call_params["api_base"] = api_base

        # Handle token limits differently for different models
        if 'o1' in model_name:
            if max_tokens is not None:
                api_call_params["max_completion_tokens"] = max_tokens
        else:
            if max_tokens is not None:
                api_call_params["max_tokens"] = max_tokens

        if tools:
            api_call_params["tools"] = tools
            api_call_params["tool_choice"] = tool_choice

        # Add special headers for Claude models
        if "claude" in model_name.lower() or "anthropic" in model_name.lower():
            api_call_params["extra_headers"] = {
                "anthropic-beta": "max-tokens-3-5-sonnet-2024-07-15"
            }
        
        # Log the API request
        # logging.info(f"Sending API request: {json.dumps(api_call_params, indent=2)}")

        # Make the API call using either agentops session or direct litellm
        if agentops_session:
            response = await agentops_session.patch(litellm.acompletion)(**api_call_params)
        else:
            response = await litellm.acompletion(**api_call_params)

        # Log the API response
        # logging.info(f"Received API response: {response}")

        return response

    return await attempt_api_call(api_call)

if __name__ == "__main__":
    import asyncio
    async def test_llm_api_call(stream=True):
        """
        Test function for the LLM API call functionality.
        
        Args:
            stream (bool): Whether to test streaming mode
        """
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Complex essay on economics"}
        ]
        model_name = "gpt-4o"

        response = await make_llm_api_call(messages, model_name, stream=stream)

        if stream:
            print("\n🤖 Streaming response:\n")
            buffer = ""
            async for chunk in response:
                if isinstance(chunk, dict) and 'choices' in chunk:
                    content = chunk['choices'][0]['delta'].get('content', '')
                else:
                    content = chunk.choices[0].delta.content
                
                if content:
                    buffer += content
                    if content[-1].isspace():
                        print(buffer, end='', flush=True)
                        buffer = ""
            
            if buffer:
                print(buffer, flush=True)
            print("\n✨ Stream completed.\n")
        else:
            print("\n🤖 Response:\n")
            if isinstance(response, dict) and 'choices' in response:
                print(response['choices'][0]['message']['content'])
            else:
                print(response.choices[0].message.content)
            print()

    asyncio.run(test_llm_api_call())
