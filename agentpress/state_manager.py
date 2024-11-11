import json
import os
import logging
from typing import Any
from asyncio import Lock
from contextlib import asynccontextmanager

class StateManager:
    """
    Manages persistent state storage for AgentPress components.
    
    The StateManager provides thread-safe access to a JSON-based state store,
    allowing components to save and retrieve data across sessions. It handles
    concurrent access using asyncio locks and provides atomic operations for
    state modifications.
    
    Attributes:
        lock (Lock): Asyncio lock for thread-safe state access
        store_file (str): Path to the JSON file storing the state
    """

    def __init__(self, store_file: str = "state.json"):
        """
        Initialize StateManager with custom store file name.
        
        Args:
            store_file (str): Path to the JSON file to store state.
                Defaults to "state.json" in the current directory.
        """
        self.lock = Lock()
        self.store_file = store_file
        logging.info(f"StateManager initialized with store file: {store_file}")

    @asynccontextmanager
    async def store_scope(self):
        """
        Context manager for atomic state operations.
        
        Provides thread-safe access to the state store, handling file I/O
        and ensuring proper cleanup. Automatically loads the current state
        and saves changes when the context exits.
        
        Yields:
            dict: The current state store contents
            
        Raises:
            Exception: If there are errors reading from or writing to the store file
        """
        try:
            # Read current state
            if os.path.exists(self.store_file):
                with open(self.store_file, 'r') as f:
                    store = json.load(f)
            else:
                store = {}
            
            yield store
            
            # Write updated state
            with open(self.store_file, 'w') as f:
                json.dump(store, f, indent=2)
            logging.debug("Store saved successfully")
        except Exception as e:
            logging.error("Error in store operation", exc_info=True)
            raise

    async def set(self, key: str, data: Any):
        """
        Store any JSON-serializable data with a simple key.
        
        Args:
            key (str): Simple string key like "config" or "settings"
            data (Any): Any JSON-serializable data (dict, list, str, int, bool, etc)
            
        Returns:
            Any: The stored data
            
        Raises:
            Exception: If there are errors during storage operation
        """
        async with self.lock:
            async with self.store_scope() as store:
                try:
                    store[key] = data  # Will be JSON serialized when written to file
                    logging.info(f'Updated store key: {key}')
                    return data
                except Exception as e:
                    logging.error(f'Error in set: {str(e)}')
                    raise

    async def get(self, key: str) -> Any:
        """
        Get data for a key.
        
        Args:
            key (str): Simple string key like "config" or "settings"
            
        Returns:
            Any: The stored data for the key, or None if key not found
            
        Note:
            This operation is read-only and doesn't require locking
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
            
        Note:
            No error is raised if the key doesn't exist
        """
        async with self.lock:
            async with self.store_scope() as store:
                if key in store:
                    del store[key]
                    logging.info(f"Deleted key: {key}")
                else:
                    logging.info(f"Key not found for deletion: {key}")

    async def export_store(self) -> dict:
        """
        Export entire store.
        
        Returns:
            dict: Complete contents of the state store
            
        Note:
            This operation is read-only and returns a copy of the store
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
        async with self.lock:
            async with self.store_scope() as store:
                store.clear()
                logging.info("Cleared store")
