"""
Heuristic difficulty estimator based on prompt characteristics.
"""

from backend.app.classifiers.base import BaseDifficultyEstimator
from backend.app.models.task import Task
from backend.app.utils.logger import logger

class HeuristicDifficultyEstimator(BaseDifficultyEstimator):
    """
    Estimates task difficulty using simple heuristic measures.
    """

    def estimate_difficulty(self, task: Task) -> str:
        """
        Estimates the difficulty level of the task based on prompt character length.

        Args:
            task: The Task input object.

        Returns:
            The difficulty level as 'easy', 'medium', or 'hard'.
        """
        length = len(task.prompt)
        if length < 100:
            difficulty = "easy"
        elif length < 500:
            difficulty = "medium"
        else:
            difficulty = "hard"

        logger.info(f"Estimated difficulty for task {task.task_id} as '{difficulty}' (length: {length})")
        return difficulty
