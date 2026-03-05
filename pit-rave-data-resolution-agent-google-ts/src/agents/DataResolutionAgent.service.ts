import { GoogleGenAI, GenerateContentResponse, Type, createUserContent } from '@google/genai';
import type { Part, Content } from '@google/genai';
import { Role, AgentMessage, ResolutionResult, Trace } from './IDataResolutionAgentService.js';
import {
	getAllDataSources,
	getAllDataSourcesTool,
	TOOL_DECLARATIONS,
	TOOL_FUNCTIONS
} from '../tools/dataSourceTools.js';
import { FunctionTool, LlmAgent, InMemoryRunner, isFinalResponse, SequentialAgent } from '@google/adk';
import { z } from 'zod';
import logger from 'src/logger.js';

const systemInstruction = `
            You are a Data Resolution Agent.

            Your task:
            1. Analyze the user's request.
            2. Identify the underlying information needs (e.g. interest, adoption, behavior, sentiment).
            3. Semantically match those needs against the descriptions and capabilities of the available data sources.
            4. Select ALL data sources that provide DISTINCT and COMPLEMENTARY signals needed to fully answer the request.

            Rules:
            - Do NOT stop at the first best match.
            - If multiple sources cover different aspects of the same question (e.g. community interest vs real usage),
            you MUST include all relevant sources.
            - Prefer triangulation over single-source answers.
            - Only exclude a source if it is clearly redundant or irrelevant.

            Output:
            - Return a list of selected source names.
            - Provide a concise explanation of what signal each source contributes.

            Available Data Sources:
            ${getAllDataSources()}
            `.trim();

const systemInstructionWithTools = `
            You are a Data Resolution Agent.

            Your task:
            1. Analyze the user's request.
            2. Retrieve all available data sources using the provided tool.
            3. Semantically match those needs against the descriptions and capabilities of the available data sources.
            4. Select ALL data sources that provide DISTINCT and COMPLEMENTARY signals needed to fully answer the request.

            Rules:
            - Do NOT stop at the first best match.
            - If multiple sources cover different aspects of the same question (e.g. community interest vs real usage),
            you MUST include all relevant sources.
            - Prefer triangulation over single-source answers.
            - Only exclude a source if it is clearly redundant or irrelevant.

            Output:
            - Return a list of selected source names.
            - Provide a concise explanation of what signal each source contributes.
            `.trim();

const systemInstructionSequential = `
            You are a Data Retrieval Agent.
            
            Your ONLY task: Call the getAllDataSourcesTool tool and return the complete list of available data sources.
            
            CRITICAL RULES:
            - Do NOT try to answer the user's question
            - Do NOT analyze what data sources are relevant
            - ALWAYS call the getAllDataSourcesTool and return ALL sources
            - Completely IGNORE the content of the user's query - it's not for you
            
            Simply retrieve and return all available data sources. The next agent will handle the user's actual question.
            `.trim();

const systemInstructionOutputAgent = `
            You are a Data Resolution Agent.

            Your task:
            1. Analyze the user's request and the available data sources from the previous agent.
            2. Identify the underlying information needs (e.g. interest, adoption, behavior, sentiment).
            3. Semantically match those needs against the descriptions and capabilities of the available data sources.
            4. Select ALL data sources that provide DISTINCT and COMPLEMENTARY signals needed to fully answer the request.

            Rules:
            - Do NOT stop at the first best match.
            - If multiple sources cover different aspects of the same question (e.g. community interest vs real usage),
            you MUST include all relevant sources.
            - Prefer triangulation over single-source answers.
            - Only exclude a source if it is clearly redundant or irrelevant.

            Output:
            - Return a list of selected source names.
            - Provide a concise explanation of what signal each source contributes.
            `.trim();

export class DataResolutionAgentService {
	private googleGenAi: GoogleGenAI;
	private googleAdkAgent: LlmAgent;
	private adkAgentWithTools: LlmAgent;
	private retrievalAgent: LlmAgent;
	private outputAgent: LlmAgent;
	private sequentialAgent: SequentialAgent;
	private APP_NAME = 'rave-agent';
	private USER_ID = 'test-user';
	private SESSION_ID = crypto.randomUUID();

