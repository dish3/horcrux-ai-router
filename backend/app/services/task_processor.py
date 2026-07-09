"""
Task processing service orchestrating routing and execution.
"""

from backend.app.models.task import Task
from backend.app.models.result import Result
from backend.app.classifiers.heuristic_classifier import HeuristicClassifier
from backend.app.classifiers.heuristic_difficulty import HeuristicDifficultyEstimator
from backend.app.router.registry import get_strategy
from backend.app.fireworks.fireworks_client import call_fireworks
from backend.app.utils.logger import logger
from backend.app.local_tools.dispatcher import LocalDispatcher
from backend.app.local_tools.handlers.sentiment import SentimentHandler
from backend.app.local_tools.handlers.ner import NERHandler
from backend.app.local_tools.handlers.summarization import SummarizationHandler

# Explicitly instantiate and register local execution tool handlers
_local_dispatcher = LocalDispatcher()
_local_dispatcher.register(SentimentHandler())
_local_dispatcher.register(NERHandler())
_local_dispatcher.register(SummarizationHandler())

# Thread-safe persistent instances of classifier and difficulty estimator
_classifier = HeuristicClassifier()
_difficulty_estimator = HeuristicDifficultyEstimator()

def process_task(task: Task) -> Result:
    """
    Processes a task by running classification, difficulty estimation,
    routing decisions, and executing the mapped route.

    Args:
        task: The Task input object.

    Returns:
        A Result output object containing the task execution response.
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

    # 5. Route-based execution
    if route == "fireworks":
        logger.info(f"Executing task {task.task_id} via Fireworks API...")
        api_result = call_fireworks(task.prompt, category=category)
        answer = api_result["answer"]
        tokens_used = api_result["tokens_used"]
        model_used = api_result["model"]
        
        logger.info(f"Fireworks Execution Complete: Task={task.task_id} | Tokens={tokens_used} | Model={model_used}")
        print(f"[FIREWORKS METRICS] Task ID: {task.task_id} | Model: {model_used} | Tokens Used: {tokens_used}")
    else:
        logger.info(f"Executing task {task.task_id} via Local Dispatcher...")
        local_res = _local_dispatcher.execute(task, category)
        answer = local_res.answer
        print(f"[LOCAL EXECUTION] Task ID: {task.task_id} | Answer: {answer}")

    return Result(
        task_id=task.task_id,
        answer=answer
    )
