import { GoogleGenAI, GenerateContentResponse, Content, Type } from '@google/genai';
import { Role, AgentMessage, ResolutionResult } from './IDataResolutionAgentService';
import { getAllDataSources, TOOL_DECLARATIONS, TOOL_FUNCTIONS } from '../tools/dataSourceTools';
import { FunctionTool, LlmAgent, InMemoryRunner, isFinalResponse } from '@google/adk';
import { z } from 'zod';

export class DataResolutionAgentService {
	private ai: GoogleGenAI;

	constructor() {
		this.ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
	}

	async resolveAdkDataSources(prompt: string): Promise<any> {
		// Create FunctionTool for getting all data sources
		const getDataSourcesTool = new FunctionTool({
			name: 'get_all_data_sources',
			description: 'Retrieves the complete catalog of all available data sources with their names, descriptions, and capabilities. Use this FIRST to see what sources are available.',
			parameters: z.object({}), // No parameters needed
			execute: () => {
				const sources = JSON.parse(getAllDataSources());
				return {
					status: 'success',
					...sources
				};
			}
		});

		const rootAgent = new LlmAgent({
			name: 'data_resolution_agent',
			model: 'gemini-2.5-flash',
			description: 'Agent that analyzes user requests and selects the most appropriate data sources to fulfill those requests.',
			instruction: `You are a Data Resolution Agent. Your job is to:

1. FIRST, call get_all_data_sources() to retrieve the complete catalog of available data sources.
2. Analyze the user's request carefully to understand what information they need.
3. Semantically match the user's needs against the descriptions and capabilities of each available source.
4. Select ALL data sources that provide DISTINCT and COMPLEMENTARY information for the user's request.
5. Explain your reasoning clearly, mentioning which aspects each selected source covers.

IMPORTANT:
- Always call get_all_data_sources() first before making recommendations.
- Consider multiple sources if they provide different perspectives on the same topic.
- Match based on semantic meaning, not just keywords.
- Be thorough - don't stop at the first good match if others are also relevant.`,
			tools: [getDataSourcesTool]
		});


    const runner = new InMemoryRunner({
      agent: rootAgent,
      appName: 'rave-agentic-api',
      // InMemoryRunner includes in-memory SessionService under the hood.
      // In prod you’d swap to persistent session service if needed.
    });

    const userId = 'api-user';
    const sessionId = crypto.randomUUID(); // pass one from client if you want conversation continuity

    const newMessage: Content = {
      role: 'user',
      parts: [{ text: prompt }],
    };

    const events: Event[] = [];
    let finalText = '';

    // This is the event loop described in the docs: runner.runAsync yields Events
    for await (const event of runner.runAsync({ userId, sessionId, newMessage })) {
      events.push(event);

      // Identify the final response event
      if (isFinalResponse(event)) {
        finalText =
          event.content?.parts
            ?.map((p: any) => p.text)
            .filter(Boolean)
            .join('') ?? finalText;
      }
    }

    return {
      success: true,
      sessionId,
      answer: finalText,
      // Return full events in debug mode only (can be large)
      events,
    };

	}

	async resolveDataSources(prompt: string): Promise<ResolutionResult> {
		try {
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

				const response: GenerateContentResponse = await this.ai.models.generateContent({
					model: 'gemini-2.5-flash-lite',
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