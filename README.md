# Horcrux

Horcrux is a backend application developed as part of the AMD Developer Hackathon Track 1.

## Project Structure

```text
Horcrux/
│
├── backend/
│   ├── app/
│   │   ├── api/             # API routes and business logic
│   │   ├── router/          # Endpoint router definitions
│   │   ├── classifiers/     # Classifier modules
│   │   ├── local_tools/     # Local agent/tool implementations
│   │   ├── fireworks/       # Fireworks AI integration
│   │   ├── services/        # Service layers
│   │   ├── utils/           # Utility functions (logger, etc.)
│   │   ├── models/          # Data models
│   │   ├── config.py        # Application configuration
│   │   └── main.py          # FastAPI server entrypoint
│   └── tests/               # Test suites
│
├── frontend/                # Frontend application placeholder
├── docker/                  # Docker build files and configurations
├── docs/                    # API and design documentation
├── scripts/                 # Utility scripts (deployment, migration, setup)
├── outputs/                 # Output artifacts directory
├── sample_input/            # Sample inputs for development/testing
├── sample_output/           # Sample output references
├── Dockerfile               # Container build file (placeholder)
├── docker-compose.yml       # Docker compose orchestration (placeholder)
├── requirements.txt         # Python project dependencies
├── README.md                # Project documentation
└── .gitignore               # Git ignored paths
```

## Getting Started

### Prerequisites

- Python 3.12+
- Virtual Environment tool (`venv`)

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   git clone <repository-url>
   cd Horcrux
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # On Windows (PowerShell):
   .venv\Scripts\Activate.ps1
   # On Linux/macOS:
   source .venv/bin/activate
   ```

3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Running the Application

To run the minimal development server:

```bash
uvicorn backend.app.main:app --reload
```

The application will be available at `http://localhost:8000`.

### API Endpoints

- **GET `/`**: Returns the health and status of the project.
  ```json
  {
      "project": "Horcrux",
      "status": "running"
  }
  ```