	constructor() {
		const googleAdkAgent = new LlmAgent({
			name: 'data_resolution_agent',
			model: 'gemini-2.5-flash',
			description:
				'Agent that analyzes user requests and selects the most appropriate data sources to fulfill those requests.',
			instruction: systemInstruction,
			outputSchema: {
				type: Type.OBJECT,
				properties: {
					selectedSources: {
						type: Type.ARRAY,
						items: { type: Type.STRING },
						description: 'Array of module_key strings for the selected data sources'
					},
					reasoning: {
						type: Type.STRING,
						description: 'Detailed explanation of why these sources were selected'
					}
				},
				required: ['selectedSources', 'reasoning']
			},
			generateContentConfig: {
				temperature: 0
			},
			outputKey: 'data_resolution_output',
			disallowTransferToParent: true,
			disallowTransferToPeers: true
		});

		const adkAgentWithTools = new LlmAgent({
			name: 'data_resolution_agent',
			model: 'gemini-2.5-flash',
			description:
				'Agent that analyzes user requests and selects the most appropriate data sources to fulfill those requests.',
			instruction: systemInstructionWithTools,
			generateContentConfig: {
				temperature: 0
			},
			outputKey: 'data_resolution_output',
			tools: [getAllDataSourcesTool]
		});

		const retrievalAgent = new LlmAgent({
			name: 'data_retrieval_agent',
			model: 'gemini-2.5-flash',
			description: 'Agent that retrieves all available data sources using the provided tool.',
			instruction: systemInstructionSequential,
			generateContentConfig: {
				temperature: 0
			},
			outputKey: 'data_retrieval_output',
			tools: [getAllDataSourcesTool]
		});

		const outputAgent = new LlmAgent({
			name: 'data_output_agent',
			model: 'gemini-2.5-flash',
			description:
				'Agent that analyzes user requests and selects the most appropriate data sources to fulfill those requests.',
			instruction: systemInstructionOutputAgent,
			outputSchema: {
				type: Type.OBJECT,
				properties: {
					selectedSources: {
						type: Type.ARRAY,
						items: { type: Type.STRING },
						description: 'Array of module_key strings for the selected data sources'
					},
					reasoning: {
						type: Type.STRING,
						description: 'Detailed explanation of why these sources were selected'
					}
				},
				required: ['selectedSources', 'reasoning']
			},
			generateContentConfig: {
				temperature: 0
			},
			outputKey: 'data_resolution_output',
			disallowTransferToParent: true,
			disallowTransferToPeers: true
		});

		const sequentialAgent = new SequentialAgent({
			name: 'simple_sequential_agent',
			subAgents: [retrievalAgent, outputAgent]
		});

		this.googleGenAi = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
		this.googleAdkAgent = googleAdkAgent;
		this.adkAgentWithTools = adkAgentWithTools;
		this.retrievalAgent = retrievalAgent;
		this.outputAgent = outputAgent;
		this.sequentialAgent = sequentialAgent;
	}

