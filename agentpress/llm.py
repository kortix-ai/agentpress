from typing import Union, Dict, Any
import litellm
import os
import json
import openai
from openai import OpenAIError
import asyncio
import logging
from agentpress.config import settings  # Import the settings

# Import agentops
import agentops

# Load environment variables
OPENAI_API_KEY = settings.openai_api_key
ANTHROPIC_API_KEY = settings.anthropic_api_key
GROQ_API_KEY = settings.groq_api_key

# Export environment variables
os.environ['OPENAI_API_KEY'] = OPENAI_API_KEY
os.environ['ANTHROPIC_API_KEY'] = ANTHROPIC_API_KEY
os.environ['GROQ_API_KEY'] = GROQ_API_KEY
# os.environ['LITELLM_LOG'] = 'DEBUG'

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def make_llm_api_call(messages, model_name, json_mode=False, temperature=0, max_tokens=None, tools=None, tool_choice="auto", api_key=None, api_base=None, agentops_session=None, stream=False, top_p=None, response_format=None) -> Union[Dict[str, Any], str]:
    litellm.set_verbose = True

    async def attempt_api_call(api_call_func, max_attempts=3):
        for attempt in range(max_attempts):
            try:
                return await api_call_func()
            except litellm.exceptions.RateLimitError as e:
                logger.warning(f"Rate limit exceeded. Waiting for 30 seconds before retrying...")
                await asyncio.sleep(30)
            except OpenAIError as e:
                logger.info(f"API call failed, retrying attempt {attempt + 1}. Error: {e}")
                await asyncio.sleep(5)
            except json.JSONDecodeError:
                logger.error(f"JSON decoding failed, retrying attempt {attempt + 1}")
                await asyncio.sleep(5)
        raise Exception("Failed to make API call after multiple attempts.")

    async def api_call():
        api_call_params = {
            "model": model_name,
            "messages": messages,
            "temperature": temperature,
            "response_format": response_format or ({"type": "json_object"} if json_mode else None),
            "top_p": top_p,
            "stream": stream,
        }

        # Add api_key and api_base if provided
        if api_key:
            api_call_params["api_key"] = api_key
        if api_base:
            api_call_params["api_base"] = api_base

        # Use 'max_completion_tokens' for 'o1' models, otherwise use 'max_tokens'
        if 'o1' in model_name:
            if max_tokens is not None:
                api_call_params["max_completion_tokens"] = max_tokens
        else:
            if max_tokens is not None:
                api_call_params["max_tokens"] = max_tokens

        if tools:
            # Use the existing method of adding tools
            api_call_params["tools"] = tools
            api_call_params["tool_choice"] = tool_choice

        if "claude" in model_name.lower() or "anthropic" in model_name.lower():
            api_call_params["extra_headers"] = {
                "anthropic-beta": "max-tokens-3-5-sonnet-2024-07-15"
            }
        
        # Log the API request
        logger.info(f"Sending API request: {json.dumps(api_call_params, indent=2)}")

        if agentops_session:
            response = await agentops_session.patch(litellm.acompletion)(**api_call_params)
        else:
            response = await litellm.acompletion(**api_call_params)

        # Log the API response
        logger.info(f"Received API response: {response}")

        return response

    return await attempt_api_call(api_call)

# Sample Usage
if __name__ == "__main__":
    import asyncio
    async def test_llm_api_call(stream=True):
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Complex essay on economics"}
        ]
        model_name = "gpt-4o"

        response = await make_llm_api_call(messages, model_name, stream=stream)

        if stream:
            print("Streaming response:")
            async for chunk in response:
                if isinstance(chunk, dict) and 'choices' in chunk:
                    content = chunk['choices'][0]['delta'].get('content', '')
                    print(content, end='', flush=True)
                else:
                    # For non-dict responses (like ModelResponse objects)
                    content = chunk.choices[0].delta.content
                    if content:
                        print(content, end='', flush=True)
            print("\nStream completed.")
        else:
            print("Non-streaming response:")
            if isinstance(response, dict) and 'choices' in response:
                print(response['choices'][0]['message']['content'])
            else:
                # For non-dict responses (like ModelResponse objects)
                print(response.choices[0].message.content)

    # Example usage:
    # asyncio.run(test_llm_api_call(stream=True))  # For streaming
    # asyncio.run(test_llm_api_call(stream=False))  # For non-streaming

    asyncio.run(test_llm_api_call())