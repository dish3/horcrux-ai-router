"""
Configuration module for the Horcrux backend application.

Reads all environment variables required for future integrations
and configures defaults.
"""

import os
from typing import List

# Fireworks API Configuration
FIREWORKS_API_KEY: str = os.getenv("FIREWORKS_API_KEY", "")
FIREWORKS_BASE_URL: str = os.getenv("FIREWORKS_BASE_URL", "https://api.fireworks.ai/inference/v1")

# Allowed Models configuration
# Reads comma-separated models from environment or uses defaults
_default_models = (
    "accounts/fireworks/models/llama-v3p1-8b-instruct,"
    "accounts/fireworks/models/llama-v3p1-70b-instruct"
)
ALLOWED_MODELS_STR: str = os.getenv("ALLOWED_MODELS", _default_models)
ALLOWED_MODELS: List[str] = [m.strip() for m in ALLOWED_MODELS_STR.split(",") if m.strip()]

# Server Configuration
PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Horcrux")
DEBUG: bool = os.getenv("DEBUG", "False").lower() in ("true", "1", "t", "y", "yes")
