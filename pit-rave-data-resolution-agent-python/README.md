# Data Resolution Agent (Python)

A simple example service demonstrating a LangGraph-based agentic system for dynamic data source selection, implemented in Python.

## Overview

This service implements a **Data Resolution Agent** that uses the ReAct (Reasoning + Acting) pattern to:
1. Parse natural language user prompts
2. Discover and search available data sources
3. Compare options based on cost, latency, and capabilities
4. Select the best data source(s) for the task
5. Return recommendations with reasoning

## Architecture

```
User Prompt → API → Data Resolution Agent → Tools → Response
                          ↓
                    (ReAct Loop)
                          ↓
                  Thought → Action → Observation
```

### Components

- **Data Resolution Agent** (`src/agents/data_resolution_agent.py`): LangGraph ReAct agent that orchestrates the decision-making process
- **Data Source Tools** (`src/tools/data_source_tools.py`): Hardcoded tools for:
  - Searching data sources
  - Getting source details
  - Fetching sample data
  - Comparing sources
- **API Routes** (`src/api/routes.py`): FastAPI endpoints for job submission
- **Main App** (`app.py`): FastAPI server setup

## Hardcoded Data Sources

The agent has knowledge of these data sources (mock implementations):

| Source | Capabilities | Cost | Latency |
|--------|-------------|------|---------|
| **Glassdoor** | Employee sentiment, reviews, ratings, culture | Medium | Medium |
| **SimilarWeb** | Web traffic, audience, competitors, engagement | High | Fast |
| **LinkedIn** | Employee data, company info, hiring trends | Medium | Fast |
| **Crunchbase** | Funding, investors, acquisitions, valuations | High | Fast |

## Setup

### Prerequisites

- Python 3.11+
- Anthropic API key (Claude)

### Installation

```bash
cd pit-rave-data-resolution-agent-python

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file:

```bash
ANTHROPIC_API_KEY=your-anthropic-api-key-here
PORT=8000
RUN_EXAMPLES=false  # Set to 'true' to run examples on startup
```

### Development

```bash
# Run with auto-reload
uvicorn app:app --reload --port 8000

# Or run directly
python app.py
```

### Docker

```bash
# Build image
docker build -t pit-rave-data-resolution-agent-python .

# Run container
docker run -p 8000:8000 \
  -e ANTHROPIC_API_KEY=your-key \
  pit-rave-data-resolution-agent-python
```

## API Endpoints

### POST /api/v1/agentic-jobs

Submit a natural language prompt for data source resolution.

**Request:**
```json
{
  "prompt": "I need employee sentiment data for Tesla"
}
```

**Response:**
```json
{
  "job_id": "job_1704499200000_abc123",
  "status": "completed",
  "prompt": "I need employee sentiment data for Tesla",
  "selected_sources": ["glassdoor"],
  "reasoning": "Based on your request for employee sentiment data...",
  "timestamp": "2026-01-05T12:00:00.000Z"
}
```

### GET /api/v1/agentic-jobs/health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "Data Resolution Agent",
  "timestamp": "2026-01-05T12:00:00.000Z"
}
```

### POST /api/v1/agentic-jobs/simple

Simple query endpoint without full agent loop (for testing).

**Request:**
```json
{
  "question": "What data sources are available?"
}
```

**Response:**
```json
{
  "question": "What data sources are available?",
  "answer": "...",
  "timestamp": "2026-01-05T12:00:00.000Z"
}
```

## Example Usage

### Using curl

```bash
# Health check
curl http://localhost:8000/api/v1/agentic-jobs/health

# Submit job
curl -X POST http://localhost:8000/api/v1/agentic-jobs \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Get web traffic analytics for Amazon"}'
```

### Using Python

```python
import httpx
import asyncio

async def test_agent():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/api/v1/agentic-jobs",
            json={"prompt": "I need employee sentiment data for Tesla"}
        )
        print(response.json())

asyncio.run(test_agent())
```

### Example Prompts

The agent can handle various types of requests:

