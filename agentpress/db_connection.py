"""
Centralized database connection management for AgentPress.
"""

import asyncpg
import logging
from contextlib import asynccontextmanager
import os
import asyncio
import json

class DBConnection:
    """Singleton database connection manager."""
    
    _instance = None
    _initialized = False
    _db_config = {
        'dsn': 'postgresql://agentpress_owner:DkrT4eUS7hpb@ep-empty-bonus-a8nmv66l-pooler.eastus2.azure.neon.tech/agentpress?sslmode=require',
        'min_size': 2,  # Minimum number of connections
        'max_size': 10,  # Maximum number of connections
        'max_inactive_connection_lifetime': 300.0,  # 5 minutes
        'command_timeout': 60.0  # 1 minute command timeout
    }
    _init_lock = asyncio.Lock()
    _initialization_task = None
    _pool = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._initialization_task = asyncio.create_task(cls._instance._initialize())
        return cls._instance

    def __init__(self):
        """No initialization needed in __init__ as it's handled in __new__"""
        pass

    @classmethod
    async def _initialize(cls):
        """Internal initialization method."""
        if cls._initialized:
            return

        async with cls._init_lock:
            if cls._initialized:  # Double-check after acquiring lock
                return
                
            try:
                # Create connection pool
                cls._pool = await asyncpg.create_pool(**cls._db_config)
                
                async with cls._pool.acquire() as conn:
                    # Threads table
                    await conn.execute("""
                        CREATE TABLE IF NOT EXISTS threads (
                            id TEXT PRIMARY KEY,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    """)
                    
                    # Messages table - Fixed syntax for PostgreSQL
                    await conn.execute("""
                        CREATE TABLE IF NOT EXISTS messages (
                            id TEXT PRIMARY KEY,
                            thread_id TEXT REFERENCES threads(id),
                            type TEXT,
                            content TEXT,
                            include_in_llm_message_history BOOLEAN DEFAULT TRUE,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    """)
                    
                cls._initialized = True
                logging.info("Database schema initialized")
            except Exception as e:
                logging.error(f"Database initialization error: {e}")
                raise

    @classmethod
    def set_db_config(cls, config: dict):
        """Set custom database configuration."""
        if cls._initialized:
            raise RuntimeError("Cannot change database config after initialization")
        cls._db_config.update(config)
        logging.info(f"Updated database configuration")

    @asynccontextmanager
    async def connection(self):
        """Get a database connection."""
        if self._initialization_task and not self._initialized:
            await self._initialization_task
            
        async with self._pool.acquire() as conn:
            try:
                yield conn
            except Exception as e:
                logging.error(f"Database error: {e}")
                raise

    @asynccontextmanager
    async def transaction(self):
        """Execute operations in a transaction."""
        async with self.connection() as conn:
            async with conn.transaction():
                try:
                    yield conn
                except Exception as e:
                    logging.error(f"Transaction error: {e}")
                    raise

    async def execute(self, query: str, params: tuple = ()):
        """Execute a single query."""
        async with self.connection() as conn:
            try:
                # Handle empty params case
                if not params:
                    return await conn.execute(query)
                    
                # Convert params tuple to list and unpack for asyncpg
                params_list = list(params)
                return await conn.execute(query, *params_list)
            except Exception as e:
                logging.error(f"Query execution error: {e}")
                raise

    async def fetch_one(self, query: str, params: tuple = ()):
        """Fetch a single row."""
        async with self.connection() as conn:
            try:
                # Handle empty params case
                if not params:
                    return await conn.fetchrow(query)
                    
                # Convert params tuple to list and unpack for asyncpg
                params_list = list(params)
                return await conn.fetchrow(query, *params_list)
            except Exception as e:
                logging.error(f"Query execution error: {e}")
                raise

    async def fetch_all(self, query: str, params: tuple = ()):
        """Fetch all rows."""
        async with self.connection() as conn:
            try:
                # Handle empty params case
                if not params:
                    return await conn.fetch(query)
                    
                # Convert params tuple to list and unpack for asyncpg
                params_list = list(params)
                return await conn.fetch(query, *params_list)
            except Exception as e:
                logging.error(f"Query execution error: {e}")
                raise 