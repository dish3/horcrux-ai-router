"""
Main FastAPI application entrypoint for the Horcrux backend.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app import config
from backend.app.utils.logger import logger
from backend.app.api.router_endpoint import router as api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles application startup and shutdown lifecycle events.
    """
    logger.info(f"Starting {config.PROJECT_NAME} application...")
    logger.info(f"Allowed Models: {config.ALLOWED_MODELS}")
    yield
    logger.info(f"Shutting down {config.PROJECT_NAME} application...")

app = FastAPI(
    title=config.PROJECT_NAME,
    debug=config.DEBUG,
    lifespan=lifespan
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local sandbox access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(api_router, prefix="/api")

@app.get("/")
async def read_root() -> dict[str, str]:
    """
    Root endpoint returning status metadata.
    """
    return {
        "project": "Horcrux",
        "status": "running"
      }