```json
{"prompt": "I need employee sentiment data for Tesla"}
// → Selects: Glassdoor

{"prompt": "Get web traffic analytics for Amazon and its competitors"}
// → Selects: SimilarWeb

{"prompt": "Find funding information for early-stage AI startups"}
// → Selects: Crunchbase

{"prompt": "Compare employee satisfaction between Google and Microsoft"}
// → Selects: Glassdoor
```

## How It Works

### ReAct Loop

The agent follows this pattern:

1. **Thought**: "I need to find data sources for employee sentiment"
2. **Action**: Call `search_data_sources` tool
3. **Observation**: "Found Glassdoor with sentiment capabilities"
4. **Thought**: "Glassdoor looks appropriate, let me get details"
5. **Action**: Call `get_data_source_details` tool
6. **Observation**: "Glassdoor has medium cost and latency"
7. **Thought**: "This is the best option"
8. **Final Response**: Returns recommendation with reasoning

### Tool Execution

Each tool is decorated with `@tool` and includes:
- **Name**: Derived from function name
- **Description**: From docstring (helps agent decide when to use it)
- **Parameters**: Type-hinted function arguments
- **Implementation**: The actual function logic

Example:
```python
@tool
def search_data_sources(query: str) -> str:
    """Search for available data sources that match specific capabilities.
    
    Args:
        query: Natural language query describing the data needed
    
    Returns:
        JSON string with search results
    """
    # Search logic here
    return json.dumps(results)
```

## Project Structure

```
pit-rave-data-resolution-agent-python/
├── app.py                          # FastAPI application entry point
├── requirements.txt                # Python dependencies
├── pyproject.toml                  # Project metadata
├── Dockerfile                      # Docker configuration
├── .env.example                    # Environment variables template
├── README.md                       # This file
└── src/
    ├── __init__.py
    ├── agents/
    │   ├── __init__.py
    │   └── data_resolution_agent.py  # LangGraph ReAct agent
    ├── tools/
    │   ├── __init__.py
    │   └── data_source_tools.py      # Hardcoded tools
    └── api/
        ├── __init__.py
        └── routes.py                  # FastAPI routes
```

## Integration with Pit-Rave

This service can be integrated into the larger Pit-Rave architecture:

1. **API Gateway**: Add route `/api/v1/agentic-jobs` to main REST API
2. **Semantic Router**: Route complex requests to this service
3. **Existing Adapters**: Connect tool responses to actual adapter implementations
4. **Task System**: Generate workflow DAGs from agent decisions

### Next Steps for Production

- [ ] Replace mock data with real adapter integration
- [ ] Add semantic search (embeddings) for better data source matching
- [ ] Implement tool registry database
- [ ] Add MCP (Model Context Protocol) server support
- [ ] Integrate with existing pit-rave-orchestrator
- [ ] Add HITL (Human-in-the-Loop) workflow approval
- [ ] Implement caching for repeated queries
- [ ] Add observability (OpenTelemetry, logging)
- [ ] Add comprehensive tests (pytest)

## Development

### Code Formatting

```bash
# Install dev dependencies
pip install black ruff

# Format code
black .

# Lint code
ruff check .
```

### Testing

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests (when implemented)
pytest
```

## Technology Stack

- **LangGraph**: Agent framework with ReAct pattern
- **LangChain**: Tool abstractions and message handling
- **Anthropic Claude**: LLM for reasoning
- **FastAPI**: Modern web framework
- **Uvicorn**: ASGI server
- **Pydantic**: Data validation
- **Python 3.11+**: Modern Python features

## Comparison with TypeScript Version

This Python implementation is functionally equivalent to the TypeScript version:

| Feature | TypeScript | Python |
|---------|-----------|--------|
| Framework | Express | FastAPI |
| Agent | LangGraph | LangGraph |
| LLM | Claude (Anthropic) | Claude (Anthropic) |
| Tools | DynamicStructuredTool | @tool decorator |
| Async | Promise-based | async/await |
| Type Safety | TypeScript | Pydantic |

## License

ISC
