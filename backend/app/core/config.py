from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "trajectory-backend"
    app_env: str = "dev"

    cors_origins: list[str] = ["http://localhost:5173"]


settings = Settings()
