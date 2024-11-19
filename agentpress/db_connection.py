"""
Centralized database connection management for AgentPress.
"""

import aiosqlite
import logging
from contextlib import asynccontextmanager
import os
import asyncio

class DBConnection:
    """Singleton database connection manager."""
    
    _instance = None
    _initialized = False
    _db_path = os.path.join(os.getcwd(), "agentpress.db")
    _init_lock = asyncio.Lock()
    _initialization_task = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            # Start initialization when instance is first created
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
                async with aiosqlite.connect(cls._db_path) as db:
                    # Threads table
                    await db.execute("""
                        CREATE TABLE IF NOT EXISTS threads (
                            thread_id TEXT PRIMARY KEY,
                            messages TEXT,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    """)
                    
                    # State stores table
                    await db.execute("""
                        CREATE TABLE IF NOT EXISTS state_stores (
                            store_id TEXT PRIMARY KEY,
                            store_data TEXT,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    """)
                    
                    await db.commit()
                    cls._initialized = True
                    logging.info("Database schema initialized")
            except Exception as e:
                logging.error(f"Database initialization error: {e}")
                raise

    @classmethod
    def set_db_path(cls, db_path: str):
        """Set custom database path."""
        if cls._initialized:
            raise RuntimeError("Cannot change database path after initialization")
        cls._db_path = db_path
        logging.info(f"Updated database path to: {db_path}")

    @asynccontextmanager
    async def connection(self):
        """Get a database connection."""
        # Wait for initialization to complete if it hasn't already
        if self._initialization_task and not self._initialized:
            await self._initialization_task
            
        async with aiosqlite.connect(self._db_path) as conn:
            try:
                yield conn
            except Exception as e:
                logging.error(f"Database error: {e}")
                raise

    @asynccontextmanager
    async def transaction(self):
        """Execute operations in a transaction."""
        async with self.connection() as db:
            try:
                yield db
                await db.commit()
            except Exception as e:
                await db.rollback()
                logging.error(f"Transaction error: {e}")
                raise

    async def execute(self, query: str, params: tuple = ()):
        """Execute a single query."""
        async with self.connection() as db:
            try:
                result = await db.execute(query, params)
                await db.commit()
                return result
            except Exception as e:
                logging.error(f"Query execution error: {e}")
                raise

    async def fetch_one(self, query: str, params: tuple = ()):
        """Fetch a single row."""
        async with self.connection() as db:
            async with db.execute(query, params) as cursor:
                return await cursor.fetchone()

    async def fetch_all(self, query: str, params: tuple = ()):
        """Fetch all rows."""
        async with self.connection() as db:
            async with db.execute(query, params) as cursor:
                return await cursor.fetchall() 