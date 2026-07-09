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
from backend.app.services.local_metrics import tracker
from backend.app.config import DEFAULT_CONFIDENCE_THRESHOLD
from backend.app.router.confidence import should_escalate

# Explicitly instantiate and register local execution tool handlers in a centralized manner
_local_dispatcher = LocalDispatcher()
_local_dispatcher.register_default_handlers()

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
        
        # Record metrics
        tracker.record_fireworks(tokens_used)
        
        logger.info(f"Fireworks Execution Complete: Task={task.task_id} | Tokens={tokens_used} | Model={model_used}")
        print(f"[FIREWORKS METRICS] Task ID: {task.task_id} | Model: {model_used} | Tokens Used: {tokens_used}")
    else:
        logger.info(f"Executing task {task.task_id} via Local Dispatcher...")
        local_res = _local_dispatcher.execute(task, category)
        
        # Check if the result calls for escalation
        escalate, reason = should_escalate(local_res, DEFAULT_CONFIDENCE_THRESHOLD)
        
        # Assign estimated token savings based on category
        estimated_tokens = 150
        if category == "math_reasoning":
            estimated_tokens = 250
        elif category == "factual_knowledge":
            estimated_tokens = 200

        if not escalate:
            answer = local_res.answer
            
            # Record local metrics
            tracker.record_local(local_res.confidence, local_res.processing_time_ms, estimated_tokens)
            
            # Detailed success logging
            success_log = (
                f"Task: {task.task_id} | Handler: {local_res.handler_name} | "
                f"Confidence: {local_res.confidence:.2f} | Decision: Local | "
                f"Estimated Tokens Saved: {estimated_tokens}"
            )
            logger.info(f"Local routing execution successful: {success_log}")
            print(f"[ROUTING DECISION] {success_log}")
            print(f"[LOCAL EXECUTION] Task ID: {task.task_id} | Answer: {answer}")
        else:
            # Escalation path!
            logger.info(
                f"[ROUTING ESCALATION] Local execution failed or low confidence for Task={task.task_id} "
                f"(Reason: {reason}, Confidence: {local_res.confidence:.2f}, Threshold: {DEFAULT_CONFIDENCE_THRESHOLD}). "
                f"Escalating to Fireworks API..."
            )
            print(f"[ROUTING ESCALATION] Escalating Task ID: {task.task_id} to Fireworks API (Reason: {reason})...")
            
            api_result = call_fireworks(task.prompt, category=category)
            answer = api_result["answer"]
            tokens_used = api_result["tokens_used"]
            model_used = api_result["model"]
            
            # Record escalation metrics
            tracker.record_escalation(reason, tokens_used, local_res.confidence)
            
            # Detailed escalation logging
            escalate_log = (
                f"Task: {task.task_id} | Handler: {local_res.handler_name} | "
                f"Confidence: {local_res.confidence:.2f} | Decision: Escalated | "
                f"Fireworks Model: {model_used}"
            )
            logger.info(f"Escalation Complete: {escalate_log} | Tokens Used: {tokens_used}")
            print(f"[ROUTING DECISION] {escalate_log}")
            print(f"[FIREWORKS METRICS (ESCALATED)] Task ID: {task.task_id} | Model: {model_used} | Tokens Used: {tokens_used}")

    return Result(
        task_id=task.task_id,
        answer=answer
    )
