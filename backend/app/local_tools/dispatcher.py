"""
Local dispatcher managing the registry and execution of local handlers.
"""

from typing import List
from backend.app.models.task import Task
from backend.app.local_tools.interfaces import LocalHandler, LocalResult
from backend.app.utils.logger import logger

class LocalDispatcher:
    """
    Orchestrates the matching and execution of tasks across registered local handlers.
    """

    def __init__(self) -> None:
        self._handlers: List[LocalHandler] = []

    def register_handler(self, handler: LocalHandler) -> None:
        """
        Registers a new local handler in the registry chain.

        Args:
            handler: An instance of a class implementing LocalHandler.
        """
        self._handlers.append(handler)
        logger.info(f"Registered local handler: {handler.__class__.__name__}")

    def register(self, handler: LocalHandler) -> None:
        """
        Alias for register_handler to support explicit registration style.
        """
        self.register_handler(handler)

    def execute(self, task: Task, category: str) -> LocalResult:
        """
        Finds the first registered handler capable of executing the task and runs it.
        If no handler matches, returns a fallback LocalResult.

        Args:
            task: The Task input object.
            category: The computed category for the task.

        Returns:
            A LocalResult instance.
        """
        logger.info(
            f"[DEBUG DISPATCHER] Execute called for Task: {task.task_id} | "
            f"Computed Category: {category} | Prompt snippet: {task.prompt[:60]}..."
        )

        for handler in self._handlers:
            try:
                can_handle = handler.can_handle(task, category)
                logger.info(
                    f"[DEBUG DISPATCHER] Handler {handler.__class__.__name__}.can_handle "
                    f"returned: {can_handle}"
                )
                
                if can_handle:
                    logger.info(f"Delegating task {task.task_id} to handler: {handler.__class__.__name__}")
                    return handler.execute(task)
            except Exception as e:
                logger.error(
                    f"Error checking/executing handler {handler.__class__.__name__} "
                    f"for task {task.task_id}: {e}"
                )
                continue

        logger.warning(f"No local handler matched task {task.task_id}. Returning default placeholder.")
        return LocalResult(
            answer="This task processor is not implemented yet.",
            confidence=0.0
        )
