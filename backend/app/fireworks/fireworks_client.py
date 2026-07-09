"""
Fireworks AI client wrapper utilizing the OpenAI SDK compatibility.
"""

import os
import time
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from openai import OpenAI

from backend.app.utils.logger import logger

# Load environment variables for local development
load_dotenv()

FIREWORKS_API_KEY: str = os.environ.get("FIREWORKS_API_KEY", "")
FIREWORKS_BASE_URL: str = os.environ.get(
    "FIREWORKS_BASE_URL", "https://api.fireworks.ai/inference/v1"
)
_default_models = "accounts/fireworks/models/minimax-m3"
ALLOWED_MODELS_STR: str = os.environ.get("ALLOWED_MODELS", _default_models)
ALLOWED_MODELS = [m.strip() for m in ALLOWED_MODELS_STR.split(",") if m.strip()]

# Initialize the OpenAI compatibility client
client = OpenAI(
    api_key=FIREWORKS_API_KEY,
    base_url=FIREWORKS_BASE_URL
)

def call_fireworks(prompt: str, category: Optional[str] = None, model: Optional[str] = None) -> Dict[str, Any]:
    """
    Calls the Fireworks AI completion API using OpenAI compatibility.

    Args:
        prompt: User input string.
        category: The task category classification (e.g. 'code_debugging', 'factual_knowledge').
        model: Optional model override. Defaults to the first model in ALLOWED_MODELS.

    Returns:
        A dictionary containing "answer", "tokens_used", and "model".
    """
    if not model:
        # Parse ALLOWED_MODELS from the environment variable at runtime
        allowed_models_env = os.environ.get("ALLOWED_MODELS", "")
        allowed_models = [m.strip() for m in allowed_models_env.split(",") if m.strip()]
        if allowed_models:
            model = allowed_models[0]
        else:
            # Fallback to module-level ALLOWED_MODELS parsed during import
            if ALLOWED_MODELS:
                model = ALLOWED_MODELS[0]
            else:
                raise ValueError("No model specified and ALLOWED_MODELS environment variable is not configured.")

    # Enforce token economy and output conciseness via system prompts
    if category in ("code_debugging", "code_generation"):
        system_prompt = (
            "You are a precise coding assistant. Return only the corrected/generated code "
            "with a single, one-line explanation below it. Do not include markdown tables, "
            "multiple alternative solutions, emojis, or lengthy reports."
        )
    elif category == "logic":
        system_prompt = (
            "You are a precise logical reasoning assistant. Give your final conclusion first in one sentence, "
            "then a brief 1-2 sentence justification. Do not show lengthy step-by-step exploration. "
            "No markdown tables, no multiple alternative solutions, and no emojis. One clear answer only."
        )
    else:
        system_prompt = (
            "You are a helpful and concise assistant. Answer the user prompt directly and concisely. "
            "Do not include markdown tables, multiple alternative solutions, emojis, or lengthy explanations "
            "unless the task explicitly asks for reasoning steps. One clear answer only."
        )

    # Determine max tokens based on task category
    if category == "logic":
        max_tokens = 900
    elif category == "math_reasoning":
        max_tokens = 400
    else:
        max_tokens = 200

    max_attempts = 2
    for attempt in range(1, max_attempts + 1):
        try:
            logger.info(f"Calling Fireworks API - Model: {model} (Attempt {attempt}/{max_attempts})")
            
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,  # Category-specific token budget
                temperature=0.0  # Greedy decoding for consistent evaluation accuracy
            )
            
            # Extract content and usage details safely
            message = response.choices[0].message
            raw_answer = message.content
            
            # Try to retrieve reasoning_content if content is empty (common for reasoning models)
            reasoning_content = getattr(message, 'reasoning_content', None)
            if not reasoning_content and hasattr(message, 'model_extra') and message.model_extra:
                reasoning_content = message.model_extra.get('reasoning_content')

            if raw_answer is None or not isinstance(raw_answer, str) or raw_answer.strip() == "":
                if reasoning_content and isinstance(reasoning_content, str) and reasoning_content.strip() != "":
                    # Extract last 1-2 sentences of reasoning_content as a best-effort answer
                    sentences = [s.strip() for s in reasoning_content.split(".") if s.strip()]
                    if sentences:
                        # Extract up to the last 2 sentences
                        best_effort_answer = ". ".join(sentences[-2:])
                        if not best_effort_answer.endswith("."):
                            best_effort_answer += "."
                        logger.warning(
                            f"Content is empty but reasoning_content is present for model {model}. "
                            f"Extracted best-effort answer: {best_effort_answer}"
                        )
                        answer = best_effort_answer
                    else:
                        answer = "Unable to generate a response for this task."
                else:
                    try:
                        raw_response_str = str(response.model_dump())
                    except Exception:
                        raw_response_str = str(response)
                    logger.error(
                        f"Fireworks API returned empty/None response content for model {model}. "
                        f"Full API response object: {raw_response_str}"
                    )
                    answer = "Unable to generate a response for this task."
            else:
                answer = raw_answer

            tokens_used = response.usage.total_tokens if response.usage else 0
            
            logger.info(f"API call succeeded. Tokens used: {tokens_used}")
            return {
                "answer": answer,
                "tokens_used": tokens_used,
                "model": model
            }
            
        except Exception as e:
            logger.warning(f"Attempt {attempt} failed calling Fireworks: {e}")
            if attempt == max_attempts:
                logger.error(f"All {max_attempts} attempts failed. Returning safe fallback.")
                return {
                    "answer": "This task processor is not implemented yet. (Fireworks API Connection Failure)",
                    "tokens_used": 0,
                    "model": model
                }
            time.sleep(1)  # Brief wait before retry
            
    # Safe fallback if loop somehow finishes without returning (should not happen)
    return {
        "answer": "This task processor is not implemented yet. (Unexpected state)",
        "tokens_used": 0,
        "model": model
    }
