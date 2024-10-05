from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from core.db import Agent
from datetime import datetime
from typing import List, Optional
import json

class AgentManager:
    def __init__(self, db):
        self.db = db

    async def create_agent(self, model: str, name: str, system_prompt: str, selected_tools: List[str], temperature: float = 0.5) -> int:
        async with self.db.get_async_session() as session:
            new_agent = Agent(
                model=model,
                name=name,
                system_prompt=system_prompt,
                selected_tools=selected_tools,  # Store as a list directly
                temperature=temperature,
                created_at=datetime.now().isoformat()
            )
            session.add(new_agent)
            await session.commit()
            await session.refresh(new_agent)
            return new_agent.id

    async def get_agent(self, agent_id: int) -> Optional[Agent]:
        async with self.db.get_async_session() as session:
            result = await session.execute(select(Agent).filter(Agent.id == agent_id))
            agent = result.scalar_one_or_none()
            return agent

    async def update_agent(self, agent_id: int, **kwargs) -> bool:
        async with self.db.get_async_session() as session:
            result = await session.execute(select(Agent).filter(Agent.id == agent_id))
            agent = result.scalar_one_or_none()
            if agent:
                for key, value in kwargs.items():
                    setattr(agent, key, value)
                await session.commit()
                return True
            return False

    async def delete_agent(self, agent_id: int) -> bool:
        async with self.db.get_async_session() as session:
            result = await session.execute(select(Agent).filter(Agent.id == agent_id))
            agent = result.scalar_one_or_none()
            if agent:
                await session.delete(agent)
                await session.commit()
                return True
            return False

    async def list_agents(self) -> List[Agent]:
        async with self.db.get_async_session() as session:
            result = await session.execute(select(Agent))
            agents = result.scalars().all()
            return agents