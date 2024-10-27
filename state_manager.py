import json
import os
import logging
from typing import Any
from asyncio import Lock
from contextlib import asynccontextmanager

class StateManager:
    def __init__(self, store_file: str = "state.json"):
        """
        Initialize StateManager with custom store file name.
        
        Args:
            store_file: Name of the JSON file to store state (default: "state.json")
        """
        self.lock = Lock()
        self.store_file = store_file
        logging.info(f"StateManager initialized with store file: {store_file}")

    @asynccontextmanager
    async def store_scope(self):
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
            key: Simple string key like "config" or "settings"
            data: Any JSON-serializable data (dict, list, str, int, bool, etc)
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
            key: Simple string key like "config" or "settings"
        """
        async with self.store_scope() as store:
            if key in store:
                data = store[key]
                logging.info(f'Retrieved key: {key}')
                return data
            logging.info(f'Key not found: {key}')
            return None

    async def delete(self, key: str):
        """Delete data for a key"""
        async with self.lock:
            async with self.store_scope() as store:
                if key in store:
                    del store[key]
                    logging.info(f"Deleted key: {key}")
                else:
                    logging.info(f"Key not found for deletion: {key}")

    async def export_store(self) -> dict:
        """Export entire store"""
        async with self.store_scope() as store:
            logging.info(f"Store content: {store}")
            return store

    async def clear_store(self):
        """Clear entire store"""
        async with self.lock:
            async with self.store_scope() as store:
                store.clear()
                logging.info("Cleared store")
