"""
Data Resolution Agent Service

FastAPI application with LangGraph-based agent for dynamic data source selection.
"""

import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api import router
from src.agents import run_example_queries


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler"""
    # Startup
    print("\n" + "=" * 80)
    print("Data Resolution Agent Service")
    print("=" * 80)
    print(f"Server starting...")
    print("=" * 80 + "\n")

    # Check for required environment variables
    if not os.getenv("ANTHROPIC_API_KEY"):
        print("   ANTHROPIC_API_KEY not set. Agent will not work without it.")
        print("   Set it with: export ANTHROPIC_API_KEY=your-api-key")

    # Optionally run example queries on startup (for testing)
    if os.getenv("RUN_EXAMPLES") == "true":
        print("   Running example queries...\n")
        await run_example_queries()

    yield

    print("\n\n   Shutting down gracefully...")

app = FastAPI(
    title="Data Resolution Agent",
    description="LangGraph-based agent for dynamic data source selection",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request, call_next):
    """Log all requests"""
    print(f"{request.method} {request.url.path}")
    response = await call_next(request)
    return response

app.include_router(router)

@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Data Resolution Agent",
        "version": "1.0.0",
        "description": "LangGraph-based agent for dynamic data source selection",
        "endpoints": {
            "health": "GET /api/v1/agentic-jobs/health",
            "agenticJob": "POST /api/v1/agentic-jobs",
            "simpleQuery": "POST /api/v1/agentic-jobs/simple",
        },
        "documentation": "See README.md for usage examples",
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
