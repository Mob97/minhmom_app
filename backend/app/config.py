from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict
import yaml
import os
from typing import List, Optional


class DatabaseConfig(BaseModel):
    mongodb_uri: str = "mongodb://localhost:27017"
    db_name: str = "minhmom"
    default_group_id: Optional[str] = None


class ImageConfig(BaseModel):
    base_path: str = "../minhmom_fb/downloaded_files/images"
    posts_dir: str = "posts"
    comments_dir: str = "comments"
    orders_dir: str = "orders"
    stock_dir: str = "stock"
    allowed_extensions: List[str] = [".jpg", ".jpeg", ".png", ".gif", ".webp"]
    max_file_size_mb: int = 10


class APIConfig(BaseModel):
    title: str = "MinhMom Backend"
    version: str = "0.1.0"
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]


class LoggingConfig(BaseModel):
    level: str = "INFO"
    format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"


class AppConfig(BaseModel):
    database: DatabaseConfig
    images: ImageConfig
    api: APIConfig
    logging: LoggingConfig


def _deep_merge(base: dict, override: dict) -> None:
    """Merge override into base in-place; nested dicts are merged recursively."""
    for key, value in override.items():
        if key in base and isinstance(base[key], dict) and isinstance(value, dict):
            _deep_merge(base[key], value)
        else:
            base[key] = value


def load_config(config_path: str = "config.yaml") -> AppConfig:
    """Load configuration: defaults → YAML → environment variables (env wins)."""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.dirname(current_dir)
        full_config_path = os.path.join(backend_dir, config_path)

        # 1. Hardcoded defaults
        config_data: dict = {
            "database": {
                "mongodb_uri": "mongodb://localhost:27017",
                "db_name": "minhmom",
                "default_group_id": None,
            },
            "images": {
                "base_path": "/app/images",
                "posts_dir": "posts",
                "comments_dir": "comments",
                "orders_dir": "orders",
                "allowed_extensions": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
                "max_file_size_mb": 10,
            },
            "api": {
                "title": "MinhMom Backend",
                "version": "0.1.0",
                "cors_origins": [
                    "http://localhost:3000",
                    "http://127.0.0.1:3000",
                    "http://localhost:5173",
                    "http://127.0.0.1:5173",
                ],
            },
            "logging": {
                "level": "INFO",
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            },
        }

        # 2. Overlay YAML file
        if os.path.exists(full_config_path):
            with open(full_config_path, "r", encoding="utf-8") as fh:
                yaml_data = yaml.safe_load(fh)
                if yaml_data:
                    _deep_merge(config_data, yaml_data)
        else:
            print(f"Config file not found at {full_config_path}, using defaults")

        # 3. Environment variables win over everything
        if os.getenv("MONGODB_URI"):
            config_data["database"]["mongodb_uri"] = os.environ["MONGODB_URI"]
        if os.getenv("DB_NAME"):
            config_data["database"]["db_name"] = os.environ["DB_NAME"]
        if os.getenv("DEFAULT_GROUP_ID"):
            config_data["database"]["default_group_id"] = os.environ["DEFAULT_GROUP_ID"]
        if os.getenv("IMAGES_BASE_PATH"):
            config_data["images"]["base_path"] = os.environ["IMAGES_BASE_PATH"]
        if os.getenv("CORS_ORIGINS"):
            config_data["api"]["cors_origins"] = os.environ["CORS_ORIGINS"].split(",")
        if os.getenv("LOG_LEVEL"):
            config_data["logging"]["level"] = os.environ["LOG_LEVEL"]

        return AppConfig(**config_data)
    except Exception as e:
        print(f"Error loading config: {e}, using defaults")
        return AppConfig(
            database=DatabaseConfig(),
            images=ImageConfig(),
            api=APIConfig(),
            logging=LoggingConfig()
        )


# Load configuration
config = load_config()


# Legacy settings for backward compatibility
class Settings(BaseSettings):
    MONGODB_URI: str = config.database.mongodb_uri
    DB_NAME: str = config.database.db_name
    DEFAULT_GROUP_ID: str | None = config.database.default_group_id

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()


class Pagination(BaseModel):
    page: int = 1
    page_size: int = 20
