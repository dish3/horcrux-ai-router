"""
Service for formatting and writing evaluation results.
"""

from pathlib import Path
from typing import List, Union

from backend.app.models.result import Result
from backend.app.utils.file_utils import write_json_file
from backend.app.utils.logger import logger

class ResultWriteError(Exception):
    """Exception raised when result writing fails."""
    pass

def write_results(results: List[Result], file_path: Union[str, Path] = "/output/results.json") -> None:
    """
    Serializes and writes task execution results to the specified file.

    Args:
        results: List of execution Result objects.
        file_path: Target path to write results.json.

    Raises:
        ResultWriteError: If writing output file fails.
    """
    path = Path(file_path)
    logger.info(f"Preparing to write {len(results)} results to {path.absolute()}")

    try:
        # Convert Pydantic models to dictionaries
        serialized_results = [result.model_dump() for result in results]
        
        # Write using file_utils
        write_json_file(path, serialized_results, indent=4)
        logger.info("Successfully saved evaluation results.")
    except Exception as e:
        raise ResultWriteError(f"Failed to write results JSON to {path}: {e}")
