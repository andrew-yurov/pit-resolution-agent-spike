import {
	GenerateContentResponsePromptFeedback,
	ModalityTokenCount,
	TrafficType,
	FinishReason,
	BlockedReason,
	SafetyRating
} from '@google/genai';

export enum Role {
	USER = 'user',
	ASSISTANT = 'assistant',
	FUNCTION = 'function'
}

export interface AgentMessage {
	role: Role;
	content: string;
	name?: string;
}

export interface DataSource {
	id: string;
	name: string;
	description: string;
	capabilities: string[];
	reliability: number;
}

export interface ResolutionResult {
	success: boolean;
	messages: AgentMessage[];
	selectedSources: string[];
	reasoning: string;
	error?: string;
	sampleData?: any;
	trace?: Trace;
}

export interface ToolCall {
	name: string;
	args: any;
	id?: string;
}

export interface Trace {
	requestId: string;
	responseId?: string;
	model: string;
	prompt: string;
	startedAt: number;
	finishedAt?: number;
	duration?: number;
	finishReason?: FinishReason;

	modelCalls?: number;
	toolCallsCount?: number;

	toolCalls?: Array<{
		name: string;
		args: Record<string, any>;
		startedAt: number;
		finishedAt: number;
		duration: number;
		resultPreview?: string;
		error?: string;
	}>;

	usageMetadata?: {
		candidatesTokenCount?: number;
		/** Output only. A detailed breakdown of the token count for each modality in the generated candidates. */
		candidatesTokensDetails?: ModalityTokenCount[];
		/** The total number of tokens in the prompt. This includes any text, images, or other media provided in the request. When `cached_content` is set, this also includes the number of tokens in the cached content. */
		promptTokenCount?: number;
		/** Output only. A detailed breakdown of the token count for each modality in the prompt. */
		promptTokensDetails?: ModalityTokenCount[];
		/** Output only. The number of tokens that were part of the model's generated "thoughts" output, if applicable. */
		thoughtsTokenCount?: number;
		/** Output only. The number of tokens in the results from tool executions, which are provided back to the model as input, if applicable. */
		toolUsePromptTokenCount?: number;
		/** Output only. A detailed breakdown by modality of the token counts from the results of tool executions, which are provided back to the model as input. */
		toolUsePromptTokensDetails?: ModalityTokenCount[];
		/** The total number of tokens for the entire request. This is the sum of `prompt_token_count`, `candidates_token_count`, `tool_use_prompt_token_count`, and `thoughts_token_count`. */
		totalTokenCount?: number;
		/** Output only. The traffic type for this request. */
		trafficType?: TrafficType;
	};

	promptFeedback?: {
		/** Output only. The reason why the prompt was blocked. */
		blockReason?: BlockedReason;
		/** Output only. A readable message that explains the reason why the prompt was blocked. This field is not supported in Gemini API. */
		blockReasonMessage?: string;
		/** Output only. A list of safety ratings for the prompt. There is one rating per category. */
		safetyRatings?: SafetyRating[];
	};
	schemaValid?: boolean;
	parseError?: string;
}
