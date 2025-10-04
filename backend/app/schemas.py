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


class StatusPatch(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
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
    addresses: Optional[List[str]] = None  # All addresses for selection


class UpdateCustomerRequest(BaseModel):
    """Request model for updating customer information"""
    name: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    addresses: Optional[List[str]] = None


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

# New order structure schemas
class OrderSource(BaseModel):
    comment_id: Optional[str] = None
    comment_url: Optional[str] = None
    comment_text: Optional[str] = None
    comment_created_time: Optional[str] = None


class OrderCustomer(BaseModel):
    fb_uid: Optional[str] = None
    fb_username: Optional[str] = None
    name: Optional[str] = None
    fb_url: Optional[str] = None
    created_date: Optional[str] = None
    addresses: List[str] = Field(default_factory=list)
    address: Optional[str] = None
    phone_number: Optional[str] = None
    avatar_url: Optional[str] = None
    note: Optional[str] = None


class OrderDeliveryInfo(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None


class OrderItem(BaseModel):
    item_id: Optional[int] = None
    item_name: Optional[str] = None
    item_type: Optional[str] = None
    unit_price: Optional[float] = None
    qty: Optional[float] = None
    total_price: Optional[float] = None
    price_calculation: Optional[PriceCalc] = None


class OrderStatusHistory(BaseModel):
    status: str
    note: Optional[str] = None
    actor: Optional[str] = None
    at: str


class OrderIn(BaseModel):
    """
    Create a new order inside a post.
    Server trusts client-supplied price_calc (already computed).
    """
    # New structured fields
    source: Optional[OrderSource] = None
    customer: Optional[OrderCustomer] = None
    delivery_info: Optional[OrderDeliveryInfo] = None
    item: Optional[OrderItem] = None

    # Legacy fields for backward compatibility
    comment_id: Optional[str] = None
    comment_url: Optional[str] = None
    comment_text: Optional[str] = None
    comment_created_time: Optional[str] = None

    raw_url: str             # canonical user link
    qty: float = Field(ge=0.0)
    type: Optional[str] = None
    currency: str = "VND"

    matched_item: Optional[Item] = None     # optional, if you preselect an item
    price_calc: Optional[PriceCalc] = None  # precomputed pricing

    # Price fields for manual price setting
    unit_price: Optional[float] = None
    total_price: Optional[float] = None

    status_code: str = "NEW"
    note: Optional[str] = None
    user: Optional[OrderUserOut] = None


class OrderUpdate(BaseModel):
    """
    Update an existing order. All fields are optional for partial updates.
    """
    # New structured fields
    source: Optional[OrderSource] = None
    customer: Optional[OrderCustomer] = None
    delivery_info: Optional[OrderDeliveryInfo] = None
    item: Optional[OrderItem] = None

    # Legacy fields for backward compatibility
    comment_id: Optional[str] = None
    comment_url: Optional[str] = None
    comment_text: Optional[str] = None
    comment_created_time: Optional[str] = None

    raw_url: Optional[str] = None
    qty: Optional[float] = Field(None, ge=0.0)
    type: Optional[str] = None
    currency: Optional[str] = None

    matched_item: Optional[Item] = None
    price_calc: Optional[PriceCalc] = None

    # Price fields for manual price setting
    unit_price: Optional[float] = None
    total_price: Optional[float] = None

    status_code: Optional[str] = None
    note: Optional[str] = None
    user: Optional[OrderUserOut] = None


class OrderOut(BaseModel):
    order_id: str
    parsed_at: Optional[str] = None
    currency: str
    raw_url: Optional[str] = None

    # New structured fields
    source: Optional[OrderSource] = None
    customer: Optional[OrderCustomer] = None
    delivery_info: Optional[OrderDeliveryInfo] = None
    item: Optional[OrderItem] = None

    status_code: str
    status_history: List[OrderStatusHistory] = Field(default_factory=list)
    note: Optional[str] = None

    # Legacy fields for backward compatibility
    comment_id: Optional[str] = None
    comment_url: Optional[str] = None
    comment_text: Optional[str] = None
    comment_created_time: Optional[str] = None
    url: Optional[str] = None
    qty: Optional[float] = None
    type: Optional[str] = None
    matched_item: Optional[Item] = None
    price_calc: Optional[PriceCalc] = None
    user: Optional[OrderUserOut] = None
    address: Optional[str] = None


class OrderStatusPatch(BaseModel):
    new_status_code: str
    note: Optional[str] = None
    actor: Optional[str] = None


class SplitOrderRequest(BaseModel):
    split_quantity: int = Field(gt=0, description="Quantity to split to new order")
    new_status_code: str = Field(description="Status for the new split order")
    note: Optional[str] = None


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
