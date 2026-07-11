"""
Routing strategy mapping specific task categories to execution targets.
"""

from backend.app.router.base import BaseRoutingStrategy
from backend.app.models.task import Task
from backend.app.utils.logger import logger

class CategoryMappingStrategy(BaseRoutingStrategy):
    """
    Routes tasks based on their classified category.
    """

    def route(self, task: Task, category: str, difficulty: str) -> str:
        """
        Determines the route ('local' or 'fireworks') based on category.

        Args:
            task: The Task input object.
            category: The classified task category.
            difficulty: The estimated difficulty level.

        Returns:
            The selected target route name ('local' or 'fireworks').
        """
        local_categories = {"sentiment", "ner", "summarization", "math_reasoning", "factual_knowledge", "greeting"}
        fireworks_categories = {
            "logic",
            "code_debugging",
            "code_generation"
        }

        if category in local_categories:
            route_decision = "local"
        elif category in fireworks_categories:
            route_decision = "fireworks"
        else:
            logger.warning(
                f"Unknown category '{category}' for task {task.task_id}. "
                "Defaulting to 'fireworks' for safety."
            )
            route_decision = "fireworks"

        logger.info(
            f"[Route Decision] Task={task.task_id} | Category={category} | "
            f"Difficulty={difficulty} | Target={route_decision}"
        )
        return route_decision
