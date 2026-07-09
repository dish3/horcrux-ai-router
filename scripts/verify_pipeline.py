"""
Verification script to run the pipeline and log routing decisions.
"""

import sys
from pathlib import Path

# Add project root to path to allow direct execution
sys.path.append(str(Path(__file__).parent.parent))

from backend.app.pipeline import run_pipeline
from backend.app.utils.file_utils import read_json_file

def main():
    input_path = "sample_input/tasks.json"
    output_path = "sample_output/results.json"
    
    print("=" * 80)
    print("RUNNING HORCRUX PIPELINE VERIFICATION")
    print("=" * 80)
    
    success = run_pipeline(input_path, output_path)
    
    if not success:
        print("\nPipeline failed!")
        sys.exit(1)
        
    print("\n" + "=" * 80)
    print("GENERATED RESULTS:")
    print("=" * 80)
    try:
        results = read_json_file(output_path)
        for res in results:
            print(f"Task ID: {res['task_id']} | Answer: {res['answer']}")
    except Exception as e:
        print(f"Error reading generated results: {e}")
        
if __name__ == "__main__":
    main()
