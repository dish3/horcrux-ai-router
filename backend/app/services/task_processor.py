"""
Task processing service orchestrating routing and execution.
"""

from backend.app.models.task import Task
from backend.app.models.result import Result
from backend.app.classifiers.heuristic_classifier import HeuristicClassifier
from backend.app.classifiers.heuristic_difficulty import HeuristicDifficultyEstimator
from backend.app.router.registry import get_strategy
from backend.app.utils.logger import logger

# Thread-safe persistent instances of classifier and difficulty estimator
_classifier = HeuristicClassifier()
_difficulty_estimator = HeuristicDifficultyEstimator()

def process_task(task: Task) -> Result:
    """
    Processes a task by running classification, difficulty estimation,
    routing decisions, and fallback execution.

    Args:
        task: The Task input object.

    Returns:
        A Result output object containing the placeholder response.
    """
    # 1. Run classifier
    category = _classifier.classify(task)

    # 2. Run difficulty estimator
    difficulty = _difficulty_estimator.estimate_difficulty(task)

    # 3. Fetch strategy and determine route
    strategy = get_strategy("category_mapping")
    route = strategy.route(task, category, difficulty)

    # 4. Print/log the routing decision
    print(f"[ROUTING SUMMARY] Task ID: {task.task_id} | Category: {category} | Difficulty: {difficulty} | Route: {route}")
    logger.info(
        f"Task {task.task_id} routed via strategy 'category_mapping' to '{route}' "
        f"(Category: {category}, Difficulty: {difficulty})"
    )

    # 5. Placeholder execution (do NOT call Fireworks yet)
    return Result(
        task_id=task.task_id,
        answer="This task processor is not implemented yet."
    )
