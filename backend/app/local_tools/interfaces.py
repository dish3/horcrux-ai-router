"""
Abstract base interfaces for lightweight local tool handlers.
"""

from dataclasses import dataclass
from abc import ABC, abstractmethod
from backend.app.models.task import Task

@dataclass
class LocalResult:
    """
    Data structure representing execution results from a local handler,
    prepared for future confidence-scoring evaluation.
    """
    answer: str
    confidence: float = 1.0

class LocalHandler(ABC):
    """
    Abstract Base Class that every local execution handler must implement.
    """

    @abstractmethod
    def can_handle(self, task: Task, category: str) -> bool:
        """
        Determines if the handler is capable of processing the given task.

        Args:
            task: The Task input object.
            category: The computed task category from the classifier.

        Returns:
            True if the handler can execute the task, False otherwise.
        """
        pass

    @abstractmethod
    def execute(self, task: Task) -> LocalResult:
        """
        Executes the task and returns a LocalResult object.

        Args:
            task: The Task input object.

        Returns:
            A LocalResult instance.
        """
        pass
