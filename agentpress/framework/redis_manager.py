import redis.asyncio as redis
import os
from dotenv import load_dotenv

# Redis client
client = None
REDIS_KEY_TTL = 3600 * 24  # 24 hour TTL as safety mechanism

def initialize():
    """Initialize Redis connection using environment variables."""
    global client
    
    # Load environment variables if not already loaded
    load_dotenv()
    
    client = redis.Redis(
        host=os.getenv('REDIS_HOST'),
        port=int(os.getenv('REDIS_PORT', '6379')),
        password=os.getenv('REDIS_PASSWORD'),
        ssl=os.getenv('REDIS_SSL', 'True').lower() == 'true',
        decode_responses=True
    )
    
    return client

async def close():
    """Close Redis connection."""
    global client
    if client:
        await client.aclose()
        client = None

async def get_client():
    """Get the Redis client, initializing if necessary."""
    global client
    if client is None:
        initialize()
    return client 