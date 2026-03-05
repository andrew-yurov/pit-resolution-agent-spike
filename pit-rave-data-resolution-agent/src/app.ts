import express from "express";
import agenticRoutes from "./api/routes";
import { runExampleQueries } from "./agents/dataResolutionAgent";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/api/v1", agenticRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    service: "Data Resolution Agent",
    version: "1.0.0",
    description: "LangGraph-based agent for dynamic data source selection",
    endpoints: {
      health: "GET /api/v1/agentic-jobs/health",
      agenticJob: "POST /api/v1/agentic-jobs",
      simpleQuery: "POST /api/v1/agentic-jobs/simple",
    },
    documentation: "See README.md for usage examples",
  });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("❌ Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// Start server
async function start() {
  // Check for required environment variables
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("⚠️  ANTHROPIC_API_KEY not set. Agent will not work without it.");
    console.warn("   Set it with: export ANTHROPIC_API_KEY=your-api-key");
  }

  app.listen(PORT, () => {
    console.log("\n" + "=".repeat(80));
    console.log("🚀 Data Resolution Agent Service");
    console.log("=".repeat(80));
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/v1/agentic-jobs/health`);
    console.log("=".repeat(80) + "\n");
  });

  // Optionally run example queries on startup (for testing)
  if (process.env.RUN_EXAMPLES === "true") {
    console.log("🧪 Running example queries...\n");
    await runExampleQueries();
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n\n👋 Shutting down gracefully...");
  process.exit(0);
});

// Start the application
start().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
