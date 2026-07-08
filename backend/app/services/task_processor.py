"""
Placeholder task processing service.
"""

from backend.app.models.task import Task
from backend.app.models.result import Result
from backend.app.utils.logger import logger

def process_task(task: Task) -> Result:
    """
    Processes a single task using placeholder logic.

    Args:
        task: The Task input object.

    Returns:
        A Result output object containing the placeholder response.
    """
    logger.info(f"Processing task: {task.task_id} (placeholder)")
    return Result(
        task_id=task.task_id,
        answer="This task processor is not implemented yet."
    )
