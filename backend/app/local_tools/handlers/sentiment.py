"""
Rule-based sentiment analysis handler.
"""

from typing import Set
from backend.app.models.task import Task
from backend.app.local_tools.interfaces import LocalHandler, LocalResult
from backend.app.utils.logger import logger

class SentimentHandler(LocalHandler):
    """
    Classifies task sentiment as Positive, Negative, or Neutral using a keyword lexicon.
    """

    def __init__(self) -> None:
        self.positive_words: Set[str] = {
            "great", "love", "excellent", "fantastic", "amazing", "wonderful", 
            "good", "beautiful", "happy", "awesome", "perfect", "enjoy", "pleasant", "delight"
        }
        self.negative_words: Set[str] = {
            "bad", "terrible", "hate", "awful", "horrible", "poor", "worse", 
            "worst", "dislike", "angry", "sad", "failure", "bug", "broken", "annoy"
        }

    def can_handle(self, task: Task, category: str) -> bool:
        """
        SentimentHandler handles tasks classified as 'sentiment'.
        """
        return category == "sentiment"

    def execute(self, task: Task) -> LocalResult:
        """
        Classifies the sentiment. Returns ONLY 'Positive', 'Negative', or 'Neutral' in a LocalResult.
        """
        prompt = task.prompt.lower()
        
        # Tokenize and normalize words
        words = [w.strip(".,!?\"'()").lower() for w in prompt.split()]
        
        # Count keywords
        pos_count = sum(1 for w in words if w in self.positive_words)
        neg_count = sum(1 for w in words if w in self.negative_words)
        
        if pos_count > neg_count:
            result = "Positive"
        elif neg_count > pos_count:
            result = "Negative"
        else:
            result = "Neutral"

        logger.info(f"SentimentHandler finished. Result: {result}")
        return LocalResult(answer=result, confidence=1.0)
