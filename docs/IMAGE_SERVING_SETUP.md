# Image Serving Setup

This document explains how the image serving functionality has been implemented to allow the frontend to display images from the `minhmom_fb` module.

## Backend Changes

### 1. YAML Configuration
- Created `backend/config.yaml` for centralized configuration
- Added PyYAML dependency for YAML parsing
- Updated `backend/app/config.py` to load configuration from YAML with fallback to defaults

### 2. Static File Serving
- Added FastAPI static file serving in `backend/app/main.py`
- Images are served from `/images` endpoint
- Image paths are now configurable via `config.images.base_path`

### 3. Image API Endpoints
Created `backend/app/routers/images.py` with the following endpoints:

- `GET /images/posts/{post_id}` - Get all images for a specific post
- `GET /images/posts/{post_id}/{filename}` - Serve a specific image file
- `GET /images/health` - Check if images directory is accessible

### 4. Updated Post Schema
- The `PostOut` schema already includes `local_images: List[str]` field
- This field contains the local file paths to images

## Frontend Changes

### 1. Updated Types
- Added `local_images?: string[]` to the `Post` interface in `mm-frontend/src/types/api.ts`

### 2. Image Gallery Component
Created `mm-frontend/src/components/ui/image-gallery.tsx` with features:
- Displays up to a configurable number of images (default: 3)
- Shows remaining count if there are more images
- Click to open full-screen image viewer
- Navigation between images
- Error handling for broken images

### 3. Updated Posts Screen
- Added "Images" column to the posts table
- Integrated `ImageGallery` component to display post images
- Shows up to 2 images per post in the table view

### 4. API Client
- Added `imageApi` functions in `mm-frontend/src/lib/api-client.ts`
- Includes functions to get post images and construct image URLs

## Configuration

### Backend Configuration (`backend/config.yaml`)
```yaml
images:
  base_path: "../minhmom_fb/downloaded_files/images"
  posts_dir: "posts"
  comments_dir: "comments"
  allowed_extensions: [".jpg", ".jpeg", ".png", ".gif", ".webp"]
  max_file_size_mb: 10
```

### Frontend Environment Variables
- `VITE_API_BASE_URL` - Backend API base URL (default: http://localhost:8000)
- `VITE_GROUP_ID` - Facebook group ID (default: 2847737995453663)

## How It Works

1. **Image Storage**: Images are stored in the configured directory (e.g., `D:/01_Projects/09_minhmom/post_images/posts/{post_id}/`) by the Facebook crawler
2. **Database Storage**: The `local_images` field in the database contains metadata with `local_path` information
3. **Configuration**: Backend loads image paths and settings from `config.yaml`
4. **URL Construction**: The posts API constructs image URLs by:
   - Reading `local_images` metadata from the database
   - Using the `local_path` values directly (they already contain relative paths)
   - Converting backslashes to forward slashes and adding `/images` prefix
   - Resulting in URLs like `/images/posts/{post_id}/{filename}`
5. **Backend Serving**: FastAPI serves these images via static file mounting and dedicated endpoints
6. **Frontend Display**: The frontend receives pre-constructed image URLs and displays them using the `ImageGallery` component

## Usage

1. Start the backend server: `cd backend && uvicorn app.main:app --reload`
2. Start the frontend: `cd mm-frontend && npm run dev`
3. Images will automatically be displayed in the posts table if they exist

## API Endpoints

- `GET /images/posts/{post_id}` - Returns list of images for a post
- `GET /images/posts/{post_id}/{filename}` - Serves the actual image file
- `GET /images/health` - Health check for image serving

## Error Handling

- Missing images are handled gracefully (component returns null)
- Broken image URLs show a fallback or are hidden
- Network errors are handled by the API client interceptors
