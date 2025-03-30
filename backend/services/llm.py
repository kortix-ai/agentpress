"""
LLM API interface for making calls to various language models.

This module provides a unified interface for making API calls to different LLM providers
(OpenAI, Anthropic, Groq, etc.) using LiteLLM. It includes support for:
- Streaming responses
- Tool calls and function calling
- Retry logic with exponential backoff
- Model-specific configurations
- Comprehensive error handling
"""

from typing import Union, Dict, Any, Optional, AsyncGenerator
import os
import json
import logging
import asyncio
from openai import OpenAIError
import litellm

# Environment variables for API keys
API_KEYS = {
    'OPENAI': os.environ.get('OPENAI_API_KEY'),
    'ANTHROPIC': os.environ.get('ANTHROPIC_API_KEY'),
    'GROQ': os.environ.get('GROQ_API_KEY')
}

# Set environment variables for API keys
for provider, key in API_KEYS.items():
    if key:
        os.environ[f'{provider}_API_KEY'] = key

class LLMConfig:
    """Configuration class for LLM API calls."""
    
    def __init__(
        self,
        model_name: str,
        temperature: float = 0,
        max_tokens: Optional[int] = None,
        response_format: Optional[Any] = None,
        tools: Optional[list] = None,
        tool_choice: str = "auto",
        api_key: Optional[str] = None,
        api_base: Optional[str] = None,
        stream: bool = False,
        top_p: Optional[float] = None
    ):
        self.model_name = model_name
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.response_format = response_format
        self.tools = tools
        self.tool_choice = tool_choice
        self.api_key = api_key
        self.api_base = api_base
        self.stream = stream
        self.top_p = top_p

    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary for API call."""
        params = {
            "model": self.model_name,
            "messages": self.messages,
            "temperature": self.temperature,
            "response_format": self.response_format,
            "top_p": self.top_p,
            "stream": self.stream,
        }

        if self.api_key:
            params["api_key"] = self.api_key
        if self.api_base:
            params["api_base"] = self.api_base

        # Handle token limits for different models
        if 'o1' in self.model_name:
            if self.max_tokens is not None:
                params["max_completion_tokens"] = self.max_tokens
        else:
            if self.max_tokens is not None:
                params["max_tokens"] = self.max_tokens

        if self.tools:
            params["tools"] = self.tools
            params["tool_choice"] = self.tool_choice

        # Add special headers for Claude models
        if "claude" in self.model_name.lower() or "anthropic" in self.model_name.lower():
            params["extra_headers"] = {
                "anthropic-beta": "max-tokens-3-5-sonnet-2024-07-15"
            }

        return params

class LLMError(Exception):
    """Base exception for LLM-related errors."""
    pass

class LLMRetryError(LLMError):
    """Exception raised when retries are exhausted."""
    pass

async def make_llm_api_call(
    messages: list,
    model_name: str,
    response_format: Optional[Any] = None,
    temperature: float = 0,
    max_tokens: Optional[int] = None,
    tools: Optional[list] = None,
    tool_choice: str = "auto",
    api_key: Optional[str] = None,
    api_base: Optional[str] = None,
    stream: bool = False,
    top_p: Optional[float] = None
) -> Union[Dict[str, Any], AsyncGenerator]:
    """
    Make an API call to a language model using LiteLLM.
    
    Args:
        messages: List of message dictionaries for the conversation
        model_name: Name of the model to use (e.g., "gpt-4", "claude-3")
        response_format: Desired format for the response
        temperature: Sampling temperature (0-1)
        max_tokens: Maximum tokens in the response
        tools: List of tool definitions for function calling
        tool_choice: How to select tools ("auto" or "none")
        api_key: Override default API key
        api_base: Override default API base URL
        stream: Whether to stream the response
        top_p: Top-p sampling parameter
        
    Returns:
        Union[Dict[str, Any], AsyncGenerator]: API response or stream
        
    Raises:
        LLMRetryError: If API call fails after retries
        LLMError: For other API-related errors
    """
    config = LLMConfig(
        model_name=model_name,
        temperature=temperature,
        max_tokens=max_tokens,
        response_format=response_format,
        tools=tools,
        tool_choice=tool_choice,
        api_key=api_key,
        api_base=api_base,
        stream=stream,
        top_p=top_p
    )
    config.messages = messages

    async def attempt_api_call(max_attempts: int = 3) -> Any:
        """Attempt API call with retry logic."""
        for attempt in range(max_attempts):
            try:
                params = config.to_dict()
                logging.info(f"Sending API request: {json.dumps(params, indent=2)}")
                
                response = await litellm.acompletion(**params)
                logging.info(f"Received API response: {response}")
                return response
                
            except litellm.exceptions.RateLimitError as e:
                logging.warning(f"Rate limit exceeded. Waiting for 30 seconds before retrying...")
                await asyncio.sleep(30)
            except OpenAIError as e:
                logging.info(f"API call failed, retrying attempt {attempt + 1}. Error: {e}")
                await asyncio.sleep(5)
            except json.JSONDecodeError:
                logging.error(f"JSON decoding failed, retrying attempt {attempt + 1}")
                await asyncio.sleep(5)
            except Exception as e:
                logging.error(f"Unexpected error during API call: {e}")
                raise LLMError(f"API call failed: {str(e)}")
                
        raise LLMRetryError("Failed to make API call after multiple attempts")

    return await attempt_api_call()

