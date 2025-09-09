# app/schemas.py
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum

# =========================
# Pricing-related models
# =========================


class PricePack(BaseModel):
    """A price pack for an item: buy `qty` units for `bundle_price`."""
    qty: float = Field(ge=0.0)
    bundle_price: float = Field(ge=0.0)


class PriceCalcPack(BaseModel):
    """One pack used in the price calculation."""
    qty: float
    count: int
    bundle_price: float
    subtotal: float


class PriceCalc(BaseModel):
    """Full price calculation summary (precomputed client-side)."""
    total: float
    method: Literal["dp", "greedy-ceil", "fallback-none"]
    packs: List[PriceCalcPack] = Field(default_factory=list)


class Item(BaseModel):
    """Extracted product option from a post description."""
    name: Optional[str] = None
    type: Optional[str] = None
    prices: List[PricePack] = Field(default_factory=list)


# =========================
# Pagination models
# =========================

class PaginatedResponse(BaseModel):
    """Generic paginated response wrapper"""
    data: List[dict]
    total: int
    page: int
    page_size: int
    total_pages: int


# =========================
# Sorting models
# =========================

class SortField(BaseModel):
    """Sort field configuration"""
    field: str
    direction: Literal["asc", "desc"] = "asc"


# =========================
# Status models
# =========================

class StatusIn(BaseModel):
    status_code: str
    display_name: str
    description: Optional[str] = None
    is_active: bool = True
    view_order: Optional[int] = None


class StatusOut(StatusIn):
    id: str
    model_config = ConfigDict(from_attributes=True)


# =========================
# User (customer) models
# =========================

class UserOut(BaseModel):
    fb_uid: Optional[str] = None
    fb_username: Optional[str] = None
    name: Optional[str] = None
    fb_url: Optional[str] = None
    addresses: List[str] = Field(default_factory=list)
    phone_number: Optional[str] = None
    avatar_url: Optional[str] = None


class OrderUserOut(BaseModel):
    """User object as it appears in orders - keeps single address for shipping"""
    fb_uid: Optional[str] = None
    fb_username: Optional[str] = None
    name: Optional[str] = None
    fb_url: Optional[str] = None
    address: Optional[str] = None
    phone_number: Optional[str] = None
    avatar_url: Optional[str] = None


class UserIn(BaseModel):
    fb_uid: str
    fb_username: Optional[str] = None
    name: Optional[str] = None
    fb_url: Optional[str] = None
    addresses: List[str] = Field(default_factory=list)
    phone_number: Optional[str] = None
    avatar_url: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True


class UserFull(UserIn):
    id: str
    created_date: Optional[str] = None


# =========================
# Post models
# =========================

class PostPatch(BaseModel):
    description: Optional[str] = None
    items: Optional[List[Item]] = None
    tags: Optional[List[str]] = None
    import_price: Optional[float] = None


class PostOut(BaseModel):
    id: str
    description: Optional[str] = None
    items: List[Item] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    import_price: Optional[float] = None
    orders_last_update_at: Optional[str] = None
    local_images: List[str] = Field(default_factory=list)
    created_time: Optional[str] = None
    updated_time: Optional[str] = None


# =========================
# Order models (nested in post)
# =========================

class OrderIn(BaseModel):
    """
    Create a new order inside a post.
    Server trusts client-supplied price_calc (already computed).
    """
    comment_id: Optional[str] = None
    comment_url: Optional[str] = None
    comment_text: Optional[str] = None
    comment_created_time: Optional[str] = None

    url: str                 # canonical user link
    qty: float = Field(ge=0.0)
    type: Optional[str] = None
    currency: str = "VND"

    matched_item: Optional[Item] = None     # optional, if you preselect an item
    price_calc: Optional[PriceCalc] = None  # precomputed pricing

    status_code: str = "NEW"
    note: Optional[str] = None


class OrderOut(BaseModel):
    order_id: str
    comment_id: Optional[str] = None
    comment_url: Optional[str] = None
    comment_text: Optional[str] = None
    comment_created_time: Optional[str] = None

    url: str
    qty: float
    type: Optional[str] = None
    currency: str

    matched_item: Optional[Item] = None
    price_calc: Optional[PriceCalc] = None

    status_code: str
    status_history: List[dict] = Field(default_factory=list)
    parsed_at: Optional[str] = None
    user: Optional[OrderUserOut] = None
    note: Optional[str] = None


class OrderStatusPatch(BaseModel):
    new_status_code: str
    note: Optional[str] = None
    actor: Optional[str] = None


# =========================
# Authentication models
# =========================

class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6)
    role: UserRole = UserRole.USER


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: str
    username: str
    role: UserRole
    is_active: bool
    created_at: str
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[UserRole] = None
