# Data Resolution Agent - Google ADK (TypeScript)

AI-powered Data Resolution Agent using Google's Generative AI (Gemini 2.0 Flash) with function calling capabilities. This TypeScript implementation follows the pit-rave project conventions and patterns.

## Overview

This agent helps users discover and select appropriate data sources for their analytical needs through natural language interaction. It implements a ReAct-like pattern using Google's native function calling.

### Key Features

- 🤖 **Natural Language Processing**: Understands user queries in plain English
- 🔍 **Data Source Discovery**: Searches across 10 hardcoded data sources
- ⚖️ **Smart Comparison**: Compares sources based on cost, latency, and capabilities
- 📊 **Mock Data Integration**: Fetches sample data for demonstration
- 🎯 **Intelligent Selection**: Recommends the best data source(s) for the task

### Available Data Sources

1. **Glassdoor** - Employee sentiment, reviews, ratings, culture insights
2. **GitHub** - Repository analytics, code activity, developer engagement
3. **Semrush** - SEO analytics, keyword rankings, organic traffic
4. **SimilarWeb** - Web traffic analytics, audience demographics
5. **Pathmatics** - Digital advertising intelligence, ad spend tracking
6. **Snowflake** - Data warehouse queries, custom datasets
7. **StackOverflow** - Developer insights, technology trends
8. **Sensor Tower** - Mobile app analytics, downloads, revenue
9. **Revelio Labs** - Workforce intelligence, hiring trends
10. **Aura Intelligence** - Global workforce data, labor market analytics

## Architecture

```
src/
├── agents/
│   └── DataResolutionAgent.service.ts  # Main agent service class
├── tools/
│   └── dataSourceTools.ts              # Hardcoded data source tools
├── api/
│   └── routes.ts                       # Express API routes
├── config.ts                           # Configuration management
├── logger.ts                           # Pino logger setup
└── app.ts                              # Express server entry point
```

## Prerequisites

- Node.js 20+
- TypeScript 5.5+
- **Option 1**: Google API Key (for Gemini 2.0 Flash via API)
- **Option 2**: Google Cloud Project with Vertex AI enabled (recommended for production)

## Installation

1. Install dependencies:
```bash
cd pit-rave-data-resolution-agent-google-ts
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

### Option 1: Using Google AI API Key (Development)

Edit `.env` and add your Google API key:
```env
GOOGLE_API_KEY=your_google_api_key_here
PORT=3006
NODE_ENV=development
LOG_LEVEL=info
```

### Option 2: Using Vertex AI (Production - Recommended by Google)

Edit `.env` for Vertex AI:
```env
# Comment out or remove GOOGLE_API_KEY
# GOOGLE_API_KEY=

# Enable Vertex AI
GOOGLE_GENAI_USE_VERTEXAI=1
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1

PORT=3006
NODE_ENV=production
LOG_LEVEL=info
```

**Why Vertex AI?**
- Enterprise-grade security and compliance
- Better rate limits and quotas
- Integration with Google Cloud services
- Advanced monitoring and logging
- Service accounts for authentication

**Note**: Vertex AI support requires additional setup with `@google-cloud/vertexai` package and Google Cloud authentication.

## Usage

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm start
```

### API Endpoints

#### Health Check
```bash
GET /health
```

#### Resolve Data Sources
```bash
POST /api/resolve
Content-Type: application/json

{
  "prompt": "I need employee sentiment data for Tesla"
}
```

**Response:**
```json
{
  "success": true,
  "selected_sources": ["glassdoor"],
  "reasoning": "For employee sentiment data, Glassdoor is the best choice...",
  "messages": [...]
}
```

#### Simple Query (No Tools)
```bash
POST /api/query
Content-Type: application/json

{
  "question": "What is the capital of France?"
}
```

#### Run Example Queries
```bash
POST /api/examples
```

## Example Queries

### Employee Sentiment
```typescript
const result = await agent.resolveDataSources(
  "I need employee sentiment data for Tesla"
);
// Returns: Glassdoor as the primary source
```

