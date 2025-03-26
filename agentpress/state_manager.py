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
    
    The StateManager provides thread-safe access to a database-stored state store,
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
        prisma = await self.db.prisma
        await prisma.statestore.upsert(
            where={'id': self.store_id},
            data={
                'create': {'id': self.store_id, 'data': json.dumps({})},
                'update': {}
            }
        )

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
                prisma = await self.db.prisma
                store = await prisma.statestore.find_unique(where={'id': self.store_id})
                store_data = json.loads(store.data) if store else {}
                
                yield store_data
                
                await prisma.statestore.update(
                    where={'id': self.store_id},
                    data={'data': json.dumps(store_data)}
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
        """
        async with self.store_scope() as store:
            store[key] = data
            return data

    async def get(self, key: str) -> Optional[Any]:
        """
        Retrieve data stored with a key.
        
        Args:
            key (str): Key to retrieve
            
        Returns:
            Any: The stored data or None if not found
        """
        async with self.store_scope() as store:
            return store.get(key)

    async def delete(self, key: str):
        """
        Delete data stored with a key.
        
        Args:
            key (str): Key to delete
        """
        async with self.store_scope() as store:
            if key in store:
                del store[key]

    async def update(self, key: str, data: Dict[str, Any]) -> Optional[Any]:
        """
        Update data stored with a key.
        
        Args:
            key (str): Key to update
            data (Dict[str, Any]): Data to update with
            
        Returns:
            Any: The updated data or None if key not found
        """
        async with self.store_scope() as store:
            if key in store:
                if isinstance(store[key], dict):
                    store[key].update(data)
                else:
                    store[key] = data
                return store[key]
            return None

    async def append(self, key: str, item: Any) -> Optional[List[Any]]:
        """
        Append an item to a list stored with a key.
        
        Args:
            key (str): Key of the list
            item (Any): Item to append
            
        Returns:
            List[Any]: The updated list or None if key not found
        """
        async with self.store_scope() as store:
            if key in store:
                if not isinstance(store[key], list):
                    store[key] = []
                store[key].append(item)
                return store[key]
            return None

    async def export_store(self) -> dict:
        """
        Export the entire store contents.
        
        Returns:
            dict: The complete store contents
        """
        async with self.store_scope() as store:
            return store.copy()

    async def clear_store(self):
        """Clear all data from the store."""
        async with self.store_scope() as store:
            store.clear()

    @classmethod
    async def list_stores(cls) -> List[Dict[str, Any]]:
        """
        List all state stores.
        
        Returns:
            List[Dict[str, Any]]: List of store metadata
        """
        db = DBConnection()
        prisma = await db.prisma
        stores = await prisma.statestore.find_many()
        return [
            {
                'id': store.id,
                'created_at': store.created_at,
                'updated_at': store.updated_at
            }
            for store in stores
        ]
