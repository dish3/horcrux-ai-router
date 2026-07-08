"""
Service for loading and validating tasks from a JSON input source.
"""

from pathlib import Path
from typing import List, Union

from backend.app.models.task import Task
from backend.app.utils.file_utils import read_json_file
from backend.app.utils.logger import logger

class TaskLoadError(Exception):
    """Exception raised when task loading fails due to file or JSON parse issues."""
    pass

class TaskValidationError(Exception):
    """Exception raised when tasks fail schema validation."""
    pass

def load_tasks(file_path: Union[str, Path] = "/input/tasks.json") -> List[Task]:
    """
    Loads tasks from the specified JSON file and validates them.

    Args:
        file_path: Path to the input JSON file containing tasks.

    Returns:
        A list of validated Task objects.

    Raises:
        TaskLoadError: If file loading or reading fails.
        TaskValidationError: If task format or required fields are missing.
    """
    path = Path(file_path)
    logger.info(f"Attempting to load tasks from {path.absolute()}")

    try:
        raw_data = read_json_file(path)
    except FileNotFoundError as e:
        raise TaskLoadError(f"Tasks file not found at {path}: {e}")
    except Exception as e:
        raise TaskLoadError(f"Failed to load/parse tasks JSON: {e}")

    if not isinstance(raw_data, list):
        raise TaskValidationError(
            f"Invalid tasks file structure. Expected a JSON list, got {type(raw_data).__name__}"
        )

    tasks: List[Task] = []
    for idx, item in enumerate(raw_data):
        if not isinstance(item, dict):
            raise TaskValidationError(f"Task at index {idx} is not a JSON object.")
        
        # Validate required fields explicitly
        task_id = item.get("task_id")
        prompt = item.get("prompt")
        
        missing_fields = []
        if task_id is None or str(task_id).strip() == "":
            missing_fields.append("task_id")
        if prompt is None or str(prompt).strip() == "":
            missing_fields.append("prompt")
            
        if missing_fields:
            raise TaskValidationError(
                f"Task at index {idx} is missing required fields: {', '.join(missing_fields)}"
            )

        try:
            # Let Pydantic instantiate and validate
            task = Task(**item)
            tasks.append(task)
        except Exception as e:
            raise TaskValidationError(f"Task validation failed at index {idx}: {e}")

    logger.info(f"Successfully loaded and validated {len(tasks)} tasks.")
    return tasks
