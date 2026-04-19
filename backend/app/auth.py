from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .db import get_db
from .schemas import TokenData, UserRole
from motor.motor_asyncio import AsyncIOMotorDatabase

# Security configuration — JWT_SECRET_KEY must be set in the environment
import os as _os
SECRET_KEY: str = _os.environ.get("JWT_SECRET_KEY", "")
if not SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY environment variable is not set. "
        "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

security = HTTPBearer()
BCRYPT_MAX_PASSWORD_BYTES = 72


def _is_bcrypt_password_length_valid(password: str) -> bool:
    """Return True when password length is compatible with bcrypt."""
    return len(password.encode("utf-8")) <= BCRYPT_MAX_PASSWORD_BYTES

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    if not _is_bcrypt_password_length_valid(plain_password):
        return False

    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except (ValueError, TypeError):
        return False


def get_password_hash(password: str) -> str:
    """Hash a password."""
    if not _is_bcrypt_password_length_valid(password):
        raise ValueError(
            f"Password cannot exceed {BCRYPT_MAX_PASSWORD_BYTES} bytes for bcrypt."
        )
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_user_by_username(db: AsyncIOMotorDatabase, username: str):
    """Get user by username from database."""
    user = await db["users"].find_one({"username": username})
    return user


async def authenticate_user(db: AsyncIOMotorDatabase, username: str, password: str):
    """Authenticate a user with username and password."""
    user = await get_user_by_username(db, username)
    if not user:
        return False
    if not verify_password(password, user["hashed_password"]):
        return False
    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get current authenticated user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username, role=payload.get("role"))
    except JWTError:
        raise credentials_exception

    user = await get_user_by_username(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(current_user: dict = Depends(get_current_user)):
    """Get current active user."""
    if not current_user.get("is_active", True):
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def require_role(required_role: UserRole):
    """Dependency to require specific role."""
    async def role_checker(current_user: dict = Depends(get_current_active_user)):
        if current_user.get("role") != required_role.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user
    return role_checker


def require_admin():
    """Dependency to require admin role."""
    return require_role(UserRole.ADMIN)


def require_user_or_admin():
    """Dependency to require user or admin role."""
    async def role_checker(current_user: dict = Depends(get_current_active_user)):
        user_role = current_user.get("role")
        if user_role not in [UserRole.USER.value, UserRole.ADMIN.value]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user
    return role_checker
