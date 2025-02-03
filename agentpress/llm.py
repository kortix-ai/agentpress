from typing import Union, Dict, Any, Optional, List
import litellm
import os
import json
import openai
from openai import OpenAIError
import asyncio
import logging

OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', None)
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', None) 
GROQ_API_KEY = os.environ.get('GROQ_API_KEY', None)
AGENTOPS_API_KEY = os.environ.get('AGENTOPS_API_KEY', None)
FIREWORKS_API_KEY = os.environ.get('FIREWORKS_AI_API_KEY', None)
DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY', None)
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', None)
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', None)

AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID', None)
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY', None)
AWS_REGION_NAME = os.environ.get('AWS_REGION_NAME', None)

if OPENAI_API_KEY:
    os.environ['OPENAI_API_KEY'] = OPENAI_API_KEY
if ANTHROPIC_API_KEY:
    os.environ['ANTHROPIC_API_KEY'] = ANTHROPIC_API_KEY
if GROQ_API_KEY:
    os.environ['GROQ_API_KEY'] = GROQ_API_KEY
if FIREWORKS_API_KEY:
    os.environ['FIREWORKS_AI_API_KEY'] = FIREWORKS_API_KEY
if DEEPSEEK_API_KEY:
    os.environ['DEEPSEEK_API_KEY'] = DEEPSEEK_API_KEY
if OPENROUTER_API_KEY:
    os.environ['OPENROUTER_API_KEY'] = OPENROUTER_API_KEY
if GEMINI_API_KEY:
    os.environ['GEMINI_API_KEY'] = GEMINI_API_KEY

# Add AWS environment variables if they exist
if AWS_ACCESS_KEY_ID:
    os.environ['AWS_ACCESS_KEY_ID'] = AWS_ACCESS_KEY_ID
if AWS_SECRET_ACCESS_KEY:
    os.environ['AWS_SECRET_ACCESS_KEY'] = AWS_SECRET_ACCESS_KEY
if AWS_REGION_NAME:
    os.environ['AWS_REGION_NAME'] = AWS_REGION_NAME

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
    top_p: float = None,
    stop: Optional[Union[str, List[str]]] = None  # Add stop parameter
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
        stop (Union[str, List[str]], optional): Up to 4 sequences where the API will stop generating tokens
        
    Returns:
        Union[Dict[str, Any], Any]: API response, either complete or streaming
        
    Raises:
        Exception: If API call fails after retries
    """
    litellm.set_verbose = False

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
        nonlocal model_name  # Add this to access model_name
        for attempt in range(max_attempts):
            try:
                return await api_call_func()
            except litellm.exceptions.RateLimitError as e:
                # Check if it's Bedrock Claude and switch to direct Anthropic
                if "bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0" in model_name:
                    logging.info("Rate limit hit with Bedrock Claude, falling back to direct Anthropic API...")
                    model_name = "anthropic/claude-3-5-sonnet-latest"
                    continue
                
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

        # Add stop parameter if provided
        if stop is not None:
            api_call_params["stop"] = stop

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
        
        # Add OpenRouter specific parameters
        if "openrouter" in model_name.lower():
            if settings.or_site_url:
                api_call_params["headers"] = {
                    "HTTP-Referer": settings.or_site_url
                }
            if settings.or_app_name:
                api_call_params["headers"] = {
                    "X-Title": settings.or_app_name
                }

        # Add special handling for Deepseek
        if "deepseek" in model_name.lower():
            api_call_params["frequency_penalty"] = 0.5
            api_call_params["temperature"] = 0.7
            api_call_params["presence_penalty"] = 0.1

        # Add Bedrock-specific parameters
        if "bedrock" in model_name.lower():
            if settings.aws_access_key_id:
                api_call_params["aws_access_key_id"] = settings.aws_access_key_id
            if settings.aws_secret_access_key:
                api_call_params["aws_secret_access_key"] = settings.aws_secret_access_key
            if settings.aws_region_name:
                api_call_params["aws_region_name"] = settings.aws_region_name

        # Log the API request
        # logging.info(f"Sending API request: {json.dumps(api_call_params, indent=2)}")

        # Make the API call using either agentops session or direct litellm
        if agentops_session:
            response = await agentops_session.patch(litellm.acompletion)(**api_call_params)
        else:
            response = await litellm.acompletion(**api_call_params)
        
        # logging.info(f"Received API response: {response}")

        # # For streaming responses, attach cost tracking
        # if stream:
        #     # Create a wrapper object to track costs across chunks
        #     cost_tracker = {
        #         "prompt_tokens": 0,
        #         "completion_tokens": 0,
        #         "total_tokens": 0,
        #         "cost": 0.0
        #     }
            
        #     # Get the cost per token for the model
        #     model_cost = litellm.model_cost.get(model_name, {})
        #     input_cost = model_cost.get('input_cost_per_token', 0)
        #     output_cost = model_cost.get('output_cost_per_token', 0)
            
        #     # Attach the cost tracker to the response
        #     response.cost_tracker = cost_tracker
        #     response.model_info = {
        #         "input_cost_per_token": input_cost,
        #         "output_cost_per_token": output_cost
        #     }
        # else:
        #     # For non-streaming, cost is already included in the response
        #     response._hidden_params = {
        #         "response_cost": litellm.completion_cost(completion_response=response)
        #     }
            
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

    # asyncio.run(test_llm_api_call())

    async def test_bedrock():
        """
        Test function for Bedrock API call.
        """
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Hello from Bedrock!"}
        ]
        model_name = "bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0"

        response = await make_llm_api_call(messages, model_name, stream=True)
        
        print("\n🤖 Streaming response from Bedrock:\n")
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

    # Add test_bedrock to the test runs
    # asyncio.run(test_bedrock())
