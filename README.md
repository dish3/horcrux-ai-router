# Horcrux — Cost-Aware Hybrid AI Router

Think before you spend tokens.

Horcrux is an intelligent routing agent built for the AMD Developer Hackathon: ACT II (Track 1 — General-Purpose AI Agent). Instead of sending every prompt to a hosted LLM, Horcrux classifies each request, decides whether it can be answered locally with zero cloud cost, and only escalates to Fireworks AI when local execution isn't confident enough to trust.

The result: full task coverage across all 8 required categories, at a fraction of the token cost of a naive "always call the model" approach.

---

## Why this approach

Track 1 is scored in two stages:
1. **Accuracy gate (80%)** — fail this and nothing else matters.
2. **Token efficiency ranking** — among teams that pass the gate, fewer Fireworks tokens used = higher rank.

Local model/tool answers count fully toward accuracy and cost zero Fireworks tokens. Horcrux is built around that fact: route what can be handled locally, escalate only what genuinely needs it.

---

## Architecture

```text
                    Prompt
                       │
                       ▼
               Task Classifier
                       │
                       ▼
               Strategy Router
               /              \
       Local Dispatcher      Fireworks Client
              │                     │
       ┌──────┴──────┐              │
       │   Handlers   │             │
       │  Sentiment   │             │
       │  NER         │             │
       │  Summarize   │             │
       │  Math        │             │
       │  Factual     │             │
       └──────┬───────┘             │
              │                     │
       Confidence Score             │
              │                     │
       ┌──────┴───────┐             │
       │ ≥ 0.80?       │            │
       └──────┬────────┘            │
         Yes  │   No ────► Escalate ┘
              ▼
       Return Local Answer     Return Fireworks Answer
              │                     │
              └─────────┬───────────┘
                        ▼
                  results.json
                  + Metrics Log
```

### Routing strategy by category

| Category | Local Handler | Fallback |
| :--- | :--- | :--- |
| **Sentiment** | Keyword/lexicon classifier | Fireworks (low confidence) |
| **NER** | spaCy / regex extraction | Fireworks (no entities found) |
| **Summarization** | Local extractive summarizer | Fireworks (short/low-context input) |
| **Math Reasoning** | Regex + SymPy/Python evaluation | Fireworks (unparseable expression) |
| **Factual Knowledge** | Local structured knowledge base | Fireworks (fact not found) |
| **Code Debugging** | — | Fireworks (Direct API) |
| **Code Generation** | — | Fireworks (Direct API) |
| **Logic Puzzles** | — | Fireworks (Direct API) |

Each local handler returns a `handled` flag and a `confidence` score. If `handled=False` or `confidence < 0.80`, the router automatically escalates to Fireworks and logs the reason (`not_handled`, `low_confidence`, or `parse_failure`).

---

## Tech Stack

### Backend
* Python 3.11, FastAPI
* Custom local handlers (sentiment, NER, summarization, math, factual)
* Fireworks AI client for escalated tasks (models read from `ALLOWED_MODELS` env var, not hardcoded)
* pytest test suite

### Frontend
* React 18 + TypeScript + Vite
* Tailwind CSS
* Lucide icons
* Live dashboard, routing visualizer, and metrics views backed by real API responses

### Packaging
* Docker (`python:3.11-slim` base image)
* `linux/amd64` manifest, publicly pullable from GHCR
* No secrets baked into the image — `FIREWORKS_API_KEY` is injected at runtime

---

## Project Structure

```text
horcrux/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app setup & CORS config
│   │   ├── config.py            # Global project config
│   │   ├── pipeline.py          # CLI Entry point: reads tasks.json, writes results.json
│   │   ├── api/
│   │   │   └── router_endpoint.py # FastAPI /route and /metrics endpoints
│   │   ├── classifiers/
│   │   │   ├── heuristic_classifier.py
│   │   │   └── heuristic_difficulty.py
│   │   ├── models/
│   │   │   └── task.py
│   │   ├── local_tools/
│   │   │   ├── interfaces.py        # LocalResult contract (handled, confidence, answer)
│   │   │   ├── dispatcher.py        # Registers and routes to local handlers
│   │   │   ├── knowledge_base.py    # Structured facts for factual_knowledge tasks
│   │   │   └── handlers/
│   │   │       ├── sentiment.py
│   │   │       ├── ner.py
│   │   │       ├── summarization.py
│   │   │       ├── math.py
│   │   │       └── factual.py
│   │   ├── router/
│   │   │   ├── strategy_router.py   # Category → local/Fireworks mapping
│   │   │   ├── confidence.py        # Escalation threshold logic
│   │   │   └── registry.py          # Router strategy registration
│   │   ├── services/
│   │   │   ├── task_processor.py    # Orchestrates dispatch + escalation + logging
│   │   │   └── local_metrics.py     # Tracks tokens saved, confidence, latency
│   │   └── utils/
│   │       └── logger.py            # Logger utility
│   └── tests/
│       ├── test_local_routing.py
│       └── test_confidence_routing.py
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Overview, Dashboard, Routing Visualizer, Metrics
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── scripts/
│   └── verify_pipeline.py       # Local end-to-end pipeline check
├── sample_input/
├── sample_output/
├── Dockerfile
├── .dockerignore
├── pytest.ini
├── requirements.txt
└── README.md
```

