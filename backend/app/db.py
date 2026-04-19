from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import logging
from .config import settings

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient | None = None

def get_client() -> AsyncIOMotorClient:
    global client
    if client is None:
        client = AsyncIOMotorClient(settings.MONGODB_URI)
    return client

def get_db():
    return get_client()[settings.DB_NAME]

def posts_col(db, group_id: str):
    return db[f"group_{group_id}"]

def customers_col(db):
    return db["customers"]

def statuses_col(db):
    return db["order_statuses"]


async def create_indexes(db: AsyncIOMotorDatabase) -> None:
    """Create all indexes. Safe to call on every startup (idempotent)."""
    try:
        await db["customers"].create_index("name")
        await db["customers"].create_index("phone")
        await db["order_statuses"].create_index("name", unique=True)
        await db["users"].create_index("username", unique=True)
        await db["crawl_logs"].create_index(
            "created_at",
            expireAfterSeconds=7 * 24 * 3600,  # TTL: 7 days
        )
        logger.info("MongoDB indexes created/verified")
    except Exception as exc:
        logger.warning("Index creation warning: %s", exc)
