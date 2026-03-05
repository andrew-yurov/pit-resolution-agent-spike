import express, { Request, Response } from "express";
import { DataResolutionAgent } from "../agents/dataResolutionAgent";

const router = express.Router();

// Initialize the agent (singleton)
let agent: DataResolutionAgent | null = null;

function getAgent(): DataResolutionAgent {
  if (!agent) {
    agent = new DataResolutionAgent();
  }
  return agent;
}

/**
 * POST /api/v1/agentic-jobs
 * 
 * Request body:
 * {
 *   "prompt": "I need employee sentiment data for Tesla"
 * }
 * 
 * Response:
 * {
 *   "job_id": "uuid",
 *   "status": "completed",
 *   "prompt": "...",
 *   "selected_sources": ["glassdoor"],
 *   "reasoning": "...",
 *   "timestamp": "2026-01-05T..."
 * }
 */
router.post("/agentic-jobs", async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        error: "Invalid request",
        message: "Field 'prompt' is required and must be a string",
      });
    }

    console.log(`\n📨 Received agentic job request: "${prompt}"`);

    // Process the prompt with the agent
    const result = await getAgent().resolveDataSources(prompt);

    if (!result.success) {
      return res.status(500).json({
        error: "Agent processing failed",
        message: result.error,
      });
    }

    // Generate a simple job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Return the result
    return res.status(200).json({
      job_id: jobId,
      status: "completed",
      prompt,
      selected_sources: result.selectedSources,
      reasoning: result.reasoning,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error processing agentic job:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/v1/agentic-jobs/health
 * Health check endpoint
 */
router.get("/agentic-jobs/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    service: "Data Resolution Agent",
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/v1/agentic-jobs/simple
 * Simpler endpoint for testing without full agent
 */
router.post("/agentic-jobs/simple", async (req: Request, res: Response) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== "string") {
      return res.status(400).json({
        error: "Invalid request",
        message: "Field 'question' is required and must be a string",
      });
    }

    const answer = await getAgent().simpleQuery(question);

    return res.status(200).json({
      question,
      answer,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in simple query:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
