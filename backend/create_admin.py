#!/usr/bin/env python3
"""
Script to create an initial admin user for the MinhMom application.
Run this script to create the first admin user.
"""

import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from app.auth import get_password_hash
from app.config import settings

async def create_admin_user():
    """Create an initial admin user."""
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.DB_NAME]

    # Check if admin user already exists
    existing_admin = await db["users"].find_one({"username": "admin"})
    if existing_admin:
        print("Admin user already exists!")
        return

    # Create admin user
    admin_user = {
        "username": "admin",
        "hashed_password": get_password_hash("admin123"),
        "role": "admin",
        "is_active": True,
        "created_at": "2024-01-01T00:00:00Z"
    }

    result = await db["users"].insert_one(admin_user)
    print(f"Admin user created successfully! ID: {result.inserted_id}")
    print("Username: admin")
    print("Password: admin123")
    print("Please change the password after first login!")

    # Close connection
    client.close()

if __name__ == "__main__":
    asyncio.run(create_admin_user())
