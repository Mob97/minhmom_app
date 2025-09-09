from fastapi import APIRouter, Depends, Path
from datetime import datetime, timezone
from ..auth import require_admin
from ..db import get_db, posts_col
from ..utils import to_local_time

router = APIRouter()


@router.get("/groups/{group_id}")
async def get_dashboard_data(
    group_id: str = Path(..., description="Group ID"),
    current_user: dict = Depends(require_admin())
):
    """
    Get dashboard data including revenue calculations and order statistics.
    Only accessible by admin users.
    """
    db = get_db()
    current_year = datetime.now().year
    current_month = datetime.now().month

    # Get all posts from the group to access orders and import prices
    posts_collection = posts_col(db, group_id)

    # Get all posts from the current year
    start_of_year = datetime(current_year, 1, 1, tzinfo=timezone.utc)
    end_of_year = datetime(current_year, 12, 31, 23, 59, 59, tzinfo=timezone.utc)

    # Query all posts with orders (some may not have orders_last_update_at field)
    posts_cursor = posts_collection.find({
        "$or": [
            {
                "orders_last_update_at": {
                    "$gte": start_of_year.isoformat(),
                    "$lte": end_of_year.isoformat()
                }
            },
            {
                "orders": {"$exists": True, "$ne": []}
            }
        ]
    })
    posts = await posts_cursor.to_list(length=None)

    # Extract all orders from posts
    all_orders = []
    post_import_prices = {}

    for post in posts:
        post_import_prices[post["_id"]] = post.get("import_price", 0)
        orders = post.get("orders", [])
        for order in orders:
            # Add post_id to each order for reference
            order["post_id"] = post["_id"]
            all_orders.append(order)

    # Calculate revenue and statistics
    total_revenue = 0
    monthly_revenue = 0
    monthly_revenue_data = []

    # Initialize monthly revenue data
    for month in range(1, 13):
        monthly_revenue_data.append({"month": month, "revenue": 0})

    # Order status counters
    status_counts = {
        "NEW": 0,
        "ORDERED": 0,
        "RECEIVED": 0,
        "DELIVERING": 0,
        "DONE": 0,
        "CANCELLED": 0
    }

    total_orders = 0
    monthly_orders = 0

    for order in all_orders:
        # Parse order date from parsed_at field
        order_date_str = order.get("parsed_at")
        if not order_date_str:
            continue

        try:
            # Handle both datetime objects and ISO strings
            if isinstance(order_date_str, datetime):
                order_date = order_date_str
            else:
                order_date = datetime.fromisoformat(order_date_str.replace('Z', '+00:00'))
        except (ValueError, TypeError):
            continue

        # Filter orders by current year
        if order_date.year != current_year:
            continue

        # Count this order towards total
        total_orders += 1

        order_month = order_date.month

        # Count monthly orders
        if order_month == current_month:
            monthly_orders += 1

        # Calculate revenue (order total - import price) - exclude CANCELLED orders
        status = order.get("status_code", "NEW")

        # Only calculate revenue for non-CANCELLED orders
        if status != "CANCELLED":
            order_total = 0
            if order.get("price_calc") and order["price_calc"].get("total"):
                order_total = order["price_calc"]["total"]

            post_id = order.get("post_id")
            import_price = post_import_prices.get(post_id, 0) if post_id else 0

            # Revenue = order total - import price (only if order total > import price)
            if order_total > import_price:
                revenue = order_total - import_price
                total_revenue += revenue

                # Add to monthly revenue
                monthly_revenue_data[order_month - 1]["revenue"] += revenue

                # Add to current month revenue
                if order_month == current_month:
                    monthly_revenue += revenue

        # Count orders by status
        status = order.get("status_code", "NEW")
        if status in status_counts:
            status_counts[status] += 1

    # Calculate pending orders (not DONE or CANCELLED)
    pending_orders = total_orders - status_counts["DONE"] - status_counts["CANCELLED"]

    return {
        "totalRevenue": total_revenue,
        "monthlyRevenue": monthly_revenue,
        "totalOrders": total_orders,
        "monthlyOrders": monthly_orders,
        "monthlyRevenueData": monthly_revenue_data,
        "pendingOrders": pending_orders,
        "cancelledOrders": status_counts["CANCELLED"],
        "newOrders": status_counts["NEW"],
        "orderedOrders": status_counts["ORDERED"],
        "receivedOrders": status_counts["RECEIVED"],
        "deliveringOrders": status_counts["DELIVERING"],
        "doneOrders": status_counts["DONE"]
    }