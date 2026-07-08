"""
Task models representing the input data structure.
"""

from pydantic import BaseModel, Field
from typing import Optional

class Task(BaseModel):
    """
    Represents a task input provided by the judging system.
    """
    task_id: str = Field(..., description="Unique identifier of the task")
    prompt: str = Field(..., description="Task prompt containing instruction and input context")
    category: Optional[str] = Field(None, description="Task category, if provided")

    model_config = {
        "extra": "allow"
    }
