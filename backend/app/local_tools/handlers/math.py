"""
Local math calculation execution handler.
"""

import re
import math
from backend.app.models.task import Task
from backend.app.local_tools.interfaces import LocalHandler, LocalResult
from backend.app.utils.logger import logger

def _format_value(val: float) -> str:
    """
    Formats a numeric value: returns a string representation of an integer if the
    number is an int or a float representing a whole number, else formats as a 2-decimal float.
    """
    if isinstance(val, int):
        return str(val)
    if isinstance(val, float):
        return str(int(val)) if val.is_integer() else f"{val:.2f}"
    return str(val)

class MathHandler(LocalHandler):
    """
    Parses and solves basic arithmetic, averages, ratios, fractions, and percentage queries.
    """

    def can_handle(self, task: Task, category: str) -> bool:
        """
        MathHandler handles tasks classified as 'math_reasoning'.
        """
        return category == "math_reasoning"

    def execute(self, task: Task) -> LocalResult:
        """
        Processes the prompt and returns a LocalResult containing the answer,
        or handled=False if it cannot parse/evaluate the expression.
        """
        prompt = task.prompt.lower()
        logger.info(f"MathHandler evaluating prompt: '{prompt}'")

        try:
            # 1. Check for simple averages or mean
            if "average of" in prompt or "mean of" in prompt:
                numbers = [float(x) for x in re.findall(r'\b\d+(?:\.\d+)?\b', prompt)]
                if numbers:
                    avg = sum(numbers) / len(numbers)
                    answer = _format_value(avg)
                    return LocalResult(answer=answer, confidence=1.0, handled=True)

            # 2. Check for ratio representation (e.g., "ratio of 120 to 80")
            ratio_match = re.search(r'ratio\s+of\s+(\d+)\s+to\s+(\d+)', prompt)
            if ratio_match:
                val1 = int(ratio_match.group(1))
                val2 = int(ratio_match.group(2))
                gcd = math.gcd(val1, val2)
                answer = f"{val1 // gcd}:{val2 // gcd}"
                return LocalResult(answer=answer, confidence=1.0, handled=True)

            # 3. Check for percentage subtraction/left word problems
            # E.g., "has 120 apples. If they sell 25%, how many apples are left?"
            pct_left_match = re.search(
                r'(?:has|have|contains)\s+(\d+)\s+.*(?:sell|lost|spent|spent|give\s+away|minus|remove|subtract)\s+(\d+(?:\.\d+)?)\s*%',
                prompt
            )
            if pct_left_match:
                total = float(pct_left_match.group(1))
                percentage = float(pct_left_match.group(2))
                val = total * (1.0 - percentage / 100.0)
                answer = _format_value(val)
                return LocalResult(answer=answer, confidence=1.0, handled=True)

            # 4. Check for percentage addition/increase word problems
            # E.g., "has 100 dollars. If they gain 15%, how much do they have?"
            pct_gain_match = re.search(
                r'(?:has|have|contains)\s+(\d+)\s+.*(?:gain|increase|add|win|bonus|markup)\s+(\d+(?:\.\d+)?)\s*%',
                prompt
            )
            if pct_gain_match:
                total = float(pct_gain_match.group(1))
                percentage = float(pct_gain_match.group(2))
                val = total * (1.0 + percentage / 100.0)
                answer = _format_value(val)
                return LocalResult(answer=answer, confidence=1.0, handled=True)

            # 5. Check for percentage of (e.g. "what is 25% of 120")
            pct_of_match = re.search(r'(\d+(?:\.\d+)?)\s*%\s+(?:of\s+)?(\d+(?:\.\d+)?)', prompt)
            if pct_of_match:
                percentage = float(pct_of_match.group(1))
                total = float(pct_of_match.group(2))
                val = total * (percentage / 100.0)
                answer = _format_value(val)
                return LocalResult(answer=answer, confidence=1.0, handled=True)

            # 6. Basic arithmetic and fractions (including parentheses)
            # Replace verbal fractions/terms with mathematical equivalent
            expr = prompt
            expr = expr.replace("half", "0.5")
            expr = expr.replace("a quarter", "0.25")
            expr = expr.replace("one quarter", "0.25")
            expr = expr.replace("three quarters", "0.75")
            expr = expr.replace("three fourths", "0.75")

            # Extract any valid arithmetic substring (contains digits, operators +, -, *, /, %, parentheses, space, dot)
            # E.g. "calculate (10 + 20) * 2 / 3" -> "(10 + 20) * 2 / 3"
            # Allow math expressions inside the string
            math_chars = re.findall(r'[\d\.\+\-\*/\(\)\s%]+', expr)
            # Find the longest continuous expression with at least one operator
            candidates = [c.strip() for c in math_chars if re.search(r'[\+\-\*/%]', c) and re.search(r'\d', c)]
            
            if candidates:
                longest_candidate = max(candidates, key=len)
                
                # Replace percentages: e.g. "25%" -> "(25/100)"
                cleaned_expr = re.sub(r'(\d+(?:\.\d+)?)\s*%', r'(\1/100)', longest_candidate)
                
                # Clean multiple spaces or hanging operators
                cleaned_expr = cleaned_expr.strip(" +-*/%")
                
                # Safe evaluation using Python eval under scope restrictions
                # Limit globals/locals to safe functions to prevent injection
                safe_dict = {
                    "__builtins__": None,
                    "abs": abs,
                    "round": round,
                    "min": min,
                    "max": max
                }
                
                logger.info(f"MathHandler evaluating arithmetic expression: '{cleaned_expr}'")
                val = eval(cleaned_expr, safe_dict, {})
                if val is not None:
                    answer = _format_value(val)
                    return LocalResult(answer=answer, confidence=1.0, handled=True)

        except Exception as e:
            logger.error(f"MathHandler execution failed for prompt '{prompt}': {e}")

        logger.warning(f"MathHandler was unable to handle prompt: '{prompt}'")
        return LocalResult(
            answer="",
            confidence=0.0,
            handled=False
        )
