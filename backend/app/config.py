"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    app_name: str = "SentinelAI"
    environment: str = "development"
    debug: bool = False
    log_level: str = "INFO"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # Database
    database_url: str = "postgresql+asyncpg://sentinel:sentinel@localhost:5432/sentinel_db"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Auth
    secret_key: str = "change-me-to-a-random-secret-key"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # CORS
    cors_origins: str = "http://localhost:3000"

    # Detection
    max_prompt_size_bytes: int = 102400  # 100KB
    detection_timeout_seconds: float = 5.0
    llm_classifier_enabled: bool = False
    score_threshold_warn: float = 0.3
    score_threshold_block: float = 0.7

    # Weights for score aggregation
    weight_regex: float = 0.30
    weight_ner: float = 0.25
    weight_code: float = 0.20
    weight_fingerprint: float = 0.15
    weight_llm: float = 0.10

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
