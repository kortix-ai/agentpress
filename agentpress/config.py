import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    database_url: str
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    dir_base_path: str = ''
    workspace_dir: str = ''
    tools_dir: str = ''

    class Config:
        env_file = ".env"

    def __init__(self, **values):
        super().__init__(**values)
        self.workspace_dir = os.path.join(self.dir_base_path, 'workspace')
        self.tools_dir = os.path.join(self.dir_base_path, 'tools')
        os.makedirs(self.workspace_dir, exist_ok=True)

settings = Settings()