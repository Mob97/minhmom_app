from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from datetime import datetime, timezone
from ..db import get_db, posts_col, statuses_col
from ..schemas import PostPatch, PostOut, OrderIn, OrderOut, OrderStatusPatch, PaginatedResponse
from ..auth import require_user_or_admin
from ..utils import to_local_time, pick_item_for_comment, compute_min_cost
import hashlib
import os
import math

router = APIRouter(prefix="/groups/{group_id}/posts", tags=["Posts & Orders"])


def construct_image_urls(local_images: List[dict]) -> List[str]:
    """
    Construct image URLs from local_images metadata by joining base_path with local_path.

    Args:
        local_images: List of image metadata dictionaries from database

    Returns:
        List of image URLs that can be used by the frontend
    """
    if not local_images:
        return []

    image_urls = []
    for img_data in local_images:
        if isinstance(img_data, dict) and 'local_path' in img_data:
            # local_path already contains the relative path from the base directory
            local_path = img_data['local_path']
            # Convert to URL by replacing backslashes with forward slashes and adding /static/images prefix
            image_url = f"/static/images/{local_path.replace(os.sep, '/')}"
            image_urls.append(image_url)
        elif isinstance(img_data, str):
            # Handle case where local_images contains just strings
            image_url = f"/static/images/{img_data.replace(os.sep, '/')}"
            image_urls.append(image_url)

    return image_urls


def filter_import_price_for_user(post_data: dict, user_role: str) -> dict:
    """
    Filter import_price field based on user role.
    Only admin users can see import_price.
    """
    if user_role != "admin":
        # Remove import_price for non-admin users
        if "import_price" in post_data:
            del post_data["import_price"]
    return post_data


# ---------- Posts ----------


