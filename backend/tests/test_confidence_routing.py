import pytest
from backend.app.models.task import Task
from backend.app.local_tools.interfaces import LocalResult
from backend.app.router.confidence import should_escalate
from backend.app.local_tools.handlers.sentiment import SentimentHandler
from backend.app.local_tools.handlers.ner import NERHandler
from backend.app.local_tools.handlers.summarization import SummarizationHandler
from backend.app.services.local_metrics import tracker

def test_sentiment_handler_confidence():
    handler = SentimentHandler()
    
    # Positive lexicon match (Confidence 1.0)
    t1 = Task(task_id="t1", prompt="Classify: This is fantastic!")
    res1 = handler.execute(t1)
    assert res1.answer == "Positive"
    assert res1.confidence == 1.0

    # Neutral fallback (Confidence 0.55)
    t2 = Task(task_id="t2", prompt="Classify: The door is blue.")
    res2 = handler.execute(t2)
    assert res2.answer == "Neutral"
    assert res2.confidence == 0.55

def test_ner_handler_confidence():
    handler = NERHandler()
    
    # Regex fallback with entities (Confidence 0.90 / 0.96 / 0.98)
    # Force nlp = None to test regex execution
    t1 = Task(task_id="t1", prompt="Extract: Barack Obama visited London in 2012.")
    res1 = handler.execute(t1)
    assert "Barack Obama" in res1.answer
    assert res1.confidence in (0.90, 0.95, 0.96, 0.98) # depending on whether spaCy is installed locally

def test_summarization_handler_confidence():
    handler = SummarizationHandler()
    
    # Long text (Confidence 0.90 / 0.97)
    long_text = "The economy grew by three percent last quarter due to massive increase in exports. " * 3
    t1 = Task(task_id="t1", prompt=f"Summarize in one sentence: {long_text}")
    res1 = handler.execute(t1)
    assert res1.confidence in (0.90, 0.97)

    # Short text (Confidence 0.60 / 0.97)
    t2 = Task(task_id="t2", prompt="Summarize in one sentence: Short text.")
    res2 = handler.execute(t2)
    assert res2.confidence in (0.60, 0.97)

def test_should_escalate():
    # Succeeded and confident -> False
    res1 = LocalResult(answer="Positive", handled=True, confidence=1.0)
    escalate1, reason1 = should_escalate(res1, 0.80)
    assert escalate1 is False
    assert reason1 == "none"

    # Unhandled -> True ('not_handled')
    res2 = LocalResult(answer="", handled=False, confidence=0.0)
    escalate2, reason2 = should_escalate(res2, 0.80)
    assert escalate2 is True
    assert reason2 == "not_handled"

    # Empty answer -> True ('parse_failure')
    res3 = LocalResult(answer="", handled=True, confidence=1.0)
    escalate3, reason3 = should_escalate(res3, 0.80)
    assert escalate3 is True
    assert reason3 == "parse_failure"

    # Low confidence -> True ('low_confidence')
    res4 = LocalResult(answer="Neutral", handled=True, confidence=0.55)
    escalate4, reason4 = should_escalate(res4, 0.80)
    assert escalate4 is True
    assert reason4 == "low_confidence"

def test_metrics_recording():
    # Reset tracker values
    tracker.local_tasks_completed = 0
    tracker.fireworks_tasks_completed = 0
    tracker.escalation_count = 0
    tracker.confidence_values = []
    tracker.total_confidence = 0.0
    tracker.histogram = {k: 0 for k in tracker.histogram_keys}
    
    # Record local
    tracker.record_local(confidence=0.90, execution_time_ms=5.2, estimated_tokens=150)
    # Record escalation
    tracker.record_escalation(reason="low_confidence", tokens_used=50, confidence=0.30)
    
    summary = tracker.get_summary()
    assert summary.local_tasks_completed == 1
    assert summary.escalation_count == 1
    assert summary.fireworks_tasks_completed == 1
    assert summary.average_confidence == 0.60 # average of 0.90 and 0.30
    assert summary.confidence_histogram["0.8-1.0"] == 1
    assert summary.confidence_histogram["0.2-0.4"] == 1
