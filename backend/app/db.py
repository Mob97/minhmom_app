from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings

client: AsyncIOMotorClient | None = None

def get_client() -> AsyncIOMotorClient:
    global client
    if client is None:
        client = AsyncIOMotorClient(settings.MONGODB_URI)
    return client

def get_db():
    return get_client()[settings.DB_NAME]

def posts_col(db, group_id: str):
    # Posts are stored per-group in your current layout: group_{group_id}
    return db[f"group_{group_id}"]

def customers_col(db):
    return db["customers"]

def statuses_col(db):
    return db["order_statuses"]