@router.get("/", response_model=PaginatedResponse)
async def list_posts(
    group_id: str,
    q: str | None = Query(None),
    page: int = 1,
    page_size: int = 20,
    sort_by: str | None = Query(None, description="Field to sort by (e.g., 'created_time', 'updated_time', 'orders_last_update_at')"),
    sort_direction: str = Query("desc", description="Sort direction: 'asc' or 'desc'"),
    current_user: dict = Depends(require_user_or_admin()),
    db=Depends(get_db)
):
    col = posts_col(db, group_id)
    query = {}
    if q:
        query = {"$or": [{"_id": q}, {"description": {"$regex": q, "$options": "i"}}]}

    # Get total count
    total = await col.count_documents(query)

    # Calculate pagination
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    skip = (page - 1) * page_size

    # Build sort criteria
    sort_criteria = []
    if sort_by:
        # Map frontend field names to database field names
        field_mapping = {
            "created_time": "_id",  # Use _id as created_time proxy
            "updated_time": "orders_last_update_at",
            "orders_last_update_at": "orders_last_update_at"
        }
        db_field = field_mapping.get(sort_by, sort_by)
        sort_direction_int = 1 if sort_direction == "asc" else -1
        sort_criteria.append((db_field, sort_direction_int))
    else:
        # Default sort by orders_last_update_at descending
        sort_criteria.append(("orders_last_update_at", -1))

    # Get paginated results with sorting
    cur = col.find(query).sort(sort_criteria).skip(skip).limit(page_size)
    docs = await cur.to_list(length=page_size)

    out: List[PostOut] = []
    user_role = current_user.get("role", "user")

    for d in docs:
        # Filter import_price based on user role
        filtered_d = filter_import_price_for_user(d.copy(), user_role)

        # Convert orders_last_update_at to local time string
        orders_last_update_at = to_local_time(filtered_d.get("orders_last_update_at"))

        # Convert created_time and updated_time to local time strings
        created_time = to_local_time(filtered_d.get("created_time"))
        if not created_time and filtered_d.get("_id"):
            # Use _id as created_time proxy if created_time doesn't exist
            created_time = str(filtered_d.get("_id"))

        updated_time = to_local_time(filtered_d.get("updated_time"))
        if not updated_time:
            # Use orders_last_update_at as updated_time if updated_time doesn't exist
            updated_time = orders_last_update_at

        # Construct image URLs from local_images metadata
        local_images_data = filtered_d.get("local_images") or []
        image_urls = construct_image_urls(local_images_data)

        out.append(PostOut(
            id=str(filtered_d.get("_id")),
            description=filtered_d.get("description"),
            items=filtered_d.get("items") or [],
            tags=filtered_d.get("tags") or [],
            import_price=filtered_d.get("import_price"),
            orders_last_update_at=orders_last_update_at,
            local_images=image_urls,  # Now contains constructed URLs instead of raw metadata
            created_time=created_time,
            updated_time=updated_time,
        ))

    return PaginatedResponse(
        data=[post.model_dump() for post in out],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/all-orders", response_model=PaginatedResponse)
async def list_all_orders(
    group_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str | None = Query(None, description="Field to sort by (e.g., 'parsed_at', 'status_code', 'qty')"),
    sort_direction: str = Query("desc", description="Sort direction: 'asc' or 'desc'"),
    current_user: dict = Depends(require_user_or_admin()),
    db=Depends(get_db)
):
    """
    Get all orders across all posts in the group with pagination.
    """
    col = posts_col(db, group_id)

    # Use aggregation to get all orders with pagination
    pipeline = [
        {"$unwind": "$orders"},
        {
            "$project": {
                "order": "$orders",
                "post_id": {"$toString": "$_id"},
                "post_description": "$description"
            }
        },
        {
            "$replaceRoot": {
                "newRoot": {
                    "$mergeObjects": [
                        "$order",
                        {
                            "post_id": "$post_id",
                            "post_description": "$post_description"
                        }
                    ]
                }
            }
        },
        {
            "$addFields": {
                "parsed_at": {
                    "$cond": {
                        "if": {"$eq": [{"$type": "$parsed_at"}, "date"]},
                        "then": {"$dateToString": {"date": "$parsed_at"}},
                        "else": "$parsed_at"
                    }
                },
                "comment_created_time": {
                    "$cond": {
                        "if": {"$eq": [{"$type": "$comment_created_time"}, "date"]},
                        "then": {"$dateToString": {"date": "$comment_created_time"}},
                        "else": "$comment_created_time"
                    }
                }
            }
        }
    ]

    # Get total count
    count_pipeline = pipeline + [{"$count": "total"}]
    count_result = await col.aggregate(count_pipeline).to_list(1)
    total = count_result[0]["total"] if count_result else 0

    # Calculate pagination
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    skip = (page - 1) * page_size

    # Add sorting to pipeline
    if sort_by:
        sort_direction_int = 1 if sort_direction == "asc" else -1
        sort_stage = {"$sort": {sort_by: sort_direction_int}}
        pipeline.append(sort_stage)
    else:
        # Default sort by parsed_at descending
        pipeline.append({"$sort": {"parsed_at": -1}})

    # Add pagination to pipeline
    paginated_pipeline = pipeline + [
        {"$skip": skip},
        {"$limit": page_size}
    ]

    # Execute aggregation
    orders_cursor = col.aggregate(paginated_pipeline)
    orders = await orders_cursor.to_list(length=page_size)

    return PaginatedResponse(
        data=orders,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{post_id}", response_model=PostOut)
async def get_post(
    group_id: str,
    post_id: str,
    current_user: dict = Depends(require_user_or_admin()),
    db=Depends(get_db)
):
    d = await posts_col(db, group_id).find_one({"_id": post_id})
    if not d:
        raise HTTPException(404, "Post not found")

    # Filter import_price based on user role
    user_role = current_user.get("role", "user")
    filtered_d = filter_import_price_for_user(d.copy(), user_role)

    # Convert orders_last_update_at to local time string
    orders_last_update_at = to_local_time(filtered_d.get("orders_last_update_at"))

    # Construct image URLs from local_images metadata
    local_images_data = filtered_d.get("local_images") or []
    image_urls = construct_image_urls(local_images_data)

    return PostOut(
        id=str(filtered_d.get("_id")),
        description=filtered_d.get("description"),
        items=filtered_d.get("items") or [],
        tags=filtered_d.get("tags") or [],
        import_price=filtered_d.get("import_price"),
        orders_last_update_at=orders_last_update_at,
        local_images=image_urls,  # Now contains constructed URLs instead of raw metadata
    )


@router.patch("/{post_id}", response_model=PostOut)
async def patch_post(
    group_id: str,
    post_id: str,
    body: PostPatch,
    current_user: dict = Depends(require_user_or_admin()),
    db=Depends(get_db)
):
    update = {k: v for k, v in body.model_dump(exclude_unset=True).items()}

    # Check if user is trying to modify import_price without admin privileges
    if "import_price" in update and current_user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admin users can modify import_price"
        )

    if not update:
        raise HTTPException(400, "No fields to update")

    await posts_col(db, group_id).update_one({"_id": post_id}, {"$set": update})
    d = await posts_col(db, group_id).find_one({"_id": post_id})
    if not d:
        raise HTTPException(404, "Post not found after update")

    # Filter import_price based on user role
    user_role = current_user.get("role", "user")
    filtered_d = filter_import_price_for_user(d.copy(), user_role)

    # Convert orders_last_update_at to local time string
    orders_last_update_at = to_local_time(filtered_d.get("orders_last_update_at"))

    # Construct image URLs from local_images metadata
    local_images_data = filtered_d.get("local_images") or []
    image_urls = construct_image_urls(local_images_data)

    return PostOut(
        id=str(filtered_d.get("_id")),
        description=filtered_d.get("description"),
        items=filtered_d.get("items") or [],
        tags=filtered_d.get("tags") or [],
        import_price=filtered_d.get("import_price"),
        orders_last_update_at=orders_last_update_at,
        local_images=image_urls,  # Now contains constructed URLs instead of raw metadata
    )


# ---------- Orders inside a post ----------


@router.get("/{post_id}/orders", response_model=List[OrderOut])
async def list_orders(
    group_id: str,
    post_id: str,
    current_user: dict = Depends(require_user_or_admin()),
    db=Depends(get_db)
):
    d = await posts_col(db, group_id).find_one({"_id": post_id}, {"orders": 1})
    if not d:
        raise HTTPException(404, "Post not found")
    orders = d.get("orders") or []
    out = []
    for o in orders:
        # Convert parsed_at to local time string
        o["parsed_at"] = to_local_time(o.get("parsed_at"))
        # Convert comment_created_time to local time string
        o["comment_created_time"] = to_local_time(o.get("comment_created_time"))
        out.append(OrderOut(**o))
    return out


@router.post("/{post_id}/orders", response_model=OrderOut)
async def create_order(
    group_id: str,
    post_id: str,
    body: OrderIn,
    current_user: dict = Depends(require_user_or_admin()),
    db=Depends(get_db)
):
    # 1) Validate status_code
    st = await statuses_col(db).find_one({"status_code": body.status_code})
    if not st:
        raise HTTPException(400, f"Unknown status_code: {body.status_code}")

    # 2) Ensure the post exists
    post = await posts_col(db, group_id).find_one({"_id": post_id})
    if not post:
        raise HTTPException(404, "Post not found")

    # 3) Prevent duplicate by comment_id
    if body.comment_id:
        dup = await posts_col(db, group_id).find_one(
            {"_id": post_id, "orders.comment_id": body.comment_id}, {"_id": 1}
        )
        if dup:
            raise HTTPException(409, "Order with this comment_id already exists")

    # 4) Get post items for price calculation
    items = post.get("items") or []
    if not items:
        raise HTTPException(400, "Post has no items for price calculation")

    # 5) Pick the best item based on type
    chosen_item = pick_item_for_comment(items, body.type)
    if not chosen_item:
        raise HTTPException(400, "No suitable item found for the given type")

    # 6) Calculate price
    price_info = compute_min_cost(chosen_item.get("prices") or [], int(body.qty))

    # 7) Build order_id using SHA-1 hash with datetime for uniqueness
    user_uid = body.url.split("/")[-1] if body.url else ""
    now_timestamp = datetime.now(timezone.utc).timestamp()
    order_id = hashlib.sha1(
        f"{post_id}:{body.comment_id}:{user_uid}:{now_timestamp}".encode("utf-8")
    ).hexdigest()

    now = datetime.now(timezone.utc).isoformat()

    # 8) Extract user address for the order
    user_address = ""
    if body.user and body.user.address:
        user_address = body.user.address

    order_doc = {
        "order_id": order_id,
        "comment_id": body.comment_id,
        "comment_url": body.comment_url,
        "comment_text": body.comment_text,
        "comment_created_time": body.comment_created_time,
        "url": body.url,
        "raw_url": body.url,  # Keep original URL for traceability
        "qty": body.qty,
        "type": body.type,
        "currency": body.currency,
        "matched_item": {
            "name": chosen_item.get("name"),
            "type": chosen_item.get("type"),
        },
        "price_calc": price_info,
        "status_code": body.status_code,
        "status_history": [{
            "status_code": body.status_code,
            "note": "created",
            "at": now,
        }],
        "parsed_at": now,
        "source": "manual",  # Mark as manually created
        "note": body.note,
        "user": body.user.model_dump() if body.user else None,
        "address": user_address,  # Single address for shipping
    }

    await posts_col(db, group_id).update_one(
        {"_id": post_id},
        {
            "$push": {"orders": order_doc},
            "$set": {"orders_last_update_at": now},
        },
    )
    return order_doc


@router.patch("/{post_id}/orders/{order_id}/status", response_model=OrderOut)
async def update_order_status(
    group_id: str,
    post_id: str,
    order_id: str,
    body: OrderStatusPatch,
    current_user: dict = Depends(require_user_or_admin()),
    db=Depends(get_db)
):
    # Validate target status
    st = await statuses_col(db).find_one({"status_code": body.new_status_code})
    if not st:
        raise HTTPException(400, f"Unknown status_code: {body.new_status_code}")

    now = datetime.now(timezone.utc).isoformat()
    res = await posts_col(db, group_id).update_one(
        {"_id": post_id, "orders.order_id": order_id},
        {
            "$set": {"orders.$[o].status_code": body.new_status_code},
            "$push": {"orders.$[o].status_history": {
                "status_code": body.new_status_code,
                "note": body.note,
                "actor": body.actor,
                "at": now,
            }},
            "$setOnInsert": {},
        },
        array_filters=[{"o.order_id": order_id}],
        upsert=False,
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Order not found")

    d = await posts_col(db, group_id).find_one({"_id": post_id}, {"orders": 1})
    for o in d.get("orders") or []:
        if o.get("order_id") == order_id:
            # Convert parsed_at to local time string
            o["parsed_at"] = to_local_time(o.get("parsed_at"))
            # Convert comment_created_time to local time string
            o["comment_created_time"] = to_local_time(o.get("comment_created_time"))
            return OrderOut(**o)
    raise HTTPException(404, "Order not found after update")


@router.patch("/{post_id}/orders/{order_id}", response_model=OrderOut)
async def update_order(
    group_id: str,
    post_id: str,
    order_id: str,
    body: OrderIn,
    current_user: dict = Depends(require_user_or_admin()),
    db=Depends(get_db)
):
    # Validate status_code if provided
    if body.status_code:
        st = await statuses_col(db).find_one({"status_code": body.status_code})
        if not st:
            raise HTTPException(400, f"Unknown status_code: {body.status_code}")

    # Ensure the post exists
    post = await posts_col(db, group_id).find_one({"_id": post_id})
    if not post:
        raise HTTPException(404, "Post not found")

    # Check if order exists
    existing_order = None
    for order in post.get("orders", []):
        if order.get("order_id") == order_id:
            existing_order = order
            break

    if not existing_order:
        raise HTTPException(404, "Order not found")

    now = datetime.now(timezone.utc).isoformat()

    # Get post items for price recalculation if needed
    items = post.get("items") or []

    # Build update data
    update_data = {}
    if body.comment_id is not None:
        update_data["orders.$[o].comment_id"] = body.comment_id
    if body.comment_url is not None:
        update_data["orders.$[o].comment_url"] = body.comment_url
    if body.comment_text is not None:
        update_data["orders.$[o].comment_text"] = body.comment_text
    if body.comment_created_time is not None:
        update_data["orders.$[o].comment_created_time"] = body.comment_created_time
    if body.url is not None:
        update_data["orders.$[o].url"] = body.url
        update_data["orders.$[o].raw_url"] = body.url  # Update raw_url too
    if body.qty is not None:
        update_data["orders.$[o].qty"] = body.qty
    if body.type is not None:
        update_data["orders.$[o].type"] = body.type
    if body.currency is not None:
        update_data["orders.$[o].currency"] = body.currency
    if body.matched_item is not None:
        update_data["orders.$[o].matched_item"] = body.matched_item.model_dump()
    if body.price_calc is not None:
        update_data["orders.$[o].price_calc"] = body.price_calc.model_dump()
    if body.status_code is not None:
        update_data["orders.$[o].status_code"] = body.status_code
        # Add status history entry
        update_data["$push"] = {
            "orders.$[o].status_history": {
                "status_code": body.status_code,
                "note": "updated",
                "at": now,
            }
        }
    if body.note is not None:
        update_data["orders.$[o].note"] = body.note
    if body.user is not None:
        update_data["orders.$[o].user"] = body.user.model_dump()
        # Update address field when user is updated
        user_address = ""
        if body.user.address:
            user_address = body.user.address
        update_data["orders.$[o].address"] = user_address

    # Recalculate price if qty or type changed
    if (body.qty is not None or body.type is not None) and items:
        # Get current order to determine what to recalculate
        current_qty = existing_order.get("qty", body.qty or 1)
        current_type = existing_order.get("type", body.type)

        # Use updated values
        new_qty = body.qty if body.qty is not None else current_qty
        new_type = body.type if body.type is not None else current_type

        # Pick item and calculate price
        chosen_item = pick_item_for_comment(items, new_type)
        if chosen_item:
            price_info = compute_min_cost(chosen_item.get("prices") or [], int(new_qty))
            update_data["orders.$[o].matched_item"] = {
                "name": chosen_item.get("name"),
                "type": chosen_item.get("type"),
            }
            update_data["orders.$[o].price_calc"] = price_info

    # Update the order
    res = await posts_col(db, group_id).update_one(
        {"_id": post_id, "orders.order_id": order_id},
        {
            "$set": update_data,
            "$setOnInsert": {},
        },
        array_filters=[{"o.order_id": order_id}],
        upsert=False,
    )

    if res.matched_count == 0:
        raise HTTPException(404, "Order not found")

    # Return the updated order
    d = await posts_col(db, group_id).find_one({"_id": post_id}, {"orders": 1})
    for o in d.get("orders") or []:
        if o.get("order_id") == order_id:
            # Convert parsed_at to local time string
            o["parsed_at"] = to_local_time(o.get("parsed_at"))
            # Convert comment_created_time to local time string
            o["comment_created_time"] = to_local_time(o.get("comment_created_time"))
            return OrderOut(**o)
    raise HTTPException(404, "Order not found after update")


@router.get("/orders/by-user/{uid}", response_model=List[OrderOut])
async def get_orders_by_user(
    group_id: str,
    uid: str,
    current_user: dict = Depends(require_user_or_admin()),
    db=Depends(get_db)
):
    """
    Get all orders for a specific user across all posts in the group.
    Searches for orders where the URL ends with the given UID.
    """
    # Find all posts in the group that have orders with the matching user UID
    posts = posts_col(db, group_id).find(
        {"orders.url": {"$regex": f"/{uid}$"}},
        {"orders": 1, "_id": 1, "description": 1}
    )

    all_orders = []
    async for post in posts:
        orders = post.get("orders", [])
        for order in orders:
            # Check if this order belongs to the user
            order_url = order.get("url", "")
            if order_url.endswith(f"/{uid}"):
                # Convert parsed_at to local time string
                order["parsed_at"] = to_local_time(order.get("parsed_at"))
                # Convert comment_created_time to local time string
                order["comment_created_time"] = to_local_time(order.get("comment_created_time"))

                all_orders.append(OrderOut(**order))

    return all_orders


@router.delete("/{post_id}/orders/{order_id}")
async def delete_order(
    group_id: str,
    post_id: str,
    order_id: str,
    current_user: dict = Depends(require_user_or_admin()),
    db=Depends(get_db)
):
    """
    Delete an order from a post.
    """
    # Check if the post exists
    post = await posts_col(db, group_id).find_one({"_id": post_id})
    if not post:
        raise HTTPException(404, "Post not found")

    # Check if the order exists
    order_exists = False
    for order in post.get("orders", []):
        if order.get("order_id") == order_id:
            order_exists = True
            break

    if not order_exists:
        raise HTTPException(404, "Order not found")

    # Remove the order from the post
    result = await posts_col(db, group_id).update_one(
        {"_id": post_id},
        {"$pull": {"orders": {"order_id": order_id}}}
    )

    if result.modified_count == 0:
        raise HTTPException(404, "Order not found or could not be deleted")

    return {"message": "Order deleted successfully"}
