const startTime = Date.now();
import 'dotenv/config';
import express from 'express';
import logger from './logger';
import routes from './api/routes';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/health', (req, res) => {
	res.json({
		status: 'healthy',
		service: 'pit-rave-data-resolution-agent-google-ts',
		timestamp: new Date().toISOString()
	});
});

app.use('/api', routes);

app.get('/', (req, res) => {
	res.json({
		service: 'Data Resolution Agent (Google ADK - TypeScript)',
		version: '0.1.0',
		status: 'running',
		description: "AI-powered agent for discovering and resolving data sources using Google's Generative AI"
	});
});

const port = 'APPLICATION_PORT' in process.env ? parseInt(process.env.APPLICATION_PORT as string) : 3006;

const server = app.listen(port, () => {
	logger.info({ port }, 'Data Resolution Agent (Google ADK - TypeScript) is running');
	logger.info(`API endpoints:`);
	logger.info(`  GET  /health          - Health check`);
	logger.info(`  POST /api/resolve     - Resolve data sources`);
	logger.info(`  POST /api/query       - Simple query (no tools)`);
	logger.info(`  POST /api/examples    - Run example queries`);
});

server.on('error', (error: any) => {
	if (error.code === 'EADDRINUSE') {
		logger.error({ port }, 'Port is already in use. Try killing the process:');
		logger.error(`Run: lsof -ti:${port} | xargs kill -9`);
		process.exit(1);
	}
	throw error;
});

process.on('SIGINT', async () => {
	console.log('\nGracefully shutting down from SIGINT (Ctrl-C)');
	process.exit(0);
});

process.on('uncaughtException', (error) => {
	logger.error({ error }, 'Uncaught exception');
	process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
	logger.error({ reason, promise }, 'Unhandled rejection');
	process.exit(1);
});
