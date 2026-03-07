from fastapi import APIRouter, Depends, Path
from datetime import datetime, timezone
from ..auth import require_admin
from ..db import get_db, posts_col

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

    # Extract all orders from posts; keep post_by_id to resolve item.import_price per order
    all_orders = []
    post_by_id = {post["_id"]: post for post in posts}

    for post in posts:
        orders = post.get("orders", [])
        for order in orders:
            order["post_id"] = post["_id"]
            all_orders.append(order)

    # Calculate revenue, income and statistics
    total_revenue = 0
    monthly_revenue = 0
    total_income = 0
    monthly_income = 0
    monthly_revenue_data = []
    monthly_income_data = []

    # Initialize monthly revenue and income data
    for month in range(1, 13):
        monthly_revenue_data.append({"month": month, "revenue": 0})
        monthly_income_data.append({"month": month, "income": 0})

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

        # Only calculate revenue and income for non-CANCELLED orders
        if status != "CANCELLED":
            order_total = 0
            if order.get("item") and order["item"].get("total_price"):
                order_total = order["item"]["total_price"]
            elif order.get("price_calc") and order["price_calc"].get("total"):
                order_total = order["price_calc"]["total"]

            # Import cost from item.import_price (per unit) * order qty
            post_id = order.get("post_id")
            post = post_by_id.get(post_id) if post_id else None
            items = post.get("items", []) if post else []
            item_id = order.get("item", {}).get("item_id") if order.get("item") else None
            qty = (order.get("item") or {}).get("qty") or order.get("qty") or 0
            if item_id is not None and 0 <= item_id < len(items):
                unit_import = items[item_id].get("import_price") or 0
            else:
                unit_import = 0
            import_cost = unit_import * (qty if qty else 0)

            if order_total > 0:
                total_income += order_total
                monthly_income_data[order_month - 1]["income"] += order_total
                if order_month == current_month:
                    monthly_income += order_total

                revenue = order_total - import_cost
                if revenue > 0:
                    total_revenue += revenue
                    monthly_revenue_data[order_month - 1]["revenue"] += revenue
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
        "totalIncome": total_income,
        "monthlyIncome": monthly_income,
        "totalOrders": total_orders,
        "monthlyOrders": monthly_orders,
        "monthlyRevenueData": monthly_revenue_data,
        "monthlyIncomeData": monthly_income_data,
        "pendingOrders": pending_orders,
        "cancelledOrders": status_counts["CANCELLED"],
        "newOrders": status_counts["NEW"],
        "orderedOrders": status_counts["ORDERED"],
        "receivedOrders": status_counts["RECEIVED"],
        "deliveringOrders": status_counts["DELIVERING"],
        "doneOrders": status_counts["DONE"]
    }