	private async runAgent(
		runner: InMemoryRunner,
		agent: LlmAgent,
		query: string
	): Promise<{ finalResponseContent: string; trace: Trace }> {
		const trace: Trace = {
			requestId: crypto.randomUUID(),
			startedAt: Date.now(),
			prompt: query,
			model: agent.model as string
		};

		const message = createUserContent(query);

		let finalResponseContent = 'No final response received.';
		for await (const event of runner.runAsync({
			userId: this.USER_ID,
			sessionId: this.SESSION_ID,
			newMessage: message
		})) {
			if (isFinalResponse(event) && event.content?.parts?.length) {
				finalResponseContent = event.content.parts.map((part: Part) => part.text ?? '').join('');

				try {
					JSON.parse(finalResponseContent);
					trace.schemaValid = true;
				} catch (e) {
					// trace.parseError = finalResponseContent.slice(0, 300);
					// throw new Error(`Invalid JSON from model: ${finalResponseContent}`);
					logger.warn(`Invalid JSON from model: ${finalResponseContent}`);
				}

				trace.responseId = event.id;
				trace.finishedAt = Date.now();
				trace.duration = trace.finishedAt - trace.startedAt;

				const usage = event.usageMetadata;
				trace.usageMetadata = {
					candidatesTokenCount: usage?.candidatesTokenCount,
					candidatesTokensDetails: usage?.candidatesTokensDetails,
					promptTokenCount: usage?.promptTokenCount,
					promptTokensDetails: usage?.promptTokensDetails,
					thoughtsTokenCount: usage?.thoughtsTokenCount,
					toolUsePromptTokenCount: usage?.toolUsePromptTokenCount,
					toolUsePromptTokensDetails: usage?.toolUsePromptTokensDetails,
					totalTokenCount: usage?.totalTokenCount,
					trafficType: usage?.trafficType
				};

				trace.finishReason = event.finishReason;
			}
		}
		logger.info(`<<< Agent '${agent.name}' Response: ${finalResponseContent}`);

		const currentSession = await runner.sessionService.getSession({
			appName: this.APP_NAME,
			userId: this.USER_ID,
			sessionId: this.SESSION_ID
		});
		if (!currentSession) {
			logger.warn(`--- Session not found: ${this.SESSION_ID} ---`);
			throw new Error('Session not found after agent run.');
		}
		const storedOutput = currentSession.state[agent.outputKey!];

		logger.info(`--- Session State ['${agent.outputKey}']: `);
		try {
			// Attempt to parse and pretty print if it's JSON
			const result = JSON.parse(storedOutput as string);
			logger.info(JSON.stringify(result, null, 2));
		} catch (e) {
			// Otherwise, print as a string
			logger.info(`storedOutput ${storedOutput}`);
		}
		return { finalResponseContent, trace };
	}

	private async runSequentialAgent(
		runner: InMemoryRunner,
		agent: SequentialAgent,
		query: string
	): Promise<{ finalResponseContent: string; trace: Trace }> {
		const trace: Trace = {
			requestId: crypto.randomUUID(),
			startedAt: Date.now(),
			prompt: query,
			model: 'sequential_agent'
		};

		const message = createUserContent(query);

		let finalResponseContent = 'No final response received.';
		for await (const event of runner.runAsync({
			userId: this.USER_ID,
			sessionId: this.SESSION_ID,
			newMessage: message
		})) {
			if (isFinalResponse(event) && event.content?.parts?.length) {
				finalResponseContent = event.content.parts.map((part: Part) => part.text ?? '').join('');

				try {
					JSON.parse(finalResponseContent);
					trace.schemaValid = true;
				} catch (e) {
					// trace.parseError = finalResponseContent.slice(0, 300);
					// throw new Error(`Invalid JSON from model: ${finalResponseContent}`);
					logger.warn(`Invalid JSON from model: ${finalResponseContent}`);
				}

				trace.responseId = event.id;
				trace.finishedAt = Date.now();
				trace.duration = trace.finishedAt - trace.startedAt;

				const usage = event.usageMetadata;
				trace.usageMetadata = {
					candidatesTokenCount: usage?.candidatesTokenCount,
					candidatesTokensDetails: usage?.candidatesTokensDetails,
					promptTokenCount: usage?.promptTokenCount,
					promptTokensDetails: usage?.promptTokensDetails,
					thoughtsTokenCount: usage?.thoughtsTokenCount,
					toolUsePromptTokenCount: usage?.toolUsePromptTokenCount,
					toolUsePromptTokensDetails: usage?.toolUsePromptTokensDetails,
					totalTokenCount: usage?.totalTokenCount,
					trafficType: usage?.trafficType
				};

				trace.finishReason = event.finishReason;
			}
		}
		logger.info(`<<< Agent '${agent.name}' Response: ${finalResponseContent}`);

		const currentSession = await runner.sessionService.getSession({
			appName: this.APP_NAME,
			userId: this.USER_ID,
			sessionId: this.SESSION_ID
		});
		if (!currentSession) {
			logger.warn(`--- Session not found: ${this.SESSION_ID} ---`);
			throw new Error('Session not found after agent run.');
		}

		return { finalResponseContent, trace };
	}

