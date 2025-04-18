import os
import litellm
from dotenv import load_dotenv
from utils.logger import logger

load_dotenv()

# Ensure OPENAI_API_KEY is set for litellm to pick it up automatically
if not os.getenv("OPENAI_API_KEY"):
    logger.warning("OPENAI_API_KEY not found in environment variables. LiteLLM might fail.")

async def generate_thread_name_async(message: str) -> str:
    """
    Generates a concise thread name using the OpenAI API (via LiteLLM) based on the initial message.
    """
    default_name = message.strip()[:50] + "..." if len(message.strip()) > 50 else message.strip()
    
    messages = [
        {
            "role": "system",
            "content": "You are a helpful assistant that generates extremely concise titles (2-4 words maximum) for chat threads based on the user's message. Respond with only the title, no other text or punctuation."
        },
        {
            "role": "user",
            "content": f'Generate an extremely brief title (2-4 words only) for a chat thread that starts with this message: "{message}"'
        }
    ]

    try:
        # Use litellm.acompletion for async call
        response = await litellm.acompletion(
            model="gpt-4o-mini", 
            messages=messages,
            max_tokens=20,
            temperature=0.7,
            # Optional: Add timeout if needed, e.g., request_timeout=10
        )
        
        # Extract the content from the response
        generated_name = response.choices[0].message.content.strip()
        
        return generated_name or default_name
            
    except Exception as e:
        # Catching a general exception, as litellm can raise various types
        logger.error(f"An error occurred during thread name generation using LiteLLM: {e}")
        return default_name 