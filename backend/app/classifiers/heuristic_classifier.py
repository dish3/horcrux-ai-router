"""
Heuristic task classifier based on keyword and regular expression matching.
"""

import re
from backend.app.classifiers.base import BaseClassifier
from backend.app.models.task import Task
from backend.app.utils.logger import logger

class HeuristicClassifier(BaseClassifier):
    """
    Classifies tasks into one of 8 categories using regex and keyword heuristics.
    """

    def classify(self, task: Task) -> str:
        """
        Classifies a task prompt based on keyword and regex heuristics.

        Args:
            task: The Task input object.

        Returns:
            The classified category name as a lowercase string.
        """
        prompt = task.prompt.lower()

        # 1. Sentiment
        if any(kw in prompt for kw in ["sentiment", "classify", "positive or negative", "movie review", "review of", "opinion"]):
            logger.info(f"Classified task {task.task_id} as 'sentiment'")
            return "sentiment"

        # 2. NER (Named Entity Recognition)
        if any(kw in prompt for kw in ["extract", "named entities", "entities and their types"]):
            logger.info(f"Classified task {task.task_id} as 'ner'")
            return "ner"

        # 3. Summarization
        if any(kw in prompt for kw in ["summarize", "summarise", "one sentence", "summary"]):
            logger.info(f"Classified task {task.task_id} as 'summarization'")
            return "summarization"

        # 4. Code Debugging
        if any(kw in prompt for kw in ["bug", "fix this function", "find and fix"]):
            logger.info(f"Classified task {task.task_id} as 'code_debugging'")
            return "code_debugging"

        # 5. Code Generation
        if any(kw in prompt for kw in ["write a function", "write a python function"]):
            logger.info(f"Classified task {task.task_id} as 'code_generation'")
            return "code_generation"

        # 6. Logic
        if any(kw in prompt for kw in ["each own", "who owns", "logic puzzle", "puzzle-style"]):
            logger.info(f"Classified task {task.task_id} as 'logic'")
            return "logic"

        # 7. Mathematical Reasoning
        # Contains "%", "how many", arithmetic operators + digits, or digits + math words
        has_digit = bool(re.search(r'\d+', prompt))
        has_math_operator = bool(re.search(r'[\+\-\*/\(\)=]', prompt))
        math_words = [
            "%", "how many", "solve", "calculate", "sum", "product", "math",
            "equation", "add", "subtract", "multiply", "divide", "ratio", "fraction",
            "average", "mean", "median", "mode", "percentage"
        ]
        if "%" in prompt or "how many" in prompt or (has_digit and (has_math_operator or any(w in prompt for w in math_words))):
            logger.info(f"Classified task {task.task_id} as 'math_reasoning'")
            return "math_reasoning"

        # 8. Default: factual_knowledge
        logger.info(f"Classified task {task.task_id} as 'factual_knowledge' (default)")
        return "factual_knowledge"
