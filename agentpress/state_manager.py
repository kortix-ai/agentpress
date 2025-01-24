"""
Manages persistent state storage for AgentPress components using thread-based events.

The StateManager provides thread-safe access to state data stored as events in threads,
allowing components to save and retrieve data across sessions. Each state update
creates a new event containing the complete state.
"""

import json
import logging
from typing import Any, Optional, List, Dict
from asyncio import Lock
from agentpress.thread_manager import ThreadManager

class StateManager:
    """
    Manages persistent state storage for AgentPress components using thread events.
    
    The StateManager provides thread-safe access to state data stored as events,
    maintaining the complete state in each event for better consistency and tracking.
    
    Attributes:
        lock (Lock): Asyncio lock for thread-safe state access
        thread_id (str): Thread ID for state storage
        thread_manager (ThreadManager): Thread manager instance for event handling
    """

    def __init__(self, thread_id: str):
        """
        Initialize StateManager with thread ID.
        
        Args:
            thread_id (str): Thread ID for state storage
        """
        self.lock = Lock()
        self.thread_id = thread_id
        self.thread_manager = ThreadManager()
        logging.info(f"StateManager initialized with thread_id: {self.thread_id}")

    async def initialize(self):
        """Initialize the thread manager."""
        await self.thread_manager.initialize()

    async def _ensure_initialized(self):
        """Ensure thread manager is initialized."""
        if not self.thread_manager.db._initialized:
            await self.initialize()

    async def _get_current_state(self) -> dict:
        """Get the current state from the latest state event."""
        await self._ensure_initialized()
        events = await self.thread_manager.get_thread_events(
            thread_id=self.thread_id,
            event_types=["state"],
            order_by="created_at",
            order="DESC"
        )
        if events:
            return events[0]["content"].get("state", {})
        return {}

    async def _save_state(self, state: dict):
        """Save the complete state as a new event."""
        await self._ensure_initialized()
        await self.thread_manager.create_event(
            thread_id=self.thread_id,
            event_type="state",
            content={"state": state}
        )

    async def set(self, key: str, data: Any) -> Any:
        """
        Store data with a key in the state.
        
        Args:
            key (str): Simple string key like "config" or "settings"
            data (Any): Any JSON-serializable data
            
        Returns:
            Any: The stored data
        """
        async with self.lock:
            try:
                current_state = await self._get_current_state()
                current_state[key] = data
                await self._save_state(current_state)
                logging.info(f'Updated state key: {key}')
                return data
            except Exception as e:
                logging.error(f"Error setting state: {e}")
                raise

    async def get(self, key: str) -> Optional[Any]:
        """
        Get data for a key from the current state.
        
        Args:
            key (str): Simple string key like "config" or "settings"
            
        Returns:
            Any: The stored data for the key, or None if key not found
        """
        async with self.lock:
            try:
                current_state = await self._get_current_state()
                if key in current_state:
                    logging.info(f'Retrieved key: {key}')
                    return current_state[key]
                logging.info(f'Key not found: {key}')
                return None
            except Exception as e:
                logging.error(f"Error getting state: {e}")
                raise

    async def delete(self, key: str):
        """
        Delete a key from the state.
        
        Args:
            key (str): Simple string key like "config" or "settings"
        """
        async with self.lock:
            try:
                current_state = await self._get_current_state()
                if key in current_state:
                    del current_state[key]
                    await self._save_state(current_state)
                    logging.info(f"Deleted key: {key}")
            except Exception as e:
                logging.error(f"Error deleting state: {e}")
                raise

    async def update(self, key: str, data: Dict[str, Any]) -> Optional[Any]:
        """
        Update existing dictionary data for a key by merging.
        
        Args:
            key (str): Simple string key like "config" or "settings"
            data (Dict[str, Any]): Dictionary of updates to merge
            
        Returns:
            Optional[Any]: Updated data if successful, None if key not found
        """
        async with self.lock:
            try:
                current_state = await self._get_current_state()
                if key in current_state and isinstance(current_state[key], dict):
                    current_state[key].update(data)
                    await self._save_state(current_state)
                    return current_state[key]
                return None
            except Exception as e:
                logging.error(f"Error updating state: {e}")
                raise

    async def append(self, key: str, item: Any) -> Optional[List[Any]]:
        """
        Append an item to a list stored at key.
        
        Args:
            key (str): Simple string key like "config" or "settings"
            item (Any): Item to append
            
        Returns:
            Optional[List[Any]]: Updated list if successful, None if key not found
        """
        async with self.lock:
            try:
                current_state = await self._get_current_state()
                if key not in current_state:
                    current_state[key] = []
                if isinstance(current_state[key], list):
                    current_state[key].append(item)
                    await self._save_state(current_state)
                    return current_state[key]
                return None
            except Exception as e:
                logging.error(f"Error appending to state: {e}")
                raise

    async def get_latest_state(self) -> dict:
        """
        Get the latest complete state.
        
        Returns:
            dict: Complete contents of the latest state
        """
        async with self.lock:
            try:
                state = await self._get_current_state()
                logging.info(f"Retrieved latest state with {len(state)} keys")
                return state
            except Exception as e:
                logging.error(f"Error getting latest state: {e}")
                raise

    async def clear_state(self):
        """
        Clear the entire state.
        """
        async with self.lock:
            try:
                await self._save_state({})
                logging.info("Cleared state")
            except Exception as e:
                logging.error(f"Error clearing state: {e}")
                raise
