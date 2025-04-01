import redis.asyncio as redis
import os
from dotenv import load_dotenv
import asyncio
import certifi
import ssl
from utils.logger import logger

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
            logger.info("Initializing Redis connection")
            # Initialize the client
            initialize()
            
            # Test the connection if requested
            if test_connection:
                try:
                    await client.ping()
                    logger.info("Successfully connected to Redis")
                except Exception as e:
                    logger.error(f"Error connecting to Redis: {e}")
                    client = None
                    raise e
            
            _initialized = True
            logger.info("Redis connection initialized successfully")
    
    return client

async def close():
    """Close Redis connection."""
    global client, _initialized
    if client:
        logger.info("Closing Redis connection")
        await client.aclose()
        client = None
        _initialized = False
        logger.info("Redis connection closed")

async def get_client():
    """Get the Redis client, initializing if necessary."""
    global client, _initialized
    if client is None or not _initialized:
        logger.debug("Redis client not initialized, initializing now")
        await initialize_async()
    return client 