"""
Confidence routing decision module to determine escalation.
"""

from backend.app.local_tools.interfaces import LocalResult
from backend.app.utils.logger import logger

def should_escalate(result: LocalResult, threshold: float) -> tuple[bool, str]:
    """
    Evaluates whether a local execution result should escalate to Fireworks,
    returning a boolean flag and a structured escalation reason string.

    Args:
        result: The LocalResult output from the local handler.
        threshold: The target confidence threshold.

    Returns:
        A tuple of (should_escalate, reason).
        Reasons can be: 'not_handled', 'low_confidence', 'parse_failure', or 'none'.
    """
    # 1. Unhandled check
    if not result.handled:
        logger.info("Local handler returned handled=False. Triggering escalation.")
        return True, "not_handled"

    # 2. Parse failure check (empty answer value on handled success)
    if not result.answer or result.answer.strip() == "":
        logger.warning("Local handler returned empty or blank answer. Triggering escalation.")
        return True, "parse_failure"

    # 3. Confidence threshold check
    if result.confidence < threshold:
        logger.info(
            f"Local result confidence ({result.confidence:.2f}) is below "
            f"threshold ({threshold:.2f}). Triggering escalation."
        )
        return True, "low_confidence"

    # Fully resolved locally
    return False, "none"
