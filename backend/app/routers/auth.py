from fastapi import APIRouter, Depends, HTTPException, status
from datetime import timedelta, datetime, timezone
from ..db import get_db
from ..schemas import ChangePasswordRequest, UserCreate, UserLogin, UserResponse, Token, UserRole
from ..auth import (
    get_password_hash,
    verify_password,
    authenticate_user,
    create_access_token,
    get_current_active_user,
    require_admin,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from ..utils import to_local_time
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse)
async def register(
    user: UserCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: dict = Depends(require_admin()),
):
    """Register a new user."""
    # Check if user already exists
    existing_user = await db["users"].find_one({"username": user.username})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    # Create new user
    try:
        hashed_password = get_password_hash(user.password)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc)
        ) from exc
    user_doc = {
        "username": user.username,
        "hashed_password": hashed_password,
        "role": user.role.value,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    result = await db["users"].insert_one(user_doc)
    user_doc["id"] = str(result.inserted_id)

    return UserResponse(
        id=user_doc["id"],
        username=user_doc["username"],
        role=UserRole(user_doc["role"]),
        is_active=user_doc["is_active"],
        created_at=to_local_time(user_doc["created_at"])
    )


@router.post("/login", response_model=Token)
async def login(user_credentials: UserLogin, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Login user and return access token."""
    user = await authenticate_user(db, user_credentials.username, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"], "role": user["role"]},
        expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: dict = Depends(get_current_active_user)):
    """Get current user information."""
    return UserResponse(
        id=str(current_user["_id"]),
        username=current_user["username"],
        role=UserRole(current_user["role"]),
        is_active=current_user["is_active"],
        created_at=to_local_time(current_user["created_at"])
    )


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List all users (admin only)."""
    if current_user["role"] != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    users = []
    async for user in db["users"].find():
        users.append(UserResponse(
            id=str(user["_id"]),
            username=user["username"],
            role=UserRole(user["role"]),
            is_active=user["is_active"],
            created_at=to_local_time(user["created_at"])
        ))

    return users


@router.post("/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Change current user's password."""
    if not verify_password(password_data.current_password, current_user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )

    if password_data.current_password == password_data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password",
        )

    try:
        hashed_password = get_password_hash(password_data.new_password)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc)
        ) from exc

    await db["users"].update_one(
        {"_id": current_user["_id"]},
        {"$set": {"hashed_password": hashed_password}}
    )

    return {"message": "Password changed successfully"}
