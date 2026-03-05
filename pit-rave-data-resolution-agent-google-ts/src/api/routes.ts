import express, { Request, Response, Router } from 'express';
import { DataResolutionAgentService } from '$agents/DataResolutionAgent.service';
// import { DataResolutionAgentLangGraphService } from '$agents/DataResolutionAgentLangGraph.service';
import logger from '../logger';

const router = Router();
const agent = new DataResolutionAgentService();
// const agentLangGraph = new DataResolutionAgentLangGraphService();

router.post('/resolve', async (req: Request, res: Response) => {
	try {
		const { prompt } = req.body;

		if (!prompt || typeof prompt !== 'string') {
			return res.status(400).json({
				error: "Missing or invalid 'prompt' field in request body"
			});
		}

		logger.info({ prompt }, 'Received resolution request');

		// const result = await agent.resolveDataSources(prompt);
        const result = await agent.resolveDataSources(prompt);

		if (result.success) {
			res.json(result);
		} else {
			res.status(500).json({
				success: false,
				error: result.error
			});
		}
	} catch (error) {
		logger.error({ error }, 'Error processing resolution request');
		res.status(500).json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		});
	}
});

router.post('/resolve/tools', async (req: Request, res: Response) => {
	try {
		const { prompt } = req.body;

		if (!prompt || typeof prompt !== 'string') {
			return res.status(400).json({
				error: "Missing or invalid 'prompt' field in request body"
			});
		}

		logger.info({ prompt }, 'Received resolution request');

		// const result = await agent.resolveDataSources(prompt);
        const result = await agent.resolveDataSourcesWithTools(prompt);

		if (result.success) {
			res.json(result);
		} else {
			res.status(500).json({
				success: false,
				error: result.error
			});
		}
	} catch (error) {
		logger.error({ error }, 'Error processing resolution request');
		res.status(500).json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		});
	}
});

router.post('/resolve/sequential', async (req: Request, res: Response) => {
	try {
		const { prompt } = req.body;

		if (!prompt || typeof prompt !== 'string') {
			return res.status(400).json({
				error: "Missing or invalid 'prompt' field in request body"
			});
		}

		logger.info({ prompt }, 'Received resolution request');

		// const result = await agent.resolveDataSources(prompt);
        const result = await agent.resolveDataSourcesWithSequentialAgent(prompt);

		if (result.success) {
			res.json(result);
		} else {
			res.status(500).json({
				success: false,
				error: result.error
			});
		}
	} catch (error) {
		logger.error({ error }, 'Error processing resolution request');
		res.status(500).json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		});
	}
});

router.post('/resolve/custom', async (req: Request, res: Response) => {
	try {
		const { prompt } = req.body;

		if (!prompt || typeof prompt !== 'string') {
			return res.status(400).json({
				error: "Missing or invalid 'prompt' field in request body"
			});
		}

		logger.info({ prompt }, 'Received resolution request');

		// const result = await agent.resolveDataSources(prompt);
        const result = await agent.resolveDataSourcesCustomAgent(prompt);

		if (result.success) {
			res.json(result);
		} else {
			res.status(500).json({
				success: false,
				error: result.error
			});
		}
	} catch (error) {
		logger.error({ error }, 'Error processing resolution request');
		res.status(500).json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		});
	}
});

// router.post('/resolve/langgraph', async (req: Request, res: Response) => {
// 	try {
// 		const { prompt } = req.body;

// 		if (!prompt || typeof prompt !== 'string') {
// 			return res.status(400).json({
// 				error: "Missing or invalid 'prompt' field in request body"
// 			});
// 		}

// 		logger.info({ prompt }, 'Received resolution request');

// 		// const result = await agent.resolveDataSources(prompt);
//         const result = await agentLangGraph.resolveDataSources(prompt);

// 		if (result.success) {
// 			res.json(result);
// 		} else {
// 			res.status(500).json({
// 				success: false,
// 				error: result.error
// 			});
// 		}
// 	} catch (error) {
// 		logger.error({ error }, 'Error processing resolution request');
// 		res.status(500).json({
// 			success: false,
// 			error: error instanceof Error ? error.message : 'Unknown error'
// 		});
// 	}
// });

export default router;
