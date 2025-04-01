import redis.asyncio as redis
import os
from dotenv import load_dotenv
import asyncio
import certifi
import ssl

# Redis client
client = None
REDIS_KEY_TTL = 3600 * 24  # 24 hour TTL as safety mechanism
_initialized = False
_init_lock = asyncio.Lock()

def initialize():
    """Initialize Redis connection using environment variables (synchronous)."""
    global client
    
    # Load environment variables if not already loaded
    load_dotenv()
    
    # Create Redis client
    client = redis.Redis(
        host=os.getenv('REDIS_HOST'),
        port=int(os.getenv('REDIS_PORT', '6379')),
        password=os.getenv('REDIS_PASSWORD'),
        ssl=os.getenv('REDIS_SSL', 'True').lower() == 'true',
        ssl_ca_certs=certifi.where(),
        decode_responses=True
    )
    
    return client

async def initialize_async(test_connection: bool = False):
    """Initialize Redis connection asynchronously."""
    global client, _initialized
    
    async with _init_lock:
        if not _initialized:
            # Initialize the client
            initialize()
            
            # Test the connection if requested
            if test_connection:
                try:
                    await client.ping()
                except Exception as e:
                    print(f"Error connecting to Redis: {e}")
                    client = None
                    raise e
            
            _initialized = True
    
    return client

async def close():
    """Close Redis connection."""
    global client, _initialized
    if client:
        await client.aclose()
        client = None
        _initialized = False

async def get_client():
    """Get the Redis client, initializing if necessary."""
    global client, _initialized
    if client is None or not _initialized:
        await initialize_async()
    return client 