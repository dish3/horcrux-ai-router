"""
Result models representing the output data structure.
"""

from pydantic import BaseModel, Field

class Result(BaseModel):
    """
    Represents the output structure required by the judging system.
    """
    task_id: str = Field(..., description="Unique identifier of the task")
    answer: str = Field(..., description="The generated solution or answer for the task")
