from fastapi.testclient import TestClient
from app.main import app


def test_statuses_crud():
    client = TestClient(app)
    resp = client.post("/statuses/", json={
        "status_code": "NEW",
        "display_name": "New",
        "description": "New order",
        "is_active": True
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status_code"] == "NEW"

    # List statuses
    resp = client.get("/statuses/")
    assert resp.status_code == 200
    assert any(s["status_code"] == "NEW" for s in resp.json())


def test_users_crud():
    client = TestClient(app)
    # Create user
    resp = client.post("/users/", json={
        "uid": "u1",
        "username": "testuser",
        "name": "Test User",
        "url": "http://example.com/u1"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["uid"] == "u1"

    # List users
    resp = client.get("/users/")
    assert resp.status_code == 200
    assert any(u["uid"] == "u1" for u in resp.json())


def test_posts_and_orders_flow():
    client = TestClient(app)
    group_id = "g1"
    # Create post
    resp = client.post(f"/groups/{group_id}/posts/", json={
        "description": "Test post",
        "items": [],
        "tags": []
    })
    assert resp.status_code == 200
    post = resp.json()
    post_id = post["id"]

    # List posts
    resp = client.get(f"/groups/{group_id}/posts/")
    assert resp.status_code == 200
    assert any(p["id"] == post_id for p in resp.json())

    # Create order
    resp = client.post(f"/groups/{group_id}/posts/{post_id}/orders", json={
        "url": "http://example.com/u1",
        "qty": 1,
        "type": "test",
        "currency": "VND",
        "status_code": "NEW"
    })
    assert resp.status_code == 200
    order = resp.json()
    assert order["order_id"]

    # List orders
    resp = client.get(f"/groups/{group_id}/posts/{post_id}/orders")
    assert resp.status_code == 200
    assert any(o["order_id"] == order["order_id"] for o in resp.json())


def test_get_orders_by_user():
    client = TestClient(app)
    group_id = "g1"

    # Create post
    resp = client.post(f"/groups/{group_id}/posts/", json={
        "description": "Test post for user orders",
        "items": [],
        "tags": []
    })
    assert resp.status_code == 200
    post = resp.json()
    post_id = post["id"]

    # Create order for user u1
    resp = client.post(f"/groups/{group_id}/posts/{post_id}/orders", json={
        "url": "http://example.com/u1",
        "qty": 2,
        "type": "test",
        "currency": "VND",
        "status_code": "NEW"
    })
    assert resp.status_code == 200
    order1 = resp.json()

    # Create another order for user u2
    resp = client.post(f"/groups/{group_id}/posts/{post_id}/orders", json={
        "url": "http://example.com/u2",
        "qty": 1,
        "type": "test2",
        "currency": "VND",
        "status_code": "NEW"
    })
    assert resp.status_code == 200
    order2 = resp.json()

    # Test getting orders by user u1
    resp = client.get(f"/groups/{group_id}/posts/orders/by-user/u1")
    assert resp.status_code == 200
    user_orders = resp.json()
    assert len(user_orders) == 1
    assert user_orders[0]["order_id"] == order1["order_id"]
    assert user_orders[0]["url"] == "http://example.com/u1"

    # Test getting orders by user u2
    resp = client.get(f"/groups/{group_id}/posts/orders/by-user/u2")
    assert resp.status_code == 200
    user_orders = resp.json()
    assert len(user_orders) == 1
    assert user_orders[0]["order_id"] == order2["order_id"]
    assert user_orders[0]["url"] == "http://example.com/u2"

    # Test getting orders for non-existent user
    resp = client.get(f"/groups/{group_id}/posts/orders/by-user/nonexistent")
    assert resp.status_code == 200
    user_orders = resp.json()
    assert len(user_orders) == 0