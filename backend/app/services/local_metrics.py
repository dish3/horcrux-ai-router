"""
Service to track local execution and hybrid routing metrics.
"""

from dataclasses import dataclass, field
from typing import Dict, List

@dataclass
class MetricsSummary:
    """
    Data container for hybrid execution metrics.
    """
    local_tasks_completed: int = 0
    fireworks_tasks_completed: int = 0
    estimated_tokens_saved: int = 0
    local_success_count: int = 0
    average_confidence: float = 0.0
    confidence_histogram: Dict[str, int] = field(default_factory=dict)
    escalation_count: int = 0
    escalation_reasons: Dict[str, int] = field(default_factory=dict)
    average_handler_execution_time_ms: float = 0.0

class MetricsTracker:
    """
    Tracks execution counts, estimated token savings, execution latency, and routing stats.
    """

    def __init__(self) -> None:
        self.local_tasks_completed = 0
        self.fireworks_tasks_completed = 0
        self.estimated_tokens_saved = 0
        self.local_success_count = 0
        
        # Latency and confidence trackers
        self.total_confidence = 0.0
        self.confidence_values: List[float] = []
        self.total_execution_time_ms = 0.0
        self.execution_times: List[float] = []
        
        # Escalation trackers
        self.escalation_count = 0
        self.escalation_reasons: Dict[str, int] = {}
        
        # Initialize histogram buckets
        self.histogram_keys = ["0.0-0.2", "0.2-0.4", "0.4-0.6", "0.6-0.8", "0.8-1.0"]
        self.histogram = {k: 0 for k in self.histogram_keys}

    def record_local(self, confidence: float, execution_time_ms: float, estimated_tokens: int = 150) -> None:
        """
        Records a successfully executed local task.
        """
        self.local_tasks_completed += 1
        self.local_success_count += 1
        self.estimated_tokens_saved += estimated_tokens
        
        # Track confidence
        self.confidence_values.append(confidence)
        self.total_confidence += confidence
        
        # Track histogram
        bucket = self._get_histogram_bucket(confidence)
        self.histogram[bucket] += 1
        
        # Track execution latency
        self.execution_times.append(execution_time_ms)
        self.total_execution_time_ms += execution_time_ms

    def record_fireworks(self, tokens_used: int) -> None:
        """
        Records a task executed via Fireworks directly.
        """
        self.fireworks_tasks_completed += 1

    def record_escalation(self, reason: str, tokens_used: int, confidence: float = 0.0) -> None:
        """
        Records a task that was initially routed to local but escalated to Fireworks.
        """
        self.escalation_count += 1
        self.escalation_reasons[reason] = self.escalation_reasons.get(reason, 0) + 1
        self.fireworks_tasks_completed += 1
        
        # Track the low confidence score in the overall average and histogram
        self.confidence_values.append(confidence)
        self.total_confidence += confidence
        bucket = self._get_histogram_bucket(confidence)
        self.histogram[bucket] += 1

    def _get_histogram_bucket(self, val: float) -> str:
        if val <= 0.2:
            return "0.0-0.2"
        elif val <= 0.4:
            return "0.2-0.4"
        elif val <= 0.6:
            return "0.4-0.6"
        elif val <= 0.8:
            return "0.6-0.8"
        return "0.8-1.0"

    def get_summary(self) -> MetricsSummary:
        """
        Returns a read-only snapshot of current metrics.
        """
        avg_conf = (self.total_confidence / len(self.confidence_values)) if self.confidence_values else 0.0
        avg_time = (self.total_execution_time_ms / len(self.execution_times)) if self.execution_times else 0.0
        
        return MetricsSummary(
            local_tasks_completed=self.local_tasks_completed,
            fireworks_tasks_completed=self.fireworks_tasks_completed,
            estimated_tokens_saved=self.estimated_tokens_saved,
            local_success_count=self.local_success_count,
            average_confidence=avg_conf,
            confidence_histogram=self.histogram.copy(),
            escalation_count=self.escalation_count,
            escalation_reasons=self.escalation_reasons.copy(),
            average_handler_execution_time_ms=avg_time
        )

# Global tracker singleton instance
tracker = MetricsTracker()