### Web Traffic Analytics
```typescript
const result = await agent.resolveDataSources(
  "Get me web traffic analytics for Amazon and its competitors"
);
// Returns: SimilarWeb for comprehensive traffic data
```

### Workforce Intelligence
```typescript
const result = await agent.resolveDataSources(
  "I want global workforce data and salary benchmarks"
);
// Returns: Aura Intelligence or Revelio Labs
```

## How It Works

### ReAct Pattern with Google ADK

1. **User Query**: Natural language prompt describing data needs
2. **Agent Reasoning**: Gemini 2.0 Flash analyzes the query
3. **Function Calling**: Agent calls tools to search and compare sources
4. **Iteration**: Continues calling functions until decision is made
5. **Final Response**: Returns selected sources with reasoning

### Tool Functions

- `search_data_sources(query)` - Searches for matching data sources
- `get_data_source_details(sourceId)` - Gets detailed source information
- `fetch_sample_data(company, sourceId, dataType?)` - Fetches mock data
- `compare_data_sources(sourceIds, criteria)` - Compares multiple sources

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GOOGLE_API_KEY` | Google AI API key | - | Yes (if not using Vertex AI) |
| `GOOGLE_GENAI_USE_VERTEXAI` | Enable Vertex AI mode | `0` | No |
| `GOOGLE_CLOUD_PROJECT` | GCP Project ID | - | Yes (if using Vertex AI) |
| `GOOGLE_CLOUD_LOCATION` | GCP region (e.g., us-central1) | - | Yes (if using Vertex AI) |
| `PORT` | Server port | `3006` | No |
| `NODE_ENV` | Environment | `development` | No |
| `LOG_LEVEL` | Logging level | `info` | No |
| `DATADOG_API_KEY` | Datadog API key (optional) | - | No |
| `SERVICE_NAME` | Service identifier | `pit-rave-data-resolution-agent-google-ts` | No |

## Logging

Uses Pino for structured logging:
- **Development**: Pretty-printed, colorized logs
- **Production**: JSON logs with optional Datadog transport

## Error Handling

- Graceful shutdown on SIGTERM/SIGINT
- Automatic retry for transient errors
- Comprehensive error logging
- User-friendly error messages

## Project Conventions

This service follows pit-rave project patterns:

- **Class-based services**: Agent implemented as `DataResolutionAgentService` class
- **TypeScript strict mode**: Full type safety
- **ES Modules**: Using `import`/`export` syntax
- **Pino logging**: Structured logging with optional Datadog transport
- **Path aliases**: Using `$agents/*`, `$tools/*`, `$api/*` for imports
- **Configuration management**: Centralized `config.ts` with validation
- **Express middleware**: JSON parsing, error handling, graceful shutdown

## Development

### Type Safety

All code is fully typed with TypeScript strict mode. The agent service provides:

```typescript
interface ResolutionResult {
  success: boolean;
  messages: AgentMessage[];
  selected_sources: string[];
  reasoning: string;
  error?: string;
}
```

### Adding New Data Sources

1. Add to `DATA_SOURCES` array in `src/tools/dataSourceTools.ts`
2. Add mock data to `mockDataMap` in `fetchSampleData()`
3. Add module_key to `knownSources` in `DataResolutionAgent.service.ts`

## Testing

```bash
# Run tests (when implemented)
npm test

# Test with curl
curl -X POST http://localhost:3006/api/resolve \
  -H "Content-Type: application/json" \
  -d '{"prompt":"I need employee sentiment data for Tesla"}'
```

## Deployment

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3006
CMD ["npm", "start"]
```

### Environment Setup

Ensure `GOOGLE_API_KEY` is set in production environment.

## License

Private - Bain & Company

## Related Services

- `pit-rave-orchestrator` - Main orchestration service
- `pit-rave-rest` - REST API backend
- `pit-rave-notifier` - Real-time notification service
- `pit-rave-data-resolution-agent-google` - Python version using Google ADK
