# Horcrux — Cost-Aware Hybrid AI Router https://horcrux-ai-router-7brw.vercel.app/

**Think before you spend tokens.**

Horcrux is an intelligent routing agent built for the **AMD Developer Hackathon: ACT II (Track 1 — General-Purpose AI Agent)**. Instead of sending every prompt to a hosted LLM, Horcrux classifies each request, decides whether it can be answered locally at zero cloud cost, and only escalates to Fireworks AI when local execution isn't confident enough to trust.

Supports all eight required task categories through a hybrid combination of local handlers and Fireworks AI — at a fraction of the token cost of a naive "always call the model" approach.

---

## Why this approach

Track 1 is scored in two stages:

1. **Accuracy gate (80%)** — fail this and nothing else matters.
2. **Token efficiency ranking** — among teams that pass the gate, fewer Fireworks tokens used = higher rank.

Local model/tool answers count fully toward accuracy and cost zero Fireworks tokens. Horcrux is built around that fact: route what can be handled locally, escalate only what genuinely needs it.

---

## Key Features

- Hybrid AI routing across all 8 required task categories
- Automatic task classification (no manual category selection required)
- Confidence-based local execution with automatic Fireworks fallback
- Zero-token local inference for sentiment, NER, summarization, math, and factual queries
- Live metrics dashboard (local vs. Fireworks split, token savings, confidence, latency)
- Interactive routing visualizer showing the real decision path per prompt
- Docker packaging — publicly pullable, no manual setup required
- REST API for programmatic access

---

## Architecture

```
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
       │  `>= 0.80?`   │            │
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
|---|---|---|
| Sentiment | Keyword/lexicon classifier | Fireworks (low confidence) |
| NER | spaCy / regex extraction | Fireworks (no entities found) |
| Summarization | Local extractive summarizer | Fireworks (short/low-context input) |
| Math Reasoning | Regex + Python expression evaluation | Fireworks (unparseable expression) |
| Factual Knowledge | Local structured knowledge base | Fireworks (fact not found) |
| Code Debugging | — | Fireworks (direct API) |
| Code Generation | — | Fireworks (direct API) |
| Logic Puzzles | — | Fireworks (direct API) |

Each local handler returns a `handled` flag and a `confidence` score. If `handled=False` or `confidence < 0.80`, the router automatically escalates to Fireworks and logs the reason (`not_handled`, `low_confidence`, or `parse_failure`).

---

## Tech Stack

**Backend**
- Python 3.11, FastAPI
- Custom local handlers (sentiment, NER, summarization, math, factual)
- Fireworks AI client for escalated tasks (models read from `ALLOWED_MODELS` env var, not hardcoded)
- pytest test suite

**Frontend**
- React 18 + TypeScript + Vite
- Tailwind CSS
- Lucide icons
- Live dashboard, routing visualizer, and metrics views backed by real API responses

**Packaging**
- Docker (`python:3.11-slim` base image)
- `linux/amd64` manifest, publicly pullable from GHCR
- No secrets baked into the image — `FIREWORKS_API_KEY` is injected at runtime

---

## Project Structure

```
horcrux/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app setup & CORS config
│   │   ├── config.py                # Global project config
│   │   ├── pipeline.py              # CLI entry point: reads tasks.json, writes results.json
│   │   ├── api/
│   │   │   └── router_endpoint.py   # FastAPI /route and /metrics endpoints
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
│   │   ├── App.tsx                  # Overview, Dashboard, Routing Visualizer, Metrics
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── scripts/
│   └── verify_pipeline.py           # Local end-to-end pipeline check
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

### 1. Route Prompt

**Endpoint:** `POST /api/route`
**Content-Type:** `application/json`

**Request:**
```json
{
  "prompt": "What is 15% of 200?"
}
```

**Example response:**
```json
{
  "task_id": "task_api_6e8a4d",
  "prompt": "What is 15% of 200?",
  "category": "math_reasoning",
  "route": "local",
  "handler": "MathHandler",
  "confidence": 1.0,
  "latency_ms": 1.25,
  "fireworks_model": null,
  "tokens_used": 0,
  "tokens_saved": 250,
  "answer": "30",
  "escalated": false,
  "escalation_reason": "none"
}
```

### 2. System Metrics

**Endpoint:** `GET /api/metrics`

**Example response:**
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

## Sample Routing Results

| Prompt | Category | Route |
|---|---|---|
| What is 15% of 200? | Math Reasoning | Local |
| Classify the sentiment of this review | Sentiment | Local |
| Extract named entities from this text | NER | Local |
| What is the speed of light? | Factual Knowledge | Local |
| Fix this Python bug | Code Debugging | Fireworks |
| Write a Fibonacci function | Code Generation | Fireworks |
| Solve this logic puzzle | Logic | Fireworks |

---

## Running Locally

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Configure environment variables inside a `.env` file at the project root:

```
FIREWORKS_API_KEY="your_fireworks_api_key_here"
FIREWORKS_BASE_URL="https://api.fireworks.ai/inference/v1"
ALLOWED_MODELS="accounts/fireworks/models/minimax-m3"
```

Run the CLI pipeline against a task file:

```bash
python -m backend.app.pipeline --input sample_input/tasks.json --output sample_output/results.json
```

Start the FastAPI service:

```bash
uvicorn backend.app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. Use the simulator on the Overview page to run prompts, watch the live routing path on the Routing Visualizer page, and view live stats on the Metrics page.

---

## Running Tests

```bash
pytest backend/tests
```

---

## Running with Docker

### Pull the published image

```bash
docker pull ghcr.io/dish3/horcrux-agent:latest
```

### Or build locally

```bash
docker build -t horcrux-agent .
```

### Run the container

```bash
docker run --rm \
  -v "$(pwd)/sample_input:/input" \
  -v "$(pwd)/sample_output:/output" \
  -e FIREWORKS_API_KEY="your_key_here" \
  -e FIREWORKS_BASE_URL="https://api.fireworks.ai/inference/v1" \
  -e ALLOWED_MODELS="accounts/fireworks/models/minimax-m3" \
  horcrux-agent
```

Predictions and execution logs are written to `sample_output/results.json`.

---

## Screenshots

> Replace these placeholders with actual screenshots before final submission.

**Overview & Simulator**
_Total savings, local hit rate, average latency, and the interactive prompt simulator._

**Routing Visualizer**
_Live trace of the classifier → handler → confidence → decision path for the last executed prompt._

**Metrics**
_Confidence distribution, local vs. Fireworks split, and token savings over time._

---

## Contribution Guidelines

- **Formatting:** Standard Python formatting for backend files; ESLint rules for TypeScript/React code.
- **Testing:** Any new dispatcher logic or handler must include accompanying unit tests in `backend/tests/`.
- **Pull requests:** Fork the repository, create a descriptive feature branch (e.g. `feat/new-handler`), and open a PR against `main`. Ensure all pytest checks pass before merging.

---

## License

MIT License

---

Built for the **AMD Developer Hackathon: ACT II — Track 1 (General-Purpose AI Agent)**, submitted via [lablab.ai](https://lablab.ai).
