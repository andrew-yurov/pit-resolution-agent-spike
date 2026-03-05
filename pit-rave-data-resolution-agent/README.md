# Data Resolution Agent

A simple example service demonstrating an LangGraph-based agentic system for dynamic data source selection.

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

- **Data Resolution Agent** (`src/agents/dataResolutionAgent.ts`): LangGraph ReAct agent that orchestrates the decision-making process
- **Data Source Tools** (`src/tools/dataSourceTools.ts`): Hardcoded tools for:
  - Searching data sources
  - Getting source details
  - Fetching sample data
  - Comparing sources
- **API Routes** (`src/api/routes.ts`): Express endpoints for job submission
- **Main App** (`src/app.ts`): Express server setup

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

- Node.js 20+
- Anthropic API key (Claude)

### Installation

```bash
cd pit-rave-data-resolution-agent
npm install
```

### Environment Variables

Create a `.env` file:

```bash
ANTHROPIC_API_KEY=your-anthropic-api-key-here
PORT=3000
RUN_EXAMPLES=false  # Set to 'true' to run examples on startup
```

### Development

```bash
# Run in development mode with auto-reload
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start
```

### Docker

```bash
# Build image
docker build -t pit-rave-data-resolution-agent .

# Run container
docker run -p 3000:3000 \
  -e ANTHROPIC_API_KEY=your-key \
  pit-rave-data-resolution-agent
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
curl http://localhost:3000/api/v1/agentic-jobs/health

# Submit job
curl -X POST http://localhost:3000/api/v1/agentic-jobs \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Get web traffic analytics for Amazon"}'
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

Each tool is a `DynamicStructuredTool` with:
- **Name**: Unique identifier
- **Description**: What the tool does (helps agent decide when to use it)
- **Schema**: Zod schema for input validation
- **Function**: The actual implementation

Example:
```typescript
const searchDataSourcesTool = new DynamicStructuredTool({
  name: "search_data_sources",
  description: "Search for available data sources...",
  schema: z.object({
    query: z.string().describe("Natural language query...")
  }),
  func: async ({ query }) => {
    // Search logic here
    return JSON.stringify(results);
  }
});
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

## Technology Stack

- **LangGraph**: Agent framework with ReAct pattern
- **LangChain**: Tool abstractions and message handling
- **Anthropic Claude**: LLM for reasoning
- **Express**: Web server
- **TypeScript**: Type-safe development
- **Zod**: Schema validation

## License

ISC
