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


def load_config(config_path: str = "config.yaml") -> AppConfig:
    """Load configuration from YAML file with environment variable overrides."""
    try:
        # Get the absolute path to the config file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.dirname(current_dir)
        full_config_path = os.path.join(backend_dir, config_path)

        # Start with defaults
        config_data = {
            "database": {
                "mongodb_uri": os.getenv("MONGODB_URI", "mongodb://localhost:27017"),
                "db_name": os.getenv("DB_NAME", "minhmom"),
                "default_group_id": os.getenv("DEFAULT_GROUP_ID")
            },
            "images": {
                "base_path": os.getenv("IMAGES_BASE_PATH", "/app/images"),
                "posts_dir": "posts",
                "comments_dir": "comments",
                "allowed_extensions": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
                "max_file_size_mb": 10
            },
            "api": {
                "title": "MinhMom Backend",
                "version": "0.1.0",
                "cors_origins": os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173").split(",")
            },
            "logging": {
                "level": os.getenv("LOG_LEVEL", "INFO"),
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            }
        }

        # Override with YAML file if it exists
        if os.path.exists(full_config_path):
            with open(full_config_path, 'r', encoding='utf-8') as file:
                yaml_data = yaml.safe_load(file)
                if yaml_data:
                    # Deep merge YAML data with environment overrides
                    def deep_merge(base_dict, update_dict):
                        for key, value in update_dict.items():
                            if key in base_dict and isinstance(base_dict[key], dict) and isinstance(value, dict):
                                deep_merge(base_dict[key], value)
                            else:
                                base_dict[key] = value

                    deep_merge(config_data, yaml_data)
        else:
            print(f"Config file not found at {full_config_path}, using environment variables and defaults")

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

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()


class Pagination(BaseModel):
    page: int = 1
    page_size: int = 20
