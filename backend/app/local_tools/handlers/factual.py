"""
Factual knowledge execution handler.
"""

from backend.app.models.task import Task
from backend.app.local_tools.interfaces import LocalHandler, LocalResult
from backend.app.local_tools.knowledge_base import FACTUAL_KNOWLEDGE_BASE
from backend.app.utils.logger import logger

class FactualHandler(LocalHandler):
    """
    Answers basic factual questions locally from a structured dictionary database.
    """

    def can_handle(self, task: Task, category: str) -> bool:
        """
        FactualHandler handles tasks classified as 'factual_knowledge'.
        """
        return category == "factual_knowledge"

    def execute(self, task: Task) -> LocalResult:
        """
        Looks up facts and returns answers, or returns success=False if not found.
        """
        prompt = task.prompt.lower()
        
        for key, value in FACTUAL_KNOWLEDGE_BASE.items():
            if key in prompt:
                logger.info(f"FactualHandler successfully matched fact key: '{key}'")
                return LocalResult(answer=value, confidence=1.0, handled=True)
        
        logger.warning(f"FactualHandler found no local match for prompt: '{prompt}'")
        return LocalResult(
            answer="",
            confidence=0.0,
            handled=False
        )
