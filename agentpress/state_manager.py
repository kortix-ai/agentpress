import json
import logging
from typing import Any, Optional, List, Dict, Union, AsyncGenerator
from asyncio import Lock
from contextlib import asynccontextmanager
import uuid
from agentpress.db_connection import DBConnection
import asyncio

class StateManager:
    """
    Manages persistent state storage for AgentPress components.
    
    The StateManager provides thread-safe access to a SQLite-based state store,
    allowing components to save and retrieve data across sessions. Each store
    has a unique ID and contains multiple key-value pairs in a single JSON object.
    
    Attributes:
        lock (Lock): Asyncio lock for thread-safe state access
        db (DBConnection): Database connection manager
        store_id (str): Unique identifier for this state store
    """

    def __init__(self, store_id: Optional[str] = None):
        """
        Initialize StateManager with optional store ID.
        
        Args:
            store_id (str, optional): Unique identifier for the store. If None, creates new.
        """
        self.lock = Lock()
        self.db = DBConnection()
        self.store_id = store_id or str(uuid.uuid4())
        logging.info(f"StateManager initialized with store_id: {self.store_id}")
        asyncio.create_task(self._ensure_store_exists())

    @classmethod
    async def create_store(cls) -> str:
        """Create a new state store and return its ID."""
        store_id = str(uuid.uuid4())
        manager = cls(store_id)
        await manager._ensure_store_exists()
        return store_id

    async def _ensure_store_exists(self):
        """Ensure store exists in database."""
        async with self.db.transaction() as conn:
            await conn.execute("""
                INSERT OR IGNORE INTO state_stores (store_id, store_data)
                VALUES (?, ?)
            """, (self.store_id, json.dumps({})))

    @asynccontextmanager
    async def store_scope(self):
        """
        Context manager for atomic state operations.
        
        Provides thread-safe access to the state store, handling database
        operations and ensuring proper cleanup.
        
        Yields:
            dict: The current state store contents
            
        Raises:
            Exception: If there are errors with database operations
        """
        async with self.lock:
            try:
                async with self.db.transaction() as conn:
                    async with conn.execute(
                        "SELECT store_data FROM state_stores WHERE store_id = ?",
                        (self.store_id,)
                    ) as cursor:
                        row = await cursor.fetchone()
                        store = json.loads(row[0]) if row else {}
                    
                    yield store
                    
                    await conn.execute(
                        """
                        UPDATE state_stores 
                        SET store_data = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE store_id = ?
                        """, 
                        (json.dumps(store), self.store_id)
                    )
            except Exception as e:
                logging.error("Error in store operation", exc_info=True)
                raise

    async def set(self, key: str, data: Any) -> Any:
        """
        Store any JSON-serializable data with a key.
        
        Args:
            key (str): Simple string key like "config" or "settings"
            data (Any): Any JSON-serializable data
            
        Returns:
            Any: The stored data
            
        Raises:
            Exception: If there are errors during storage operation
        """
        async with self.store_scope() as store:
            store[key] = data
            logging.info(f'Updated store key: {key}')
            return data

    async def get(self, key: str) -> Optional[Any]:
        """
        Get data for a key.
        
        Args:
            key (str): Simple string key like "config" or "settings"
            
        Returns:
            Any: The stored data for the key, or None if key not found
        """
        async with self.store_scope() as store:
            if key in store:
                data = store[key]
                logging.info(f'Retrieved key: {key}')
                return data
            logging.info(f'Key not found: {key}')
            return None

    async def delete(self, key: str):
        """
        Delete data for a key.
        
        Args:
            key (str): Simple string key like "config" or "settings"
        """
        async with self.store_scope() as store:
            if key in store:
                del store[key]
                logging.info(f"Deleted key: {key}")

    async def update(self, key: str, data: Dict[str, Any]) -> Optional[Any]:
        """Update existing data for a key by merging dictionaries."""
        async with self.store_scope() as store:
            if key in store and isinstance(store[key], dict):
                store[key].update(data)
                logging.info(f'Updated store key: {key}')
                return store[key]
            return None

    async def append(self, key: str, item: Any) -> Optional[List[Any]]:
        """Append an item to a list stored at key."""
        async with self.store_scope() as store:
            if key not in store:
                store[key] = []
            if isinstance(store[key], list):
                store[key].append(item)
                logging.info(f'Appended to key: {key}')
                return store[key]
            return None

    async def export_store(self) -> dict:
        """
        Export entire store.
        
        Returns:
            dict: Complete contents of the state store
        """
        async with self.store_scope() as store:
            logging.info(f"Store content: {store}")
            return store

    async def clear_store(self):
        """
        Clear entire store.
        
        Removes all data from the store, resetting it to an empty state.
        This operation is atomic and thread-safe.
        """
        async with self.store_scope() as store:
            store.clear()
            logging.info("Cleared store")

    @classmethod
    async def list_stores(cls) -> List[Dict[str, Any]]:
        """
        List all available state stores.
        
        Returns:
            List of store information including IDs and timestamps
        """
        db = DBConnection()
        async with db.transaction() as conn:
            async with conn.execute(
                "SELECT store_id, created_at, updated_at FROM state_stores ORDER BY updated_at DESC"
            ) as cursor:
                stores = [
                    {
                        "store_id": row[0],
                        "created_at": row[1],
                        "updated_at": row[2]
                    }
                    for row in await cursor.fetchall()
                ]
            return stores
