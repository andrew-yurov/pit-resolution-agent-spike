# Data Resolution Agent (Google ADK)

A simple example service demonstrating a Google ADK-based agentic system for dynamic data source selection, implemented in Python with Google's Gemini model.

## Overview

This service implements a **Data Resolution Agent** that uses Google's function calling capabilities to:
1. Parse natural language user prompts
2. Discover and search available data sources
3. Compare options based on cost, latency, and capabilities
4. Select the best data source(s) for the task
5. Return recommendations with reasoning

## Architecture

```
User Prompt → API → Data Resolution Agent → Tools → Response
                          ↓
                  (Google Function Calling)
                          ↓
              Thought → Function Call → Result
```

### Components

- **Data Resolution Agent** (`src/agents/data_resolution_agent.py`): Google Gemini agent with function calling
- **Data Source Tools** (`src/tools/data_source_tools.py`): Hardcoded tools defined as function declarations:
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
- Google API key (for Gemini)

### Installation

```bash
cd pit-rave-data-resolution-agent-google

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file:

```bash
GOOGLE_API_KEY=your-google-api-key-here
PORT=8000
RUN_EXAMPLES=false  # Set to 'true' to run examples on startup
```

### Get Google API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy and use in your `.env` file

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
docker build -t pit-rave-data-resolution-agent-google .

# Run container
docker run -p 8000:8000 \
  -e GOOGLE_API_KEY=your-key \
  pit-rave-data-resolution-agent-google
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
  "timestamp": "2026-01-06T12:00:00.000Z"
}
```

### GET /api/v1/agentic-jobs/health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "Data Resolution Agent (Google ADK)",
  "timestamp": "2026-01-06T12:00:00.000Z"
}
```

### POST /api/v1/agentic-jobs/simple

Simple query endpoint without function calling (for testing).

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
  "timestamp": "2026-01-06T12:00:00.000Z"
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

### Google Function Calling

The agent uses Google's function calling feature:

1. **Define Functions**: Tools are defined as `FunctionDeclaration` objects
2. **Model Receives Prompt**: Gemini model receives user prompt with available functions
3. **Model Decides**: Model decides which function(s) to call
4. **Execute Functions**: Functions are executed with provided arguments
5. **Return Results**: Results are sent back to the model
6. **Model Responds**: Model formulates final response based on function results

Example flow:
```
User: "I need employee sentiment data for Tesla"
  ↓
Model: Calls search_data_sources(query="employee sentiment")
  ↓
Function returns: {"found": true, "sources": [{"id": "glassdoor", ...}]}
  ↓
Model: Calls get_data_source_details(source_id="glassdoor")
  ↓
Function returns: {"success": true, "source": {...}}
  ↓
Model: "Based on my search, Glassdoor is the best data source..."
```

### Function Declaration Format

Each tool is defined using Google's format:

```python
{
    "name": "search_data_sources",
    "description": "Search for available data sources...",
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Natural language query..."
            }
        },
        "required": ["query"]
    }
}
```

## Project Structure

```
pit-rave-data-resolution-agent-google/
├── app.py                              # FastAPI entry point
├── requirements.txt                    # Dependencies
├── pyproject.toml                      # Project metadata
├── Dockerfile                          # Docker configuration
├── .env.example                        # Environment variables template
├── README.md                           # This file
└── src/
    ├── __init__.py
    ├── agents/
    │   ├── __init__.py
    │   └── data_resolution_agent.py    # Google Gemini agent
    ├── tools/
    │   ├── __init__.py
    │   └── data_source_tools.py        # Function declarations + implementations
    └── api/
        ├── __init__.py
        └── routes.py                   # FastAPI routes
```

## Key Differences from LangGraph Version

| Aspect | LangGraph | Google ADK |
|--------|-----------|------------|
| **Framework** | LangChain/LangGraph | Google Generative AI |
| **Model** | Claude (Anthropic) | Gemini (Google) |
| **Agent Pattern** | ReAct (createReactAgent) | Function Calling |
| **Tool Definition** | @tool decorator | FunctionDeclaration |
| **Execution** | Automatic tool execution | Manual function call loop |
| **API Key** | ANTHROPIC_API_KEY | GOOGLE_API_KEY |

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
- [ ] Integrate with existing pit-rave-orchestrator
- [ ] Add HITL (Human-in-the-Loop) workflow approval
- [ ] Implement caching for repeated queries
- [ ] Add observability (OpenTelemetry, logging)
- [ ] Add comprehensive tests (pytest)
- [ ] Implement retry logic for API failures
- [ ] Add rate limiting and quota management

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

- **Google Generative AI**: Gemini 2.0 Flash with function calling
- **FastAPI**: Modern web framework
- **Uvicorn**: ASGI server
- **Pydantic**: Data validation
- **Python 3.11+**: Modern Python features

## Comparison of All Three Implementations

| Feature | TypeScript/LangGraph | Python/LangGraph | Python/Google ADK |
|---------|---------------------|------------------|-------------------|
| **Language** | TypeScript | Python | Python |
| **Framework** | Express | FastAPI | FastAPI |
| **LLM Provider** | Anthropic Claude | Anthropic Claude | Google Gemini |
| **Agent Library** | @langchain/langgraph | langgraph | google-generativeai |
| **Tool Pattern** | DynamicStructuredTool | @tool decorator | FunctionDeclaration |
| **Async Pattern** | Promise-based | async/await | async/await |
| **Type Safety** | TypeScript + Zod | Pydantic | Pydantic |
| **Port** | 3000 | 8000 | 8000 |
| **Model** | claude-3-5-sonnet | claude-3-5-sonnet | gemini-2.0-flash-exp |

All three versions implement the same core functionality with the same 4 data sources and tools!

## Troubleshooting

### API Key Issues

If you see `GOOGLE_API_KEY environment variable must be set`:
```bash
export GOOGLE_API_KEY=your-api-key-here
```

### Import Errors

Make sure you've installed all dependencies:
```bash
pip install -r requirements.txt
```

### Model Quota Limits

Google Gemini has rate limits. If you hit them, wait a minute and try again, or upgrade your quota in Google Cloud Console.

## License

ISC
