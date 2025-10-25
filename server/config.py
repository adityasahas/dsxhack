"""
FastAPI Environment Configuration
Manages environment variables using Pydantic Settings
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    Create a .env file in your project root with: OPENAI_API_KEY=your-key-here
    """
    
    OPENAI_API_KEY: str
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )


# Create a global settings instance
settings = Settings()


# Example usage in your FastAPI app:
"""
from fastapi import FastAPI
from config import settings
from openai import OpenAI

client = OpenAI(api_key=settings.OPENAI_API_KEY)

@app.get("/")
def read_root():
    # Use the OpenAI client here
    return {"status": "ok"}
"""