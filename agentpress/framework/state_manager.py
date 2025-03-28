import json
import logging
from typing import Any, Optional, List, Dict, Union, AsyncGenerator
from asyncio import Lock
from contextlib import asynccontextmanager
import uuid
from agentpress.framework.db_connection import DBConnection
import asyncio
import traceback

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
        """Create a new state store.
        
        Returns:
            str: The ID of the new store
        """
        db = DBConnection()
        await db.initialize()
        
        try:
            # Generate a new UUID for the store
            store_id = str(uuid.uuid4())
            
            # Create the store in the database
            client = await db.client
            await client.table('state_stores').insert({
                'store_id': store_id,
                'store_data': json.dumps({})
            }).execute()
            
            return store_id
        except Exception as e:
            logging.error(f"Error creating state store: {e}")
            raise e
        finally:
            await db.disconnect()

    async def _ensure_store_exists(self):
        """Ensure store exists in database."""
        try:
            client = await self.db.client
            # First try to find the store
            store = await client.table('state_stores').select('*').eq('store_id', self.store_id).execute()
            
            if not store.data:
                # If store doesn't exist, create it
                try:
                    await client.table('state_stores').insert({
                        'store_id': self.store_id,
                        'store_data': json.dumps({})
                    }).execute()
                except Exception as e:
                    # If we get a duplicate key error, the store was created by another process
                    if 'duplicate key value' not in str(e):
                        raise e
        except Exception as e:
            logging.error(f"Error ensuring store exists: {e}")
            # If there's an error, try to find the store again
            client = await self.db.client
            store = await client.table('state_stores').select('*').eq('store_id', self.store_id).execute()
            if not store.data:
                raise e

    async def store_scope(self, scope_key: str, state: Optional[Dict] = None) -> Dict:
        """Store or retrieve state for a specific scope key."""
        await self._ensure_store_exists()
        
        try:
            client = await self.db.client
            
            # Get the current store data
            store_result = await client.table('state_stores').select('store_data').eq('store_id', self.store_id).execute()
            
            # Initialize store_data
            store_data = {}
            
            # Parse the store data if it exists
            if store_result.data and len(store_result.data) > 0 and store_result.data[0].get('store_data'):
                try:
                    store_data = json.loads(store_result.data[0]['store_data'])
                except json.JSONDecodeError:
                    # If the JSON is invalid, just start with an empty dict
                    store_data = {}
            
            # Get the current scope data or initialize it
            scope_data = store_data.get(scope_key, {})
            
            # If we're storing new state, update it
            if state is not None:
                # Update the scope data
                store_data[scope_key] = state
                
                # Update the store in the database
                await client.table('state_stores').update({
                    'store_data': json.dumps(store_data)
                }).eq('store_id', self.store_id).execute()
                
                return state
            
            # Otherwise, just return the current scope data
            return scope_data
            
        except Exception as e:
            logging.error(f"Error in store operation: {e}")
            logging.debug(traceback.format_exc())
            raise e

    async def get(self, key: str, default: Any = None) -> Any:
        """Get a value from the state store."""
        try:
            # Get the global scope
            global_scope = await self.store_scope('global')
            
            # Return the value from the global scope, or default if not found
            return global_scope.get(key, default)
        except Exception as e:
            logging.error(f"Error getting state: {e}")
            return default

    async def set(self, key: str, value: Any) -> None:
        """Set a value in the state store."""
        try:
            # Get the global scope
            global_scope = await self.store_scope('global')
            
            # Update the value
            global_scope[key] = value
            
            # Store the updated scope
            await self.store_scope('global', global_scope)
        except Exception as e:
            logging.error(f"Error setting state: {e}")
            raise e

    async def delete(self, key: str) -> bool:
        """Delete a key from the state store.
        
        Returns:
            bool: True if the key was deleted, False if it didn't exist
        """
        try:
            # Get the global scope
            global_scope = await self.store_scope('global')
            
            # Remove the key if it exists
            if key in global_scope:
                del global_scope[key]
                
                # Store the updated scope
                await self.store_scope('global', global_scope)
                return True
            
            return False
        except Exception as e:
            logging.error(f"Error deleting state: {e}")
            return False

    async def append(self, key: str, item: Any) -> Optional[List[Any]]:
        """Append an item to a list stored in the state.
        
        Returns:
            Optional[List[Any]]: The updated list, or None if the operation failed
        """
        try:
            # Get the global scope
            global_scope = await self.store_scope('global')
            
            # Get the current list or create a new one
            current_list = global_scope.get(key, [])
            
            # Make sure it's a list
            if not isinstance(current_list, list):
                current_list = [current_list]
                
            # Append the item
            current_list.append(item)
            
            # Update the global scope
            global_scope[key] = current_list
            
            # Store the updated scope
            await self.store_scope('global', global_scope)
            
            return current_list
        except Exception as e:
            logging.error(f"Error appending to state: {e}")
            return None
            
    async def reset(self) -> bool:
        """Reset the state store to empty.
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Create an empty global scope
            await self.store_scope('global', {})
            return True
        except Exception as e:
            logging.error(f"Error resetting state: {e}")
            return False

    async def export_store(self) -> dict:
        """Export the entire state store.
        
        Returns:
            dict: The full state store contents
        """
        try:
            client = await self.db.client
            store_result = await client.table('state_stores').select('store_data').eq('store_id', self.store_id).execute()
            
            if store_result.data and len(store_result.data) > 0 and store_result.data[0].get('store_data'):
                try:
                    return json.loads(store_result.data[0]['store_data'])
                except json.JSONDecodeError:
                    return {}
            
            return {}
        except Exception as e:
            logging.error(f"Error exporting state: {e}")
            return {}
            
    async def import_store(self, store_data: dict) -> bool:
        """Import data to the state store.
        
        Args:
            store_data (dict): Data to import
            
        Returns:
            bool: True if successful
        """
        try:
            client = await self.db.client
            
            # Ensure the store exists first
            await self._ensure_store_exists()
            
            # Update the store with the new data
            await client.table('state_stores').update({
                'store_data': json.dumps(store_data)
            }).eq('store_id', self.store_id).execute()
            
            return True
        except Exception as e:
            logging.error(f"Error importing state: {e}")
            return False

    async def clear_store(self) -> bool:
        """Clear all data from the store.
        
        Returns:
            bool: True if successful
        """
        try:
            client = await self.db.client
            
            # Update store with empty data
            await client.table('state_stores').update({
                'store_data': json.dumps({})
            }).eq('store_id', self.store_id).execute()
            
            return True
        except Exception as e:
            logging.error(f"Error clearing state: {e}")
            return False

    @classmethod
    async def list_stores(cls) -> List[Dict[str, Any]]:
        """
        List all state stores.
        
        Returns:
            List[Dict[str, Any]]: List of store metadata
        """
        db = DBConnection()
        client = await db.client
        stores = await client.table('state_stores').select('*').execute()
        return [
            {
                'id': store['store_id'],
                'created_at': store['created_at'],
                'updated_at': store['updated_at']
            }
            for store in stores.data
        ]
