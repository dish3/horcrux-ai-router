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
    allow_origins=["*"],
    allow_credentials=False,
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

@app.get("/cors-test")
async def cors_test() -> dict[str, str]:
    return {
        "status": "ok",
        "version": "cors-test-v1",
        "allowed_origins": str([
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "https://horcrux-ai-router-7brw.vercel.app"
        ])
    }
