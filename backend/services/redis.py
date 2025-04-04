import redis.asyncio as redis
import os
from dotenv import load_dotenv
import asyncio
import certifi
import ssl
from utils.logger import logger
import random
import time
from functools import wraps

# Redis client
client = None
REDIS_KEY_TTL = 3600 * 24  # 24 hour TTL as safety mechanism
_initialized = False
_init_lock = asyncio.Lock()

# Retry configuration
MAX_RETRIES = 5
BASE_RETRY_DELAY = 0.5  # Start with 500ms delay
MAX_RETRY_DELAY = 10.0  # Maximum delay of 10 seconds
RETRY_JITTER = 0.1  # Add 10% random jitter to retry delay

async def with_retry(func, *args, **kwargs):
    """Execute a Redis operation with exponential backoff retry."""
    retries = 0
    last_exception = None
    
    while retries < MAX_RETRIES:
        try:
            return await func(*args, **kwargs)
        except (redis.ConnectionError, redis.TimeoutError, ConnectionResetError) as e:
            retries += 1
            last_exception = e
            
            if retries >= MAX_RETRIES:
                logger.error(f"Redis operation failed after {MAX_RETRIES} retries: {str(e)}")
                raise
            
            # Calculate backoff with jitter
            delay = min(BASE_RETRY_DELAY * (2 ** (retries - 1)), MAX_RETRY_DELAY)
            jitter = delay * RETRY_JITTER * random.uniform(-1, 1)
            wait_time = delay + jitter
            
            logger.warning(f"Redis connection error (attempt {retries}/{MAX_RETRIES}): {str(e)}. Retrying in {wait_time:.2f}s")
            await asyncio.sleep(wait_time)
            
            # Try to reconnect if needed
            if client and hasattr(client, 'connection_pool'):
                try:
                    logger.debug("Trying to reconnect to Redis...")
                    await client.ping()
                    logger.debug("Redis reconnection successful")
                except Exception as reconnect_error:
                    logger.warning(f"Redis reconnection failed: {str(reconnect_error)}")
                    # Force reinitialization on next attempt
                    global _initialized
                    _initialized = False

def initialize():
    """Initialize Redis connection using environment variables (synchronous)."""
    global client
    
    # Load environment variables if not already loaded
    load_dotenv()
    
    # Create Redis client with more robust retry configuration
    client = redis.Redis(
        host=os.getenv('REDIS_HOST'),
        port=int(os.getenv('REDIS_PORT', '6379')),
        password=os.getenv('REDIS_PASSWORD'),
        ssl=os.getenv('REDIS_SSL', 'True').lower() == 'true',
        ssl_ca_certs=certifi.where(),
        decode_responses=True,
        socket_timeout=5.0,          # Socket timeout
        socket_connect_timeout=5.0,  # Connection timeout
        retry_on_timeout=True,       # Auto-retry on timeout
        health_check_interval=30,    # Check connection health every 30 seconds
        max_connections=10           # Limit connections to prevent overloading
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
                retry_count = 0
                max_init_retries = 3
                while retry_count < max_init_retries:
                    try:
                        await client.ping()
                        logger.info("Successfully connected to Redis")
                        break
                    except Exception as e:
                        retry_count += 1
                        if retry_count >= max_init_retries:
                            logger.error(f"Failed to connect to Redis after {max_init_retries} attempts: {e}")
                            client = None
                            raise e
                        wait_time = BASE_RETRY_DELAY * (2 ** (retry_count - 1))
                        logger.warning(f"Redis connection attempt {retry_count} failed: {e}. Retrying in {wait_time:.2f}s...")
                        await asyncio.sleep(wait_time)
            
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

class RedisFallbackHandler:
    """Provides fallback behavior when Redis operations fail."""
    
    @staticmethod
    async def set(key, value, ex=None, fallback_value=None):
        """Try to set a value in Redis with fallback behavior."""
        try:
            redis_client = await get_client()
            await with_retry(redis_client.set, key, value, ex=ex)
            return True
        except Exception as e:
            logger.warning(f"Redis set operation failed for key {key}: {str(e)}")
            return False
    
    @staticmethod
    async def get(key, default=None):
        """Try to get a value from Redis with fallback."""
        try:
            redis_client = await get_client()
            result = await with_retry(redis_client.get, key)
            return result if result is not None else default
        except Exception as e:
            logger.warning(f"Redis get operation failed for key {key}: {str(e)}")
            return default
    
    @staticmethod
    async def delete(key):
        """Try to delete a key from Redis with fallback."""
        try:
            redis_client = await get_client()
            await with_retry(redis_client.delete, key)
            return True
        except Exception as e:
            logger.warning(f"Redis delete operation failed for key {key}: {str(e)}")
            return False
    
    @staticmethod
    async def publish(channel, message):
        """Try to publish a message with fallback."""
        try:
            redis_client = await get_client()
            await with_retry(redis_client.publish, channel, message)
            return True
        except Exception as e:
            logger.warning(f"Redis publish operation failed for channel {channel}: {str(e)}")
            return False
    
    @staticmethod
    async def keys(pattern):
        """Try to get keys matching pattern with fallback."""
        try:
            redis_client = await get_client()
            return await with_retry(redis_client.keys, pattern)
        except Exception as e:
            logger.warning(f"Redis keys operation failed for pattern {pattern}: {str(e)}")
            return [] 