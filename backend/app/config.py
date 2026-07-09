"""
Configuration module for the Horcrux backend application.

Reads all environment variables required for future integrations
and configures defaults.
"""

import os
from typing import List
from dotenv import load_dotenv

# Load environment variables from .env file for local development
load_dotenv()

# Fireworks API Configuration
FIREWORKS_API_KEY: str = os.getenv("FIREWORKS_API_KEY", "")
FIREWORKS_BASE_URL: str = os.getenv("FIREWORKS_BASE_URL", "https://api.fireworks.ai/inference/v1")

# Allowed Models configuration
# Reads comma-separated models from environment or uses defaults
_default_models = "accounts/fireworks/models/minimax-m3"
ALLOWED_MODELS_STR: str = os.getenv("ALLOWED_MODELS", _default_models)
ALLOWED_MODELS: List[str] = [m.strip() for m in ALLOWED_MODELS_STR.split(",") if m.strip()]

# Server Configuration
PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Horcrux")
DEBUG: bool = os.getenv("DEBUG", "False").lower() in ("true", "1", "t", "y", "yes")

# Confidence-based Routing Configuration
DEFAULT_CONFIDENCE_THRESHOLD: float = float(os.getenv("DEFAULT_CONFIDENCE_THRESHOLD", "0.80"))
