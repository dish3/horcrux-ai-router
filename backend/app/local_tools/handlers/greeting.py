"""
Local greeting execution handler.
"""

from backend.app.models.task import Task
from backend.app.local_tools.interfaces import LocalHandler, LocalResult
from backend.app.utils.logger import logger

class GreetingHandler(LocalHandler):
    """
    Answers standard greetings locally with friendly pre-defined responses.
    """

    def can_handle(self, task: Task, category: str) -> bool:
        """
        GreetingHandler handles tasks classified as 'greeting'.
        """
        return category == "greeting"

    def execute(self, task: Task) -> LocalResult:
        """
        Processes standard greetings and returns a friendly local greeting response.
        """
        prompt = task.prompt.lower().strip()
        logger.info(f"GreetingHandler executing for prompt: '{prompt}'")

        if "morning" in prompt:
            answer = "Good morning! How can I assist you with the Horcrux AI router today?"
        elif "afternoon" in prompt:
            answer = "Good afternoon! How can I assist you with the Horcrux AI router today?"
        elif "evening" in prompt:
            answer = "Good evening! How can I assist you with the Horcrux AI router today?"
        else:
            answer = "Hello! How can I assist you with the Horcrux AI router today?"

        return LocalResult(
            answer=answer,
            confidence=1.0,
            handled=True
        )
