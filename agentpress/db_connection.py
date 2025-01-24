"""
Centralized database connection management for AgentPress.
"""

import aiosqlite
import logging
from contextlib import asynccontextmanager
import os
import asyncio
import json

class DBConnection:
    """Singleton database connection manager."""
    _instance = None
    _initialized = False
    _db_path = "ap.db"

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def initialize(self):
        """Initialize the database connection and schema."""
        if self._initialized:
            return

        try:
            # Ensure the database directory exists
            os.makedirs(os.path.dirname(os.path.abspath(self._db_path)), exist_ok=True)

            # Initialize database and create schema
            async with aiosqlite.connect(self._db_path) as db:
                await db.execute("PRAGMA foreign_keys = ON")
                
                # Create threads table
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS threads (
                        id TEXT PRIMARY KEY,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # Create events table
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS events (
                        id TEXT PRIMARY KEY,
                        thread_id TEXT,
                        type TEXT,
                        content TEXT,
                        include_in_llm_message_history INTEGER DEFAULT 0,
                        llm_message TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
                    )
                """)

                await db.commit()
                logging.info("Database initialized successfully")
                self._initialized = True

        except Exception as e:
            logging.error(f"Failed to initialize database: {e}")
            raise

    @asynccontextmanager
    async def transaction(self):
        """Get a database connection with transaction support."""
        if not self._initialized:
            raise Exception("Database not initialized. Call initialize() first.")
            
        async with aiosqlite.connect(self._db_path) as db:
            await db.execute("PRAGMA foreign_keys = ON")
            try:
                yield db
                await db.commit()
                logging.debug("Transaction committed successfully")
            except Exception as e:
                await db.rollback()
                logging.error(f"Transaction failed, rolling back: {e}")
                raise

    async def execute(self, query: str, params: tuple = ()):
        """Execute a query and return the cursor."""
        async with aiosqlite.connect(self._db_path) as db:
            await db.execute("PRAGMA foreign_keys = ON")
            return await db.execute(query, params)

    async def fetch_all(self, query: str, params: tuple = ()):
        """Execute a query and fetch all results."""
        async with aiosqlite.connect(self._db_path) as db:
            await db.execute("PRAGMA foreign_keys = ON")
            cursor = await db.execute(query, params)
            return await cursor.fetchall()

    async def fetch_one(self, query: str, params: tuple = ()):
        """Execute a query and fetch one result."""
        async with aiosqlite.connect(self._db_path) as db:
            await db.execute("PRAGMA foreign_keys = ON")
            cursor = await db.execute(query, params)
            return await cursor.fetchone()

    def _serialize_json(self, data):
        """Serialize data to JSON string."""
        return json.dumps(data) if data is not None else None

    def _deserialize_json(self, data):
        """Deserialize JSON string to data."""
        return json.loads(data) if data is not None else None 