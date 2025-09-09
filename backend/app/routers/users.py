from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from ..db import get_db, customers_col, posts_col
from ..schemas import UserIn, UserFull, PaginatedResponse, OrderUserOut, UpdateCustomerRequest
from ..utils import str_object_id, to_local_time
from ..auth import require_user_or_admin, require_admin
import math

router = APIRouter(prefix="/users", tags=["Users"])


def format_created_date(created_date):
    """Convert datetime object to local time ISO string format"""
    return to_local_time(created_date)


def convert_objectids_to_strings(obj):
    """Recursively convert ObjectIds to strings in a data structure"""
    from bson import ObjectId

    if isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, dict):
        return {key: convert_objectids_to_strings(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_objectids_to_strings(item) for item in obj]
    else:
        return obj


@router.get("/", response_model=PaginatedResponse)
async def list_users(
    q: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str | None = Query(None, description="Field to sort by (e.g., 'name', 'uid', 'username')"),
    sort_direction: str = Query("asc", description="Sort direction: 'asc' or 'desc'"),
    current_user: dict = Depends(require_user_or_admin()),
    db=Depends(get_db)
):
    query = {}
    if q:
        query = {"$or": [{"fb_uid": q}, {"fb_username": q}, {"name": {"$regex": q, "$options": "i"}}]}

    # Get total count
    total = await customers_col(db).count_documents(query)

    # Calculate pagination
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    skip = (page - 1) * page_size

    # Build sort criteria
    sort_criteria = []
    if sort_by:
        # Map frontend field names to database field names
        field_mapping = {
            "fb_uid": "fb_uid",
            "name": "name",
            "fb_username": "fb_username",
            "addresses": "addresses",
            "phone_number": "phone_number"
        }
        db_field = field_mapping.get(sort_by, sort_by)
        sort_direction_int = 1 if sort_direction == "asc" else -1
        sort_criteria.append((db_field, sort_direction_int))
    else:
        # Default sort by name ascending
        sort_criteria.append(("name", 1))

    # Get paginated results with sorting
    cur = customers_col(db).find(query).sort(sort_criteria).skip(skip).limit(page_size)
    docs = await cur.to_list(length=page_size)

    users = [
        UserFull(
            id=str_object_id(d.get("_id")),
            fb_uid=str(d.get("fb_uid")),
            fb_username=d.get("fb_username"),
            name=d.get("name"),
            fb_url=d.get("fb_url"),
            addresses=d.get("addresses", []),
            phone_number=d.get("phone_number"),
            avatar_url=d.get("avatar_url"),
            notes=d.get("notes"),
            is_active=d.get("is_active", True),
            created_date=format_created_date(d.get("created_date")),
        ) for d in docs
    ]

    return PaginatedResponse(
        data=[user.model_dump() for user in users],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{uid}", response_model=UserFull)
async def get_user(
    uid: str,
    current_user: dict = Depends(require_user_or_admin()),
    db=Depends(get_db)
):
    d = await customers_col(db).find_one({"_id": uid}) or await customers_col(db).find_one({"fb_uid": uid})
    if not d:
        raise HTTPException(404, "User not found")
    return UserFull(
        id=str_object_id(d.get("_id")),
        fb_uid=d.get("fb_uid") or uid,
        fb_username=d.get("fb_username"),
        name=d.get("name"),
        fb_url=d.get("fb_url"),
        addresses=d.get("addresses", []),
        phone_number=d.get("phone_number"),
        avatar_url=d.get("avatar_url"),
        notes=d.get("notes"),
        is_active=d.get("is_active", True),
        created_date=format_created_date(d.get("created_date")),
    )


@router.post("/", response_model=UserFull)
async def create_user(
    body: UserIn,
    current_user: dict = Depends(require_admin()),
    db=Depends(get_db)
):
    doc = body.model_dump()
    # Map API fields to database fields
    doc["_id"] = doc["fb_uid"]
    await customers_col(db).update_one({"_id": doc["_id"]}, {"$set": doc}, upsert=True)
    d = await customers_col(db).find_one({"_id": doc["_id"]})
    return UserFull(
        id=str_object_id(d.get("_id")),
        fb_uid=d.get("fb_uid"),
        fb_username=d.get("fb_username"),
        name=d.get("name"),
        fb_url=d.get("fb_url"),
        addresses=d.get("addresses", []),
        phone_number=d.get("phone_number"),
        avatar_url=d.get("avatar_url"),
        notes=d.get("notes"),
        is_active=d.get("is_active", True),
        created_date=format_created_date(d.get("created_date")),
    )


@router.patch("/{uid}", response_model=UserFull)
async def update_user(
    uid: str,
    body: UserIn,
    current_user: dict = Depends(require_admin()),
    db=Depends(get_db)
):
    doc = body.model_dump()
    # Map API fields to database fields
    await customers_col(db).update_one({"_id": uid}, {"$set": doc})
    d = await customers_col(db).find_one({"_id": uid})
    if not d:
        raise HTTPException(404, "User not found after update")
    return UserFull(
        id=str_object_id(d.get("_id")),
        fb_uid=d.get("fb_uid"),
        fb_username=d.get("fb_username"),
        name=d.get("name"),
        fb_url=d.get("fb_url"),
        addresses=d.get("addresses", []),
        phone_number=d.get("phone_number"),
        avatar_url=d.get("avatar_url"),
        notes=d.get("notes"),
        is_active=d.get("is_active", True),
        created_date=format_created_date(d.get("created_date")),
    )


@router.delete("/{uid}")
async def delete_user(
    uid: str,
    current_user: dict = Depends(require_admin()),
    db=Depends(get_db)
):
    res = await customers_col(db).delete_one({"_id": uid})
    if res.deleted_count == 0:
        raise HTTPException(404, "User not found")
    return {"ok": True}


@router.get("/with-orders/", response_model=PaginatedResponse)
async def list_users_with_orders(
    group_id: str = Query(..., description="Group ID to get orders from"),
    q: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str | None = Query(None, description="Field to sort by (e.g., 'name', 'fb_uid', 'order_count')"),
    sort_direction: str = Query("desc", description="Sort direction: 'asc' or 'desc'"),
    active_orders_only: bool = Query(True, description="If True, only include orders that are not DONE or CANCELLED"),
    current_user: dict = Depends(require_user_or_admin()),
    db=Depends(get_db)
):
    # Build aggregation pipeline for efficient database-level processing
    pipeline = [
        # Match posts that have orders
        {"$match": {"orders": {"$exists": True, "$ne": []}}},
        # Unwind orders array
        {"$unwind": "$orders"},
        # Filter out orders without user data
        {"$match": {"orders.user": {"$exists": True, "$ne": None}}},
        # Filter out orders without fb_uid
        {"$match": {"orders.user.fb_uid": {"$exists": True, "$ne": None}}}
    ]

    # Add status filter if active_orders_only is True
    if active_orders_only:
        pipeline.append({"$match": {"orders.status_code": {"$nin": ["DONE", "CANCELLED"]}}})

    # Add search filter if query provided
    if q:
        search_regex = {"$regex": q, "$options": "i"}
        pipeline.append({
            "$match": {
                "$or": [
                    {"orders.user.name": search_regex},
                    {"orders.user.fb_uid": search_regex},
                    {"orders.user.address": search_regex},
                    {"orders.user.phone_number": search_regex}
                ]
            }
        })

    # Group by user and calculate stats
    pipeline.append({
        "$group": {
            "_id": "$orders.user.fb_uid",
            "user_doc": {"$first": "$orders.user"},
            "orders": {"$push": {
                "order": "$orders",
                "post_id": "$_id",
                "post_description": "$description"
            }},
            "order_count": {"$sum": 1},
            "total_revenue": {
                "$sum": {
                    "$cond": [
                        {"$ne": ["$orders.status_code", "CANCELLED"]},
                        {"$ifNull": ["$orders.price_calc.total", 0]},
                        0
                    ]
                }
            },
            # For comment_created_time sorting, get the latest order time
            "latest_comment_time": {
                "$max": "$orders.comment_created_time"
            }
        }
    })

    # Handle sorting - if sorting by comment_created_time, we need special handling
    if sort_by == "comment_created_time":
        sort_direction_val = -1 if sort_direction == "desc" else 1
        pipeline.append({"$sort": {"latest_comment_time": sort_direction_val}})

        # Apply pagination at database level for comment_created_time sorting
        skip = (page - 1) * page_size
        pipeline.extend([
            {"$skip": skip},
            {"$limit": page_size}
        ])

        # Execute aggregation with pagination
        cursor = posts_col(db, group_id).aggregate(pipeline)
        users_data = await cursor.to_list(length=None)

        # Get total count for pagination (without pagination)
        count_pipeline = pipeline[:-2]  # Remove skip and limit
        count_pipeline.append({"$count": "total"})
        count_cursor = posts_col(db, group_id).aggregate(count_pipeline)
        count_result = await count_cursor.to_list(length=1)
        total = count_result[0]["total"] if count_result else 0

    else:
        # For other sorting options, we need to process all data first
        cursor = posts_col(db, group_id).aggregate(pipeline)
        users_data = await cursor.to_list(length=None)

        # Apply sorting in Python for non-comment_created_time fields
        if sort_by == "order_count":
            users_data.sort(key=lambda x: x["order_count"], reverse=(sort_direction == "desc"))
        elif sort_by == "total_revenue":
            users_data.sort(key=lambda x: x["total_revenue"], reverse=(sort_direction == "desc"))
        elif sort_by == "name":
            users_data.sort(key=lambda x: (x["user_doc"].get("name") or "").lower(), reverse=(sort_direction == "desc"))
        elif sort_by == "fb_uid":
            users_data.sort(key=lambda x: (x["user_doc"].get("fb_uid") or "").lower(), reverse=(sort_direction == "desc"))
        else:
            # Default sort by order count descending
            users_data.sort(key=lambda x: x["order_count"], reverse=True)

        # Apply pagination
        total = len(users_data)
        skip = (page - 1) * page_size
        users_data = users_data[skip:skip + page_size]

    # Calculate total pages
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    # Format response
    users = []
    for user_data in users_data:
        user_doc = user_data["user_doc"]
        fb_uid = user_data["_id"]

        # Convert ObjectIds to strings for orders
        orders = []
        for order_data in user_data["orders"]:
            order_copy = convert_objectids_to_strings(order_data["order"])
            orders.append({
                "order": order_copy,
                "post_id": str_object_id(order_data["post_id"]),
                "post_description": order_data["post_description"]
            })

        users.append({
            "id": fb_uid,
            "fb_uid": fb_uid,
            "fb_username": user_doc.get("fb_username"),
            "name": user_doc.get("name"),
            "fb_url": user_doc.get("fb_url"),
            "addresses": [user_doc.get("address", "")] if user_doc.get("address") else [],
            "phone_number": user_doc.get("phone_number"),
            "avatar_url": user_doc.get("avatar_url"),
            "order_count": user_data["order_count"],
            "total_revenue": user_data["total_revenue"],
            "created_date": None,
            "orders": orders
        })

    return PaginatedResponse(
        data=users,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{uid}/orders", response_model=dict)
async def get_user_orders_with_stats(
    uid: str,
    group_id: str = Query(..., description="Group ID to get orders from"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Number of orders per page"),
    current_user: dict = Depends(require_user_or_admin()),
    db=Depends(get_db)
):
    """
    Get a specific user with paginated orders and calculated statistics.
    Statistics are calculated from ALL orders, not just the paginated ones.
    This is optimized for the UserOrdersDrawer component.
    """
    # First, get the user data
    user_doc = await customers_col(db).find_one({"fb_uid": uid})
    if not user_doc:
        raise HTTPException(404, "User not found")

    # Get all posts in the group that have orders for this user
    posts = posts_col(db, group_id).find(
        {"orders.user.fb_uid": uid},
        {"orders": 1, "_id": 1, "description": 1}
    )

    all_orders = []
    async for post in posts:
        orders = post.get("orders", [])
        for order in orders:
            # Check if this order belongs to the user
            if order.get("user", {}).get("fb_uid") == uid:
                # Convert parsed_at to local time string
                order["parsed_at"] = to_local_time(order.get("parsed_at"))
                # Convert comment_created_time to local time string
                order["comment_created_time"] = to_local_time(order.get("comment_created_time"))

                # Convert ObjectIds to strings
                order_copy = convert_objectids_to_strings(order)
                all_orders.append({
                    "order": order_copy,
                    "post_id": str_object_id(post["_id"]),
                    "post_description": post.get("description", "")
                })

    # Calculate statistics from ALL orders (not just paginated ones)
    total_revenue = sum(
        order["order"].get("price_calc", {}).get("total", 0)
        for order in all_orders
        if order["order"].get("status_code") != "CANCELLED"
    )

    cancelled_orders_count = sum(
        1 for order in all_orders
        if order["order"].get("status_code") == "CANCELLED"
    )

    # Sort orders by comment_created_time (newest first) for consistent pagination
    all_orders.sort(key=lambda x: x["order"].get("comment_created_time", ""), reverse=True)

    # Apply pagination
    total_orders = len(all_orders)
    total_pages = math.ceil(total_orders / page_size) if total_orders > 0 else 1
    skip = (page - 1) * page_size
    paginated_orders = all_orders[skip:skip + page_size]

    # Build user response
    user_response = {
        "id": str_object_id(user_doc.get("_id")),
        "fb_uid": user_doc.get("fb_uid"),
        "fb_username": user_doc.get("fb_username"),
        "name": user_doc.get("name"),
        "fb_url": user_doc.get("fb_url"),
        "addresses": [user_doc.get("address", "")] if user_doc.get("address") else [],
        "phone_number": user_doc.get("phone_number"),
        "avatar_url": user_doc.get("avatar_url"),
        "order_count": total_orders,  # Total count of all orders
        "total_revenue": total_revenue,  # Revenue from ALL orders
        "cancelled_orders_count": cancelled_orders_count,  # Count from ALL orders
        "created_date": format_created_date(user_doc.get("created_date")),
        "orders": paginated_orders,  # Only paginated orders
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total_orders,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
    }

    return user_response


@router.get("/search/", response_model=List[OrderUserOut])
async def search_customers(
    q: str = Query(..., description="Search query for customer name"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results"),
    current_user: dict = Depends(require_user_or_admin()),
    db=Depends(get_db)
):
    """Search customers by name and return top results for dropdown selection"""
    if not q or len(q.strip()) < 2:
        return []

    # Search by name (case insensitive)
    query = {"name": {"$regex": q.strip(), "$options": "i"}}

    # Get customers sorted by name
    customers = await customers_col(db).find(query).sort("name", 1).limit(limit).to_list(length=limit)

    # Convert to OrderUserOut format
    results = []
    for customer in customers:
        # Extract address from addresses array or use address field
        address = ""
        addresses = []
        if customer.get("addresses") and len(customer.get("addresses", [])) > 0:
            addresses = customer["addresses"]
            address = addresses[0]  # Use first address as primary
        elif customer.get("address"):
            address = customer["address"]
            addresses = [customer["address"]]

        results.append(OrderUserOut(
            fb_uid=customer.get("fb_uid"),
            fb_username=customer.get("fb_username"),
            name=customer.get("name"),
            fb_url=customer.get("fb_url"),
            address=address,
            phone_number=customer.get("phone_number"),
            avatar_url=customer.get("avatar_url"),
            addresses=addresses  # Include all addresses
        ))

    return results


@router.patch("/{uid}/update/", response_model=UserFull)
async def update_customer(
    uid: str,
    data: UpdateCustomerRequest,
    current_user: dict = Depends(require_user_or_admin()),
    db=Depends(get_db)
):
    """Update customer information including addresses and phone number"""
    # Validate that the customer exists
    customer = await customers_col(db).find_one({"fb_uid": uid})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Prepare update data
    update_data = {}

    if data.name is not None:
        update_data["name"] = data.name
    if data.phone_number is not None:
        update_data["phone_number"] = data.phone_number
    if data.addresses is not None:
        update_data["addresses"] = data.addresses
    if data.address is not None:
        # If updating single address, add it to addresses array if not already present
        new_address = data.address
        current_addresses = customer.get("addresses", [])
        if new_address not in current_addresses:
            current_addresses.append(new_address)
            update_data["addresses"] = current_addresses
        update_data["address"] = new_address

    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    # Update the customer
    result = await customers_col(db).update_one(
        {"fb_uid": uid},
        {"$set": update_data}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="No changes made")

    # Return updated customer
    updated_customer = await customers_col(db).find_one({"fb_uid": uid})
    if not updated_customer:
        raise HTTPException(status_code=404, detail="Customer not found after update")

    # Convert to UserFull format
    return UserFull(
        id=str_object_id(updated_customer.get("_id")),
        fb_uid=updated_customer.get("fb_uid"),
        fb_username=updated_customer.get("fb_username"),
        name=updated_customer.get("name"),
        fb_url=updated_customer.get("fb_url"),
        addresses=updated_customer.get("addresses", []),
        phone_number=updated_customer.get("phone_number"),
        avatar_url=updated_customer.get("avatar_url"),
        notes=updated_customer.get("note"),
        is_active=updated_customer.get("is_active", True),
        created_date=format_created_date(updated_customer.get("created_date")) if updated_customer.get("created_date") else None
    )
