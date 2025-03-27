"""
Centralized database connection management for AgentPress using Prisma ORM.
"""

import logging
import os
import asyncio
from typing import Optional, Union, List, Any
from prisma import Prisma

class DBConnection:
    """Singleton database connection manager using Prisma ORM."""
    
    _instance: Optional['DBConnection'] = None
    _initialized = False
    _prisma: Optional[Prisma] = None

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
            if not os.getenv('DATABASE_URL'):
                raise RuntimeError("DATABASE_URL environment variable is not set. Please set it to connect to your database.")

            self._prisma = Prisma()
            await self._prisma.connect()
            self._initialized = True
            logging.info("Database connection initialized with Prisma")
        except Exception as e:
            logging.error(f"Database initialization error: {e}")
            raise RuntimeError(f"Failed to initialize database connection: {str(e)}")

    @classmethod
    async def disconnect(cls):
        """Disconnect from the database."""
        if cls._prisma:
            await cls._prisma.disconnect()
            cls._initialized = False
            logging.info("Database disconnected")

    @property
    async def prisma(self) -> Prisma:
        """Get the Prisma client instance."""
        if not self._initialized:
            await self.initialize()
        if not self._prisma:
            raise RuntimeError("Database not initialized")
        return self._prisma