	async resolveDataSources(prompt: string): Promise<any> {
		const runner = new InMemoryRunner({
			appName: this.APP_NAME,
			agent: this.googleAdkAgent
		});

		// Create sessions
		logger.info('--- Creating Sessions ---');
		await runner.sessionService.createSession({
			appName: this.APP_NAME,
			userId: this.USER_ID,
			sessionId: this.SESSION_ID
		});

		const { finalResponseContent, trace } = await this.runAgent(runner, this.googleAdkAgent, prompt);
		const parsedResult = JSON.parse(finalResponseContent ?? '');

		return {
			success: true,
			result: parsedResult,
			trace
		};
	}

	async resolveDataSourcesWithTools(prompt: string): Promise<any> {
		const runner = new InMemoryRunner({
			appName: this.APP_NAME,
			agent: this.adkAgentWithTools
		});

		// Create sessions
		logger.info('--- Creating Sessions ---');
		await runner.sessionService.createSession({
			appName: this.APP_NAME,
			userId: this.USER_ID,
			sessionId: this.SESSION_ID
		});

		const { finalResponseContent, trace } = await this.runAgent(runner, this.adkAgentWithTools, prompt);
		logger.info(`finalResponseContent: ${finalResponseContent}`);

		return {
			success: true,
			result: finalResponseContent,
			trace
		};
	}

	async resolveDataSourcesWithSequentialAgent(prompt: string): Promise<any> {
		const runner = new InMemoryRunner({
			appName: this.APP_NAME,
			agent: this.sequentialAgent
		});

		// Create sessions
		logger.info('--- Creating Sessions ---');
		await runner.sessionService.createSession({
			appName: this.APP_NAME,
			userId: this.USER_ID,
			sessionId: this.SESSION_ID
		});

		const { finalResponseContent, trace } = await this.runSequentialAgent(runner, this.sequentialAgent, prompt);
		logger.info(`finalResponseContent: ${finalResponseContent}`);

		return {
			success: true,
			result: finalResponseContent,
			trace
		};
	}

