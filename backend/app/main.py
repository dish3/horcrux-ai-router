"""
Main FastAPI application entrypoint for the Horcrux backend.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from backend.app import config
from backend.app.utils.logger import logger

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

@app.get("/")
async def read_root() -> dict[str, str]:
    """
    Root endpoint returning status metadata.
    """
    return {
        "project": "Horcrux",
        "status": "running"
    }
