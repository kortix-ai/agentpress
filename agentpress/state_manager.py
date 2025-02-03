import json
import logging
from typing import Any, Optional, List, Dict
import uuid
from agentpress.thread_manager import ThreadManager

class StateManager:
    """
    Manages state storage using thread messages.
    Each state message contains a complete snapshot of the state at that point in time.
    """

    def __init__(self, thread_id: str):
        """Initialize StateManager with a thread ID."""
        self.thread_manager = ThreadManager()
        self.thread_id = thread_id
        self._state_cache = None
        logging.info(f"StateManager initialized for thread: {thread_id}")

    async def _get_state(self) -> Dict[str, Any]:
        """Get the current complete state."""
        if self._state_cache is not None:
            return self._state_cache.copy()  # Return copy to prevent cache mutation

        # Get the latest state message
        rows = await self.thread_manager.db.fetch_all(
            """
            SELECT content 
            FROM messages 
            WHERE thread_id = ? AND type = 'state_message'
            ORDER BY created_at DESC LIMIT 1
            """,
            (self.thread_id,)
        )
        
        if rows:
            try:
                self._state_cache = json.loads(rows[0][0])
                return self._state_cache.copy()
            except json.JSONDecodeError:
                logging.error("Failed to parse state JSON")
        
        return {}

    async def _save_state(self, state: Dict[str, Any]):
        """Save a new complete state snapshot."""
        # Format state as a string with proper indentation
        formatted_state = json.dumps(state, indent=2)
        
        # Save new state message with complete snapshot
        await self.thread_manager.add_message(
            thread_id=self.thread_id,
            message_data=formatted_state,
            message_type='state_message',
            include_in_llm_message_history=False
        )
        
        # Update cache with a copy
        self._state_cache = state.copy()

    async def set(self, key: str, data: Any) -> Any:
        """Store any JSON-serializable data with a key."""
        state = await self._get_state()
        state[key] = data
        await self._save_state(state)
        logging.info(f'Updated state key: {key}')
        return data

    async def get(self, key: str) -> Optional[Any]:
        """Get data for a key."""
        state = await self._get_state()
        if key in state:
            data = state[key]
            logging.info(f'Retrieved key: {key}')
            return data
        logging.info(f'Key not found: {key}')
        return None

    async def delete(self, key: str):
        """Delete data for a key."""
        state = await self._get_state()
        if key in state:
            del state[key]
            await self._save_state(state)
            logging.info(f"Deleted key: {key}")

    async def update(self, key: str, data: Dict[str, Any]) -> Optional[Any]:
        """Update existing data for a key by merging dictionaries."""
        state = await self._get_state()
        if key in state and isinstance(state[key], dict):
            state[key].update(data)
            await self._save_state(state)
            logging.info(f'Updated state key: {key}')
            return state[key]
        return None

    async def append(self, key: str, item: Any) -> Optional[List[Any]]:
        """Append an item to a list stored at key."""
        state = await self._get_state()
        if key not in state:
            state[key] = []
        if isinstance(state[key], list):
            state[key].append(item)
            await self._save_state(state)
            logging.info(f'Appended to key: {key}')
            return state[key]
        return None

    async def export_store(self) -> dict:
        """Export entire state."""
        state = await self._get_state()
        return state

    async def clear_store(self):
        """Clear entire state."""
        await self._save_state({})
        self._state_cache = {}
        logging.info("Cleared state")
