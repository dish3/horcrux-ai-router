"""
FastAPI route handler wrapping Horcrux AI routing logic.
"""

import time
import uuid
from fastapi import APIRouter
from pydantic import BaseModel

from backend.app.models.task import Task
from backend.app.classifiers.heuristic_classifier import HeuristicClassifier
from backend.app.classifiers.heuristic_difficulty import HeuristicDifficultyEstimator
from backend.app.router.registry import get_strategy
from backend.app.fireworks.fireworks_client import call_fireworks
from backend.app.local_tools.dispatcher import LocalDispatcher
from backend.app.router.confidence import should_escalate
from backend.app.config import DEFAULT_CONFIDENCE_THRESHOLD
from backend.app.services.local_metrics import tracker

router = APIRouter()

# Instantiate pipeline orchestrators
_classifier = HeuristicClassifier()
_difficulty_estimator = HeuristicDifficultyEstimator()
_local_dispatcher = LocalDispatcher()
_local_dispatcher.register_default_handlers()

class RouteRequest(BaseModel):
    prompt: str
    category: str = None

class RouteResponse(BaseModel):
    task_id: str
    prompt: str
    category: str
    route: str
    handler: str
    confidence: float
    latency_ms: float
    fireworks_model: str
    tokens_used: int
    tokens_saved: int
    answer: str
    escalated: bool
    escalation_reason: str

class MetricsResponse(BaseModel):
    total_tasks: int
    local_tasks: int
    fireworks_tasks: int
    token_savings: int
    average_confidence: float
    average_latency: float
    escalation_count: int

@router.post("/route", response_model=RouteResponse)
def route_prompt(req: RouteRequest):
    """
    Executes a task processing pipeline run, executing routing decisions,
    local handlers, confidence threshold checks, and Fireworks API escalation.
    Updates the global metrics tracker.
    """
    start_time = time.perf_counter()
    task_id = f"task_api_{uuid.uuid4().hex[:6]}"
    
    # 1. Instantiate Task model
    task = Task(task_id=task_id, prompt=req.prompt)
    
    # 2. Classifier
    category = req.category if req.category else _classifier.classify(task)
    
    # 3. Difficulty Estimator
    difficulty = _difficulty_estimator.estimate_difficulty(task)
    
    # 4. Strategy Router
    strategy = get_strategy("category_mapping")
    route_decision = strategy.route(task, category, difficulty)
    
    # Outputs variables
    handler_name = "None"
    confidence = 0.0
    fireworks_model = "None"
    tokens_used = 0
    tokens_saved = 0
    escalated = False
    escalation_reason = "none"
    answer = ""
    
    if route_decision == "fireworks":
        # Direct Fireworks route
        api_result = call_fireworks(task.prompt, category=category)
        answer = api_result["answer"]
        tokens_used = api_result["tokens_used"]
        fireworks_model = api_result["model"]
        
        # Record metrics
        tracker.record_fireworks(tokens_used)
    else:
        # Local dispatcher execution
        local_res = _local_dispatcher.execute(task, category)
        
        # Check escalation threshold
        escalate, reason = should_escalate(local_res, DEFAULT_CONFIDENCE_THRESHOLD)
        confidence = local_res.confidence
        handler_name = local_res.handler_name
        
        # Define estimated token savings
        saved_est = 150
        if category == "math_reasoning":
            saved_est = 250
        elif category == "factual_knowledge":
            saved_est = 200

        if not escalate:
            answer = local_res.answer
            tokens_saved = saved_est
            
            # Record local metrics
            tracker.record_local(confidence, local_res.processing_time_ms, tokens_saved)
        else:
            escalated = True
            escalation_reason = reason
            
            # Escalate execution to Fireworks API
            api_result = call_fireworks(task.prompt, category=category)
            answer = api_result["answer"]
            tokens_used = api_result["tokens_used"]
            fireworks_model = api_result["model"]
            
            # Record escalation metrics
            tracker.record_escalation(reason, tokens_used, confidence)
            
    end_time = time.perf_counter()
    latency_ms = (end_time - start_time) * 1000.0
    
    return RouteResponse(
        task_id=task_id,
        prompt=req.prompt,
        category=category,
        route="local" if (route_decision == "local" and not escalated) else "fireworks",
        handler=handler_name,
        confidence=confidence,
        latency_ms=latency_ms,
        fireworks_model=fireworks_model,
        tokens_used=tokens_used,
        tokens_saved=tokens_saved,
        answer=answer,
        escalated=escalated,
        escalation_reason=escalation_reason
    )

@router.get("/metrics", response_model=MetricsResponse)
def get_metrics():
    """
    Returns live metrics summary gathered from the local MetricsTracker.
    """
    summary = tracker.get_summary()
    total_tasks = summary.local_tasks_completed + summary.fireworks_tasks_completed
    return MetricsResponse(
        total_tasks=total_tasks,
        local_tasks=summary.local_tasks_completed,
        fireworks_tasks=summary.fireworks_tasks_completed,
        token_savings=summary.estimated_tokens_saved,
        average_confidence=summary.average_confidence,
        average_latency=summary.average_handler_execution_time_ms,
        escalation_count=summary.escalation_count
    )
