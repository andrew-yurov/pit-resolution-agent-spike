import express, { Request, Response, Router } from 'express';
import { DataResolutionAgentLangGraphService } from '$agents/DataResolutionAgentLangGraph.service';
import logger from '../logger';

const router = Router();
const agent = new DataResolutionAgentLangGraphService();


router.post('/resolve', async (req: Request, res: Response) => {
	try {
		const { prompt } = req.body;

		if (!prompt || typeof prompt !== 'string') {
			return res.status(400).json({
				error: "Missing or invalid 'prompt' field in request body"
			});
		}

		logger.info({ prompt }, 'Received resolution request');

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

router.post('/resolve/multi-agent', async (req: Request, res: Response) => {
	try {
		const { prompt } = req.body;

		if (!prompt || typeof prompt !== 'string') {
			return res.status(400).json({
				error: "Missing or invalid 'prompt' field in request body"
			});
		}

		logger.info({ prompt }, 'Received resolution request');

        const result = await agent.resolveDataSourcesWithMultiAgent(prompt);

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


export default router;