	async resolveDataSourcesCustomAgent(prompt: string): Promise<ResolutionResult> {
		try {
			const contents: Content[] = [
				{
					role: 'user',
					parts: [{ text: prompt }]
				}
			];

			const agentMessages: AgentMessage[] = [{ role: Role.USER, content: prompt }];

			const maxIterations = 1;
			let iteration = 0;

			let selectedSources: string[] = [];
			let reasoning: string = '';

			const trace: any = {};

			while (iteration < maxIterations) {
				iteration++;

				trace.requestId = crypto.randomUUID();
				trace.startedAt = Date.now();
				trace.prompt = prompt;

				const response: GenerateContentResponse = await this.googleGenAi.models.generateContent({
					model: 'gemini-2.5-flash',
					contents: contents,
					config: {
						systemInstruction,
						// tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
						responseMimeType: 'application/json',
						responseSchema: {
							type: Type.OBJECT,
							properties: {
								selectedSources: {
									type: Type.ARRAY,
									items: { type: Type.STRING },
									description: 'Array of module_key strings for the selected data sources'
								},
								reasoning: {
									type: Type.STRING,
									description: 'Detailed explanation of why these sources were selected'
								}
							},
							required: ['selectedSources', 'reasoning']
						},
						temperature: 0
					}
				});

				// const candidate = response.candidates?.[0];
				// if (!candidate) throw new Error('No response from agent.');

				// // Add the model's response to the context
				// contents.push(candidate.content!);

				// const functionCalls = candidate.content?.parts?.filter((p) => p.functionCall);

				// if (functionCalls && functionCalls.length > 0) {
				// 	const functionResponseParts = [];

				// 	for (const part of functionCalls) {
				// 		const call = part.functionCall!;
				// 		const functionName = call.name;
				// 		const args = call.args as any;

				// 		console.log(`[Agent] Iteration ${iteration}: Calling ${functionName}`, args);

				// 		if (!functionName) throw new Error('Function call missing name.');
				// 		if (functionName in TOOL_FUNCTIONS) {
				// 			const result = TOOL_FUNCTIONS[functionName](...Object.values(args));

				// 			if (functionName === 'fetchSampleData') {
				// 				try {
				// 					finalSampleData = JSON.parse(result);
				// 				} catch (e) {}
				// 			}

				// 			// Protocol: functionResponse must follow a functionCall
				// 			functionResponseParts.push({
				// 				functionResponse: {
				// 					name: functionName,
				// 					response: { result }
				// 				}
				// 			});

				// 			agentMessages.push({
				// 				role: Role.ASSISTANT,
				// 				content: `Using tool: ${functionName}(${JSON.stringify(args)})`
				// 			});
				// 			agentMessages.push({
				// 				role: Role.FUNCTION,
				// 				name: functionName,
				// 				content: result
				// 			});
				// 		}
				// 	}

				// 	// In Gemini API, function responses are sent back as a 'user' role message containing functionResponse parts
				// 	contents.push({
				// 		role: 'user',
				// 		parts: functionResponseParts
				// 	});

				// 	// Continue to next iteration to get model's response to the function results
				// 	// Don't break here - let the loop continue
				// } else {
				// 	// No more function calls, we have the final answer
				// 	finalReasoning = response.text || '';
				// 	console.log(`[Agent] Final reasoning captured:`, finalReasoning);
				// 	agentMessages.push({ role: Role.ASSISTANT, content: finalReasoning });
				// 	break;
				// }

				const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text;

				if (!rawText) {
					throw new Error('No model response text');
				}

				let parsed: {
					selectedSources: string[];
					reasoning: string;
				};

				try {
					parsed = JSON.parse(rawText);
					trace.schemaValid = true;
				} catch (e) {
					trace.parseError = rawText.slice(0, 300);
					throw new Error(`Invalid JSON from model: ${rawText}`);
				}

				trace.responseId = response.responseId;
				trace.modelVersion = response.modelVersion;
				trace.finishedAt = Date.now();
				trace.duration = trace.finishedAt - trace.startedAt;
				selectedSources = parsed.selectedSources;
				reasoning = parsed.reasoning;

				const usage = (response as any).usageMetadata ?? (response as any).candidates?.[0]?.usageMetadata;
				trace.usageMetadata = {
					candidatesTokenCount: usage?.candidatesTokenCount,
					candidatesTokensDetails: usage?.candidatesTokensDetails,
					promptTokenCount: usage?.promptTokenCount,
					promptTokensDetails: usage?.promptTokensDetails,
					thoughtsTokenCount: usage?.thoughtsTokenCount,
					toolUsePromptTokenCount: usage?.toolUsePromptTokenCount,
					toolUsePromptTokensDetails: usage?.toolUsePromptTokensDetails,
					totalTokenCount: usage?.totalTokenCount,
					trafficType: usage?.trafficType
				};

				const cand = response.candidates?.[0] as any;
				trace.finishReason = cand?.finishReason;
				trace.promptFeedback = (response as any).promptFeedback;
			}

			return {
				success: true,
				selectedSources,
				reasoning,
				messages: agentMessages,
				trace
			};
		} catch (error: any) {
			console.error('Resolution Error:', error);
			return {
				success: false,
				messages: [],
				selectedSources: [],
				reasoning: '',
				error: error.message || 'An unexpected error occurred.'
			};
		}
	}

	private extractDataSources(messages: AgentMessage[]): string[] {
		const sources = new Set<string>();
		const knownSources = [
			'glassdoor',
			'github',
			'semrush',
			'similarweb',
			'pathmatics',
			'snowflake',
			'stackoverflow',
			'sensortower',
			'revelio',
			'aura'
		];

		for (const message of messages) {
			const contentLower = message.content.toLowerCase();
			for (const source of knownSources) {
				if (contentLower.includes(source)) {
					sources.add(source);
				}
			}
		}

		return Array.from(sources);
	}
}
