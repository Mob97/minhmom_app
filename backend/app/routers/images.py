from fastapi import APIRouter, HTTPException, Path, Depends
from fastapi.responses import FileResponse
from ..config import config
from ..db import get_db, posts_col
from ..auth import require_user_or_admin
import os

router = APIRouter(prefix="/images", tags=["Images"])

@router.get("/test")
async def test_endpoint():
    print("=== Test endpoint called ===")
    return {"message": "Images router is working"}

# Get the path to the images directory from config
# config.images.base_path is already an absolute path
images_path = config.images.base_path


def construct_image_urls(local_images: list) -> list:
    """
    Construct image URLs from local_images metadata.
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
            image_urls.append({
                "filename": img_data.get('filename', ''),
                "url": image_url,
                "local_path": local_path,
                "original_url": img_data.get('original_url', ''),
                "success": img_data.get('success', True),
                "cached": img_data.get('cached', False)
            })
        elif isinstance(img_data, str):
            # Handle case where local_images contains just strings
            image_url = f"/static/images/{img_data.replace(os.sep, '/')}"
            image_urls.append({
                "filename": os.path.basename(img_data),
                "url": image_url,
                "local_path": img_data
            })

    return image_urls


@router.get("/groups/{group_id}/posts/{post_id}")
async def get_post_images(
    group_id: str = Path(..., description="Group ID"),
    post_id: str = Path(..., description="Post ID"),
    current_user: dict = Depends(require_user_or_admin()),
    db=Depends(get_db)
):
    """
    Get all images for a specific post from the database.
    Returns a list of image URLs that can be used by the frontend.
    """
    print("=== get_post_images function called ===")
    try:
        # Get the post from the database
        post = await posts_col(db, group_id).find_one({"_id": post_id})

        if not post:
            raise HTTPException(status_code=404, detail=f"Post {post_id} not found in group {group_id}")

        # Get local_images from the post
        local_images_data = post.get("local_images") or []

        # Construct image URLs
        image_urls = construct_image_urls(local_images_data)

        return {"images": image_urls}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading images: {str(e)}")


@router.get("/groups/{group_id}/posts/{post_id}/{filename}")
async def serve_image(
    group_id: str = Path(..., description="Group ID"),
    post_id: str = Path(..., description="Post ID"),
    filename: str = Path(..., description="Image filename"),
    current_user: dict = Depends(require_user_or_admin()),
    db=Depends(get_db)
):
    """
    Serve a specific image file.
    """
    try:
        # Get the post from the database to find the correct local_path
        post = await posts_col(db, group_id).find_one({"_id": post_id})

        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        # Find the specific image in local_images
        local_images_data = post.get("local_images") or []
        target_image = None

        for img_data in local_images_data:
            if isinstance(img_data, dict) and img_data.get('filename') == filename:
                target_image = img_data
                break

        if not target_image:
            raise HTTPException(status_code=404, detail="Image not found in post")

        # Construct the full path using base_path and local_path
        local_path = target_image['local_path']
        full_image_path = os.path.join(config.images.base_path, local_path)

        if not os.path.exists(full_image_path):
            raise HTTPException(status_code=404, detail="Image file not found on disk")

        # Check if it's a valid image file
        if not any(filename.lower().endswith(ext) for ext in config.images.allowed_extensions):
            raise HTTPException(status_code=400, detail="Invalid image file")

        return FileResponse(
            full_image_path,
            media_type="image/jpeg",  # Default to JPEG, FastAPI will detect the actual type
            filename=filename
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving image: {str(e)}")


@router.get("/health")
async def images_health():
    """
    Check if images directory is accessible.
    """
    return {
        "images_path": images_path,
        "exists": os.path.exists(images_path),
        "posts_dir": os.path.join(images_path, config.images.posts_dir),
        "posts_dir_exists": os.path.exists(os.path.join(images_path, config.images.posts_dir)),
        "comments_dir": os.path.join(images_path, config.images.comments_dir),
        "comments_dir_exists": os.path.exists(os.path.join(images_path, config.images.comments_dir)),
        "allowed_extensions": config.images.allowed_extensions,
        "max_file_size_mb": config.images.max_file_size_mb
    }
