from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .routers import statuses, users, posts, images, auth, dashboard
from .config import config
import os

app = FastAPI(title=config.api.title, version=config.api.version)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.api.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for images
# Get the absolute path to the images directory
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
images_path = os.path.join(backend_dir, config.images.base_path)

# Only mount if the images directory exists
if os.path.exists(images_path):
    app.mount("/static/images", StaticFiles(directory=images_path), name="static_images")

# Routers
app.include_router(auth.router)
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(statuses.router)
app.include_router(users.router)
app.include_router(posts.router)
app.include_router(images.router)

# OpenAPI/Swagger is available at /docs (Swagger UI) and /redoc (ReDoc)

# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for monitoring and load balancers."""
    return {
        "status": "healthy",
        "service": "MinhMom Backend",
        "version": config.api.version
    }

# Root endpoint
@app.get("/", tags=["Health"])
async def root():
    return {"ok": True, "service": "MinhMom Backend"}
