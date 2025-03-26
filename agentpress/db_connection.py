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
    _init_lock = asyncio.Lock()
    _initialization_task = None
    _prisma: Optional[Prisma] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            # Start initialization when instance is first created
            cls._initialization_task = asyncio.create_task(cls._instance._initialize())
        return cls._instance

    def __init__(self):
        """No initialization needed in __init__ as it's handled in __new__"""
        pass

    @classmethod
    async def _initialize(cls):
        """Internal initialization method."""
        if cls._initialized:
            return

        async with cls._init_lock:
            if cls._initialized:  # Double-check after acquiring lock
                return
                
            try:
                cls._prisma = Prisma()
                await cls._prisma.connect()
                cls._initialized = True
                logging.info("Database connection initialized with Prisma")
            except Exception as e:
                logging.error(f"Database initialization error: {e}")
                raise

    async def _wait_for_initialization(self):
        """Wait for database initialization to complete."""
        if self._initialization_task and not self._initialized:
            await self._initialization_task

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
        await self._wait_for_initialization()
        if not self._prisma:
            raise RuntimeError("Database not initialized")
        return self._prisma


