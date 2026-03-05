"""
API Routes for Data Resolution Agent (Google ADK)
"""

import time
import random
import string
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..agents import DataResolutionAgent


# Request/Response models
class AgenticJobRequest(BaseModel):
    """Request model for agentic job submission"""

    prompt: str = Field(..., description="Natural language prompt describing data needs")


class SimpleQueryRequest(BaseModel):
    """Request model for simple query"""

    question: str = Field(..., description="Question to ask the agent")


class AgenticJobResponse(BaseModel):
    """Response model for agentic job"""

    job_id: str
    status: str
    prompt: str
    selected_sources: list[str]
    reasoning: str
    timestamp: str


class SimpleQueryResponse(BaseModel):
    """Response model for simple query"""

    question: str
    answer: str
    timestamp: str


class HealthResponse(BaseModel):
    """Response model for health check"""

    status: str
    service: str
    timestamp: str


# Router
router = APIRouter(prefix="/api/v1", tags=["agentic-jobs"])

# Singleton agent instance
_agent: Optional[DataResolutionAgent] = None


def get_agent() -> DataResolutionAgent:
    """Get or create the agent instance"""
    global _agent
    if _agent is None:
        _agent = DataResolutionAgent()
    return _agent


@router.post("/agentic-jobs", response_model=AgenticJobResponse)
async def create_agentic_job(request: AgenticJobRequest):
    """Submit a natural language prompt for data source resolution.

    Args:
        request: AgenticJobRequest with prompt

    Returns:
        AgenticJobResponse with selected sources and reasoning
    """
    try:
        print(f"\n📨 Received agentic job request: '{request.prompt}'")

        # Process the prompt with the agent
        result = await get_agent().resolve_data_sources(request.prompt)

        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail={"error": "Agent processing failed", "message": result.get("error")},
            )

        # Generate a simple job ID
        timestamp = int(time.time() * 1000)
        random_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=9))
        job_id = f"job_{timestamp}_{random_id}"

        # Return the result
        return AgenticJobResponse(
            job_id=job_id,
            status="completed",
            prompt=request.prompt,
            selected_sources=result["selected_sources"],
            reasoning=result["reasoning"],
            timestamp=datetime.utcnow().isoformat() + "Z",
        )

    except HTTPException:
        raise
    except Exception as error:
        print(f"❌ Error processing agentic job: {error}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Internal server error", "message": str(error)},
        )


@router.get("/agentic-jobs/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        service="Data Resolution Agent (Google ADK)",
        timestamp=datetime.utcnow().isoformat() + "Z",
    )


@router.post("/agentic-jobs/simple", response_model=SimpleQueryResponse)
async def simple_query(request: SimpleQueryRequest):
    """Simpler endpoint for testing without full agent"""
    try:
        answer = await get_agent().simple_query(request.question)

        return SimpleQueryResponse(
            question=request.question,
            answer=answer,
            timestamp=datetime.utcnow().isoformat() + "Z",
        )

    except Exception as error:
        print(f"❌ Error in simple query: {error}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Internal server error", "message": str(error)},
        )
