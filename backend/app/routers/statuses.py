from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List
from ..db import get_db, statuses_col
from ..schemas import StatusIn, StatusOut
from ..utils import str_object_id
from ..auth import require_user_or_admin, require_admin


router = APIRouter(prefix="/statuses", tags=["Statuses"])


@router.get("/", response_model=List[StatusOut])
async def list_statuses(
    active: bool | None = Query(None),
    sort_by: str | None = Query(None, description="Field to sort by (e.g., 'display_name', 'status_code', 'view_order')"),
    sort_direction: str = Query("asc", description="Sort direction: 'asc' or 'desc'"),
    current_user: dict = Depends(require_user_or_admin()),
    db=Depends(get_db)
):
    q = {}
    if active is not None:
        q["is_active"] = active

    # Build sort criteria
    if sort_by:
        sort_direction_int = 1 if sort_direction == "asc" else -1
        cur = statuses_col(db).find(q).sort(sort_by, sort_direction_int)
    else:
        # Default sort by view_order ascending
        cur = statuses_col(db).find(q).sort("view_order", 1)

    docs = await cur.to_list(length=1000)
    return [
        StatusOut(
            id=str_object_id(d.get("_id")),
            status_code=d["status_code"],
            display_name=d.get("display_name", ""),
            description=d.get("description"),
            is_active=d.get("is_active", True),
            view_order=d.get("view_order"),
        ) for d in docs
    ]


@router.get("/{status_code}", response_model=StatusOut)
async def get_status(
    status_code: str,
    current_user: dict = Depends(require_user_or_admin()),
    db=Depends(get_db)
):
    d = await statuses_col(db).find_one({"status_code": status_code})
    if not d:
        raise HTTPException(404, "Status not found")
    return StatusOut(
        id=str_object_id(d.get("_id")),
        status_code=d["status_code"],
        display_name=d.get("display_name", ""),
        description=d.get("description"),
        is_active=d.get("is_active", True),
        view_order=d.get("view_order"),
    )


@router.post("/", response_model=StatusOut)
async def create_status(
    body: StatusIn,
    current_user: dict = Depends(require_admin()),
    db=Depends(get_db)
):
    exists = await statuses_col(db).find_one({"status_code": body.status_code})
    if exists:
        raise HTTPException(409, "status_code already exists")
    res = await statuses_col(db).insert_one(body.model_dump())
    d = await statuses_col(db).find_one({"_id": res.inserted_id})
    return StatusOut(
        id=str_object_id(d.get("_id")),
        status_code=d["status_code"],
        display_name=d.get("display_name", ""),
        description=d.get("description"),
        is_active=d.get("is_active", True),
        view_order=d.get("view_order"),
    )


@router.patch("/{status_code}", response_model=StatusOut)
async def update_status(
    status_code: str,
    body: StatusIn,
    current_user: dict = Depends(require_admin()),
    db=Depends(get_db)
):
    await statuses_col(db).update_one({"status_code": status_code}, {"$set": body.model_dump()})
    d = await statuses_col(db).find_one({"status_code": status_code})
    if not d:
        raise HTTPException(404, "Status not found after update")
    return StatusOut(
        id=str_object_id(d.get("_id")),
        status_code=d["status_code"],
        display_name=d.get("display_name", ""),
        description=d.get("description"),
        is_active=d.get("is_active", True),
        view_order=d.get("view_order"),
    )


@router.delete("/{status_code}")
async def delete_status(
    status_code: str,
    current_user: dict = Depends(require_admin()),
    db=Depends(get_db)
):
    res = await statuses_col(db).delete_one({"status_code": status_code})
    if res.deleted_count == 0:
        raise HTTPException(404, "Status not found")
    return {"ok": True}