---

## API Endpoints

The Horcrux FastAPI server exposes two key endpoints for integration and frontends:

### 1. Route Prompt
* **Endpoint**: `POST /api/route`
* **Content-Type**: `application/json`
* **Request Payload**:
```json
{
  "prompt": "What is 15% of 200?"
}
```
* **Response Payload**:
```json
{
  "task_id": "task_api_6e8a4d",
  "prompt": "What is 15% of 200?",
  "category": "math_reasoning",
  "route": "local",
  "handler": "MathHandler",
  "confidence": 1.0,
  "latency_ms": 1.25,
  "fireworks_model": "None",
  "tokens_used": 0,
  "tokens_saved": 250,
  "answer": "30",
  "escalated": false,
  "escalation_reason": "none"
}
```

### 2. System Metrics
* **Endpoint**: `GET /api/metrics`
* **Response Payload**:
```json
{
  "total_tasks": 6,
  "local_tasks": 4,
  "fireworks_tasks": 2,
  "token_savings": 800,
  "average_confidence": 0.93,
  "average_latency": 1.35,
  "escalation_count": 1
}
```

---

## Running Locally

### Backend Setup
1. Navigate to the backend directory and install Python dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
2. Configure environmental variables inside a `.env` file at the root directory:
   ```env
   FIREWORKS_API_KEY="your_fireworks_api_key_here"
   ALLOWED_MODELS="accounts/fireworks/models/minimax-m3"
   ```
3. To execute the CLI pipeline against standard input:
   ```bash
   python -m app.pipeline --input ../sample_input/tasks.json --output ../sample_output/results.json
   ```
4. To spin up the FastAPI service endpoint:
   ```bash
   uvicorn backend.app.main:app --reload --port 8000
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   npm install
   ```
2. Launch the Vite development server:
   ```bash
   npm run dev
   ```
3. Open your browser to `http://localhost:3000`. Use the simulator input on the Overview page to execute prompts, check the live trace flowchart on the Routing Visualizer page, and view graphs on the Metrics page.

### Running Tests
Execute unit tests covering local handler functions, classifier categorization, and confidence routing strategies:
```bash
pytest backend/tests
```

---

## Running with Docker

### Build the Image
```bash
docker build -t horcrux-agent .
```

### Run the Container
Inject your Fireworks API key and mount local data paths at runtime:
```bash
docker run --rm \
  -e FIREWORKS_API_KEY="your_key_here" \
  -v "$(pwd)/sample_input:/input" \
  -v "$(pwd)/sample_output:/output" \
  horcrux-agent
```
Predictions and execution statistics will write directly to `sample_output/results.json`.

---

## Screenshots & Visuals

Below are placeholder references mapping the polished dark-theme UI views:

### 1. Dashboard Overview
![Overview Workspace](https://raw.githubusercontent.com/dish3/horcrux-ai-router/main/docs/assets/overview.png)
*(Presents total saved tokens count, local dispatcher hit rates, average execution latencies, and interactive simulation run form.)*

### 2. Live Decision Path Trace
![Trace Visualizer](https://raw.githubusercontent.com/dish3/horcrux-ai-router/main/docs/assets/visualizer.png)
*(Dynamic workflow trace highlighting active prompt, category classification outputs, local confidence scores, and API fallbacks.)*

### 3. Analytics & Distribution
![Metrics Stats](https://raw.githubusercontent.com/dish3/horcrux-ai-router/main/docs/assets/metrics.png)
*(Distribution graphs mapping average local handler execution confidence, escalation counts, and tokens saved per task category.)*

---

## Contribution Guidelines

1. **Format & Linting**: Use standard Python formatting guidelines for backend files and ESLint rules for TypeScript code.
2. **Writing Tests**: Ensure any added dispatcher logic or custom handlers have accompanying unit tests in `backend/tests/` verifying accuracy and confidence scores.
3. **Submitting PRs**: Fork the repository, create a descriptive feature branch (e.g. `feat/caching-layer`), and issue a Pull Request to the main branch. Ensure all pytest unit checks pass before merging.

---

**Built For the AMD Developer Hackathon: ACT II — Track 1 (General-Purpose AI Agent)**
*Submitted via lablab.ai*