"""
Centralized database connection management for AgentPress using Supabase.
"""

import logging
import os
from typing import Optional
from supabase import create_async_client, AsyncClient

class DBConnection:
    """Singleton database connection manager using Supabase."""
    
    _instance: Optional['DBConnection'] = None
    _initialized = False
    _client: Optional[AsyncClient] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """No initialization needed in __init__ as it's handled in __new__"""
        pass

    async def initialize(self):
        """Initialize the database connection."""
        if self._initialized:
            return
                
        try:
            supabase_url = os.getenv('SUPABASE_URL')
            supabase_key = os.getenv('SUPABASE_ANON_KEY')
            
            if not supabase_url or not supabase_key:
                raise RuntimeError("SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set.")

            self._client = await create_async_client(supabase_url, supabase_key)
            self._initialized = True
            logging.info("Database connection initialized with Supabase")
        except Exception as e:
            logging.error(f"Database initialization error: {e}")
            raise RuntimeError(f"Failed to initialize database connection: {str(e)}")

    @classmethod
    async def disconnect(cls):
        """Disconnect from the database."""
        if cls._client:
            await cls._client.close()
            cls._initialized = False
            logging.info("Database disconnected")

    @property
    async def client(self) -> AsyncClient:
        """Get the Supabase client instance."""
        if not self._initialized:
            await self.initialize()
        if not self._client:
            raise RuntimeError("Database not initialized")
        return self._client


