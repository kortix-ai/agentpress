from sqlalchemy import Column, Integer, String, Text, ForeignKey, Float, JSON, Boolean
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from agentpress.config import settings  # Changed from Settings to settings
import os
from contextlib import asynccontextmanager
import uuid
from datetime import datetime

Base = declarative_base()

class Thread(Base):
    __tablename__ = 'threads'

    thread_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    messages = Column(Text)
    created_at = Column(Integer)

    runs = relationship("ThreadRun", back_populates="thread")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.created_at = int(datetime.utcnow().timestamp())

class ThreadRun(Base):
    __tablename__ = "thread_runs"

    id = Column(String, primary_key=True)
    thread_id = Column(String, ForeignKey("threads.thread_id"))
    status = Column(String, default="queued")
    last_error = Column(String, nullable=True)
    created_at = Column(Integer)
    started_at = Column(Integer, nullable=True)
    cancelled_at = Column(Integer, nullable=True)
    failed_at = Column(Integer, nullable=True)
    completed_at = Column(Integer, nullable=True)
    model = Column(String)
    temperature = Column(Float)
    max_tokens = Column(Integer, nullable=True)
    top_p = Column(Float, nullable=True)
    tool_choice = Column(String)
    execute_tools_async = Column(Boolean)
    system_message = Column(JSON)
    tools = Column(JSON, nullable=True)
    usage = Column(JSON, nullable=True)
    response_format = Column(JSON, nullable=True)
    autonomous_iterations_amount = Column(Integer, nullable=True)
    continue_instructions = Column(String, nullable=True)
    iterations = Column(JSON, nullable=True)

    thread = relationship("Thread", back_populates="runs")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.created_at = int(datetime.utcnow().timestamp())

# class MemoryModule(Base):
#     __tablename__ = 'memory_modules'

#     id = Column(Integer, primary_key=True)
#     thread_id = Column(Integer, ForeignKey('threads.thread_id'))
#     module_name = Column(String)
#     data = Column(Text)

#     __table_args__ = (UniqueConstraint('thread_id', 'module_name', name='_thread_module_uc'),)

#     thread = relationship("Thread", back_populates="memory_modules")


class Database:
    def __init__(self):
        db_url = f"{settings.database_url}"
        self.engine = create_async_engine(db_url, echo=False)
        self.SessionLocal = sessionmaker(
            class_=AsyncSession, expire_on_commit=False, autocommit=False, autoflush=False, bind=self.engine
        )

    @asynccontextmanager
    async def get_async_session(self):
        async with self.SessionLocal() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    async def create_tables(self):
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def close(self):
        await self.engine.dispose()



if __name__ == "__main__":
    import asyncio
    import logging

    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    async def init_db():
        logger.info("Initializing database...")
        db = Database()
        try:
            await db.create_tables()
            logger.info("Database tables created successfully.")
        except Exception as e:
            logger.error(f"Error creating database tables: {e}")
        finally:
            await db.close()

    asyncio.run(init_db())

