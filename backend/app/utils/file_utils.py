"""
File utility helper functions for safe JSON reading and writing.
"""

import json
import logging
from pathlib import Path
from typing import Any, Union

from backend.app.utils.logger import logger

def read_json_file(file_path: Union[str, Path]) -> Any:
    """
    Safely reads and parses a JSON file.

    Args:
        file_path: Path to the JSON file.

    Returns:
        The parsed JSON content.

    Raises:
        FileNotFoundError: If the file does not exist.
        json.JSONDecodeError: If the file content is malformed.
    """
    path = Path(file_path)
    if not path.is_file():
        logger.error(f"File not found: {path.absolute()}")
        raise FileNotFoundError(f"File not found: {path}")

    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        logger.error(f"Malformed JSON in file {path.absolute()}: {e}")
        raise e
    except Exception as e:
        logger.error(f"Error reading file {path.absolute()}: {e}")
        raise e

def write_json_file(file_path: Union[str, Path], data: Any, indent: int = 4) -> None:
    """
    Safely writes data to a JSON file, creating parent directories if needed.

    Args:
        file_path: Path to write the JSON data.
        data: The JSON-serializable data.
        indent: Indentation spacing.
    """
    path = Path(file_path)
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8") as f:
            json.dump(data, f, indent=indent, ensure_ascii=False)
        logger.info(f"Successfully wrote data to {path.absolute()}")
    except Exception as e:
        logger.error(f"Failed to write JSON file {path.absolute()}: {e}")
        raise e
