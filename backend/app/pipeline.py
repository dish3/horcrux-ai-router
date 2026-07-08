"""
Pipeline runner script to execute the Horcrux evaluation pipeline.

Can be run directly via:
    python -m backend.app.pipeline
"""

import sys
import argparse
from typing import List

from backend.app.services.task_loader import load_tasks, TaskLoadError, TaskValidationError
from backend.app.services.task_processor import process_task
from backend.app.services.result_writer import write_results, ResultWriteError
from backend.app.utils.logger import logger

def run_pipeline(input_path: str, output_path: str) -> bool:
    """
    Orchestrates the loading, processing, and writing of tasks.

    Args:
        input_path: Path to tasks.json.
        output_path: Path to results.json.

    Returns:
        True if the pipeline completed successfully, False otherwise.
    """
    logger.info("Initializing Horcrux Evaluation Pipeline...")
    logger.info(f"Input path: {input_path}")
    logger.info(f"Output path: {output_path}")

    # 1. Load tasks
    try:
        tasks = load_tasks(input_path)
    except TaskLoadError as e:
        logger.error(f"Pipeline aborted. Input load failure: {e}")
        return False
    except TaskValidationError as e:
        logger.error(f"Pipeline aborted. Task validation failure: {e}")
        return False
    except Exception as e:
        logger.error(f"Pipeline aborted. Unexpected loading error: {e}")
        return False

    # 2. Process tasks
    results = []
    for task in tasks:
        try:
            result = process_task(task)
            results.append(result)
        except Exception as e:
            logger.error(f"Error processing task {task.task_id}: {e}")
            continue

    # 3. Write results
    try:
        write_results(results, output_path)
    except ResultWriteError as e:
        logger.error(f"Pipeline aborted. Results write failure: {e}")
        return False
    except Exception as e:
        logger.error(f"Pipeline aborted. Unexpected writing error: {e}")
        return False

    logger.info(f"Pipeline executed successfully. Processed {len(results)} tasks.")
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Horcrux Evaluation Pipeline.")
    parser.add_argument(
        "--input", 
        type=str, 
        default="/input/tasks.json",
        help="Path to tasks.json input file"
    )
    parser.add_argument(
        "--output", 
        type=str, 
        default="/output/results.json",
        help="Path to results.json output file"
    )

    args = parser.parse_args()
    
    success = run_pipeline(args.input, args.output)
    if not success:
        sys.exit(1)
