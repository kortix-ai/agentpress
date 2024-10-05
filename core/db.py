from sqlalchemy import Column, Integer, String, Text, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from core.config import settings  # Changed from Settings to settings
import os
from contextlib import asynccontextmanager

Base = declarative_base()

class Thread(Base):
    __tablename__ = 'threads'

    thread_id = Column(Integer, primary_key=True)
    messages = Column(Text)
    creation_date = Column(String)
    last_updated_date = Column(String)

    thread_runs = relationship("ThreadRun", back_populates="thread")
    # memory_modules = relationship("MemoryModule", back_populates="thread")

class ThreadRun(Base):
    __tablename__ = 'thread_runs'

    run_id = Column(Integer, primary_key=True)
    thread_id = Column(Integer, ForeignKey('threads.thread_id'))
    messages = Column(Text)
    creation_date = Column(String)
    status = Column(String) 
    error_message = Column(Text, nullable=True) 

    thread = relationship("Thread", back_populates="thread_runs")

class Agent(Base):
    __tablename__ = 'agents'

    id = Column(Integer, primary_key=True)
    model = Column(String, nullable=False)
    name = Column(String, nullable=False)
    system_prompt = Column(Text, nullable=False)
    selected_tools = Column(JSON)  # Changed from ARRAY to JSON
    temperature = Column(Float, default=0.5)
    created_at = Column(String, nullable=False)

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

