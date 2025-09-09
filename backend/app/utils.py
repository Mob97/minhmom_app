from __future__ import annotations
from typing import Any, Dict, List, Optional
import uuid
from datetime import datetime, timezone


def str_object_id(oid) -> str:
    try:
        return str(oid)
    except Exception:
        return oid


def make_order_id(comment_id: str | None) -> str:
    # Prefer comment_id; fallback to UUID
    return comment_id or uuid.uuid4().hex


def to_local_time(dt: datetime | str | None) -> str | None:
    """
    Convert UTC datetime to local time and return as ISO string.

    Args:
        dt: datetime object, ISO string, or None

    Returns:
        ISO string in local timezone or None if input is None
    """
    if dt is None:
        return None

    # Handle string input
    if isinstance(dt, str):
        try:
            # Parse ISO string, handling both with and without timezone info
            if dt.endswith('Z'):
                dt = dt.replace('Z', '+00:00')
            dt = datetime.fromisoformat(dt)
        except (ValueError, TypeError):
            return str(dt)  # Return as-is if parsing fails

    # Handle datetime input
    if isinstance(dt, datetime):
        # If datetime is naive (no timezone), assume it's UTC
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)

        # Convert to local time
        local_dt = dt.astimezone()
        return local_dt.isoformat()

    return str(dt)


# ---------- pricing (same logic you already use) ----------


def _tokenize(s: str) -> List[str]:
    """Tokenize a string for matching (similar to process_updated_post_comments.py)"""
    import re
    s = s.lower()
    s = re.sub(r"[^a-z0-9áàảãạăắằẳẵặâấầẩẫậđéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữự\s-]", " ", s)
    return [t for t in s.split() if t]


def pick_item_for_comment(items: List[Dict[str, Any]], comment_type: Optional[str]) -> Optional[Dict[str, Any]]:
    """Pick the best item based on type matching (similar to process_updated_post_comments.py)"""
    if not items:
        return None
    if len(items) == 1:
        return items[0]
    if not comment_type:
        return items[0]

    ctoks = set(_tokenize(comment_type))
    best = None
    best_score = -1
    for it in items:
        it_type = (it.get("type") or "") if isinstance(it, dict) else ""
        it_toks = set(_tokenize(it_type))
        score = len(ctoks & it_toks)
        if score > best_score:
            best_score = score
            best = it
    return best or items[0]


def compute_min_cost(prices: List[Dict[str, Any]], qty: int) -> Dict[str, Any]:
    if not prices or qty <= 0:
        return {"total": 0, "packs": [], "method": "fallback-none"}

    packs = []
    for p in prices:
        if not isinstance(p, dict):
            continue
        q = int(p.get("qty", 0))
        c = int(p.get("bundle_price", 0))
        if q > 0 and c >= 0:
            packs.append((q, c))
    if not packs:
        return {"total": 0, "packs": [], "method": "fallback-none"}

    INF = 10**18
    dp = [INF] * (qty + 1)
    choice = [-1] * (qty + 1)
    dp[0] = 0
    for q in range(1, qty + 1):
        for i, (pq, pc) in enumerate(packs):
            if pq <= q and dp[q - pq] + pc < dp[q]:
                dp[q] = dp[q - pq] + pc
                choice[q] = i

    if dp[qty] < INF:
        q = qty
        counts: Dict[int, int] = {}
        while q > 0 and choice[q] != -1:
            i = choice[q]
            counts[i] = counts.get(i, 0) + 1
            q -= packs[i][0]
        out_packs, total = [], 0
        for i, cnt in counts.items():
            pq, pc = packs[i]
            subtotal = cnt * pc
            total += subtotal
            out_packs.append({"qty": pq, "count": cnt, "bundle_price": pc, "subtotal": subtotal})
        out_packs.sort(key=lambda x: x["qty"])
        return {"total": int(total), "packs": out_packs, "method": "dp"}

    # fallback ceil with the best unit price
    best_i = min(range(len(packs)), key=lambda i: packs[i][1] / packs[i][0])
    pq, pc = packs[best_i]
    cnt = (qty + pq - 1) // pq
    subtotal = cnt * pc
    return {
        "total": int(subtotal),
        "packs": [{"qty": pq, "count": cnt, "bundle_price": pc, "subtotal": subtotal}],
        "method": "greedy-ceil",
    }
