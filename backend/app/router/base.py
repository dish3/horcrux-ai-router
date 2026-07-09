"""
Base interfaces for routing strategies.
"""

from abc import ABC, abstractmethod
from backend.app.models.task import Task

class BaseRoutingStrategy(ABC):
    """
    Abstract interface for routing strategy logic.
    """

    @abstractmethod
    def route(self, task: Task, category: str, difficulty: str) -> str:
        """
        Determines the route (e.g. 'local' or 'fireworks') for the task.

        Args:
            task: The Task input object.
            category: The classified category of the task.
            difficulty: The estimated difficulty level of the task.

        Returns:
            The selected route identifier as a string.
        """
        pass
