"""
Base interfaces for task classification and difficulty estimation.
"""

from abc import ABC, abstractmethod
from backend.app.models.task import Task

class BaseClassifier(ABC):
    """
    Abstract interface for categorizing input tasks.
    """

    @abstractmethod
    def classify(self, task: Task) -> str:
        """
        Classifies the task into one of the designated categories.

        Args:
            task: The Task input object.

        Returns:
            The category name as a lowercase string.
        """
        pass

class BaseDifficultyEstimator(ABC):
    """
    Abstract interface for evaluating input task complexity/difficulty.
    """

    @abstractmethod
    def estimate_difficulty(self, task: Task) -> str:
        """
        Estimates the difficulty level of the task.

        Args:
            task: The Task input object.

        Returns:
            The difficulty level as a lowercase string (e.g. 'easy', 'medium', 'hard').
        """
        pass
