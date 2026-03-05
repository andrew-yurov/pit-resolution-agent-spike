import { ChatOpenAI, AzureChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";
import {
  StateGraph,
  Annotation,
  MessagesAnnotation,
  START,
  END,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getAllDataSources } from "../tools/dataSourceTools";
import type {
  ResolutionResult,
  AgentMessage,
  Role,
  Trace,
} from "./IDataResolutionAgentService";
import logger from "../logger";

// Define the output schema using Zod
const DataResolutionOutputSchema = z.object({
  selectedSources: z
    .array(z.string())
    .describe("Array of module_key strings for the selected data sources"),
  reasoning: z
    .string()
    .describe("Detailed explanation of why these sources were selected"),
});

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
- Return a JSON object with "selectedSources" (array of module_key strings) and "reasoning" (string explanation).
- Provide a concise explanation of what signal each source contributes.

Available Data Sources:
${getAllDataSources()}
`.trim();

interface GraphState {
  messages: any[];
  selectedSources?: string[];
  reasoning?: string;
  finished?: boolean;
}

export type ModelProvider =
  | "openai"
  | "anthropic"
  | "azureOpenAi"
  | "toolAgent"
  | "resolutionAgent";
type BaseChatModel = ChatOpenAI | ChatAnthropic | AzureChatOpenAI;

export interface ModelFactoryMethods {
  openai: () => ChatOpenAI;
  anthropic: () => ChatAnthropic;
  azureOpenAi: () => AzureChatOpenAI;
  toolAgent: () => toolAgent;
  resolutionAgent: () => resolutionAgent;
}

/**
 * LangGraph-based Data Resolution Agent Service
 * Uses a graph-based workflow with nodes and edges for agent execution
 */
export class DataResolutionAgentLangGraphService {
  private model: BaseChatModel;
  private graph: any;
  private maxIterations = 5;
  private readonly modelFactories: ModelFactoryMethods = {
    openai: () =>
      new ChatOpenAI({
        modelName: "gpt-4o",
        temperature: 0,
        apiKey: process.env.OPENAI_API_KEY,
      }).withStructuredOutput(DataResolutionOutputSchema),

    anthropic: () =>
      new ChatAnthropic({
        modelName: "claude-3-5-sonnet-20241022",
        temperature: 0,
        apiKey: process.env.ANTHROPIC_API_KEY,
      }).withStructuredOutput(DataResolutionOutputSchema),

    azureOpenAi: () =>
      new AzureChatOpenAI({
        temperature: 0,
        azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY!,
        azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT!,
        azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT!,
        azureOpenAIApiVersion:
          process.env.AZURE_OPENAI_API_VERSION || "2024-10-21",
      }).withStructuredOutput(DataResolutionOutputSchema),

    toolAgent: () =>
      new AzureChatOpenAI({
        temperature: 0,
        azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY!,
        azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT!,
        azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT!,
        azureOpenAIApiVersion:
          process.env.AZURE_OPENAI_API_VERSION || "2024-10-21",
      }),

    resolutionAgent: () =>
      new AzureChatOpenAI({
        temperature: 0,
        azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY!,
        azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT!,
        azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT!,
        azureOpenAIApiVersion:
          process.env.AZURE_OPENAI_API_VERSION || "2024-10-21",
      }).withStructuredOutput(DataResolutionOutputSchema, { includeRaw: true }),
  };

  constructor(provider: ModelProvider = "azureOpenAi") {
    this.model = this.createModel(provider);
    this.graph = this.buildGraph();
  }

  private createModel(provider?: string): BaseChatModel {
    const key = provider as ModelProvider;
    const factory = this.modelFactories[key] ?? this.modelFactories.openai;
    return factory();
  }

  /**
   * Build the LangGraph workflow
   * Creates nodes for agent reasoning and tool execution
   */
  private buildGraph() {
    const graphAnnotation = MessagesAnnotation;

    const workflow = new StateGraph(graphAnnotation)
      .addNode("agent", this.agentNode.bind(this))
      .addNode("parse_output", this.parseOutputNode.bind(this))
      .addEdge(START, "agent")
      .addEdge("agent", "parse_output")
      .addEdge("parse_output", END);

    return workflow.compile();
  }

  /**
   * Agent node - calls the LLM to reason about data sources with structured output
   */
  private async agentNode(state: typeof MessagesAnnotation.State) {
    const messages = state.messages;

    // Add system instruction if not already present
    const hasSystemMessage = messages.some(
      (msg: any) => msg._getType() === "system",
    );

    const fullMessages = hasSystemMessage
      ? messages
      : [new SystemMessage(systemInstruction), ...messages];

    logger.info(
      `[LangGraph Agent] Calling model with ${fullMessages.length} messages`,
    );

    try {
      // Call the model with structured output (schema enforced by withStructuredOutput)
      const response = await this.model.invoke(fullMessages);

      logger.info(`[LangGraph Agent] Received structured response:`, response);

      // The response is already structured, wrap it in an AI message for the graph
      const aiMessage = new AIMessage({
        content: JSON.stringify(response),
      });

      return {
        messages: [...messages, aiMessage],
      };
    } catch (error: any) {
      logger.error(`[LangGraph Agent] Error calling model: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse output node - extracts selected sources and reasoning from structured LLM response
   */
  private async parseOutputNode(state: typeof MessagesAnnotation.State) {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];

    let selectedSources: string[] = [];
    let reasoning: string = "";

    try {
      const content =
        typeof lastMessage.content === "string"
          ? lastMessage.content
          : JSON.stringify(lastMessage.content);

      logger.info(`[LangGraph Parse] Parsing structured output: ${content}`);

      const parsed = JSON.parse(content);

      // Schema guarantees these fields exist
      selectedSources = parsed.selectedSources || [];
      reasoning = parsed.reasoning || "";

      logger.info(
        `[LangGraph Parse] Extracted ${selectedSources.length} sources`,
      );
    } catch (error: any) {
      logger.error(
        `[LangGraph Parse] Failed to parse output: ${error.message}`,
      );
      // Since we're using structured output, this should rarely happen
      // But keep a fallback just in case
      const content = String(lastMessage.content);
      selectedSources = this.extractDataSourcesFromText(content);
      reasoning = content;
    }

    return {
      selectedSources,
      reasoning,
      finished: true,
    };
  }

  /**
   * Fallback method to extract data sources from text
   */
  private extractDataSourcesFromText(text: string): string[] {
    const sources = new Set<string>();
    const knownSources = [
      "glassdoor",
      "github",
      "semrush",
      "similarweb",
      "pathmatics",
      "snowflake",
      "stackoverflow",
      "sensortower",
      "revelio",
      "aura",
    ];

    const textLower = text.toLowerCase();
    for (const source of knownSources) {
      if (textLower.includes(source)) {
        sources.add(source);
      }
    }

    return Array.from(sources);
  }

  /**
   * Resolve data sources for a given prompt
   */
  async resolveDataSources(prompt: string): Promise<ResolutionResult> {
    const trace: Trace = {
      requestId: crypto.randomUUID(),
      startedAt: Date.now(),
      prompt,
      model: this.model.modelName || "unknown",
    };

    try {
      logger.info(`[LangGraph] Starting resolution for: "${prompt}"`);

      // Create initial state with user message
      const initialState = {
        messages: [new HumanMessage(prompt)],
      };

      // Execute the graph
      const result = await this.graph.invoke(initialState, {
        recursionLimit: this.maxIterations,
      }); // messages > AIMessage > content

      let contentParsed = {};

      try {
        const responseContent = result?.messages[1]?.content;
        contentParsed =
          typeof responseContent === "string"
            ? JSON.parse(responseContent)
            : responseContent;
        trace.schemaValid = true;
      } catch (e) {
        logger.error(`[LangGraph] Schema validation failed: ${e}`);
        trace.schemaValid = false;
      }

      trace.finishedAt = Date.now();
      trace.duration = trace.finishedAt - trace.startedAt;

      // Extract results
      const selectedSources = contentParsed.selectedSources || [];
      const reasoning = contentParsed.reasoning || "No reasoning provided";

      // Convert messages to AgentMessage format
      const agentMessages: AgentMessage[] = result.messages.map((msg: any) => {
        const role =
          msg._getType() === "human"
            ? ("user" as Role)
            : msg._getType() === "ai"
              ? ("assistant" as Role)
              : ("assistant" as Role);

        return {
          role,
          content:
            typeof msg.content === "string"
              ? msg.content
              : JSON.stringify(msg.content),
        };
      });

      logger.info(
        `[LangGraph] Resolution complete: ${selectedSources.length} sources selected`,
      );
      logger.info(`[LangGraph] Sources: ${selectedSources.join(", ")}`);

      return {
        success: true,
        selectedSources,
        reasoning,
        messages: agentMessages,
        trace,
      };
    } catch (error: any) {
      trace.finishedAt = Date.now();
      trace.duration = trace.finishedAt - trace.startedAt;

      logger.error(`[LangGraph] Resolution error: ${error.message}`);

      return {
        success: false,
        messages: [],
        selectedSources: [],
        reasoning: "",
        error: error.message || "An unexpected error occurred.",
        trace,
      };
    }
  }

  /**
   * Resolve data sources with tool support - two-interaction agent
   * Interaction 1: Call getAllDataSources tool to retrieve all available sources
   * Interaction 2: Semantically match user prompt against sources and select relevant ones
   */
  async resolveDataSourcesWithTools(prompt: string): Promise<ResolutionResult> {
    try {
      logger.info(
        `[LangGraph Tools] Starting two-interaction resolution for: "${prompt}"`,
      );

      // Create LangChain-compatible tool from getAllDataSources
      const getAllDataSourcesTool = tool(
        () => {
          return getAllDataSources();
        },
        {
          name: "get_all_data_sources",
          description:
            "Retrieve the complete catalog of all available data sources. Returns each source with its name, description, and capabilities. Use this to understand what data sources are available before selecting the best matches for the user query.",
          schema: z.object({}),
        },
      );

      // Simple system message for the two-interaction flow
      const toolSystemMessage = `You are a Data Source Selection Agent.

Your task:
1. FIRST: Call the get_all_data_sources tool to retrieve all available data sources.
2. SECOND: Analyze the user's request and semantically match it against the available sources.
3. Select ALL relevant data sources that can help answer the user's query.
4. Return your selection as a structured JSON response.

Rules:
- Always start by calling the tool to get the data sources catalog
- Match capabilities and descriptions to the user's information needs
- Include all sources that provide distinct, complementary information
- For employee sentiment queries, consider sources like Glassdoor
- For development/tech activity, consider GitHub and StackOverflow
- For web traffic, consider SimilarWeb
- For workforce data, consider Revelio and Aura

Output Format:
{
  "selectedSources": ["source1_module_key", "source2_module_key"],
  "reasoning": "Explanation of why these sources were selected"
}`;

      // Create model WITHOUT structured output initially (so it can call tools)
      const modelForTools = new ChatOpenAI({
        modelName: "gpt-4o",
        temperature: 0,
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Bind the tool to the model
      const modelWithTools = modelForTools.bindTools([getAllDataSourcesTool]);

      // Build the workflow with tool support
      const toolNode = new ToolNode([getAllDataSourcesTool]);
      const workflow = new StateGraph(MessagesAnnotation);

      // Agent node - calls model with tools
      workflow.addNode(
        "agent",
        async (state: typeof MessagesAnnotation.State) => {
          const messages = state.messages;
          const hasSystemMessage = messages.some(
            (msg: any) => msg._getType() === "system",
          );
          const fullMessages = hasSystemMessage
            ? messages
            : [new SystemMessage(toolSystemMessage), ...messages];

          logger.info(
            `[LangGraph Tools] Agent node: calling model with ${fullMessages.length} messages`,
          );
          const response = await modelWithTools.invoke(fullMessages);
          logger.info(
            `[LangGraph Tools] Agent response, tool_calls: ${
              response.additional_kwargs?.tool_calls?.length || 0
            }`,
          );

          return { messages: [...messages, response] };
        },
      );

      // Tool execution node
      workflow.addNode("tools", toolNode);

      // Selection node - after tools are called, ask model to select sources
      workflow.addNode(
        "select_sources",
        async (state: typeof MessagesAnnotation.State) => {
          const messages = state.messages;

          logger.info(
            `[LangGraph Tools] Selection node: analyzing tool results`,
          );

          // Create a model with structured output for final selection
          const selectionModel = new ChatOpenAI({
            modelName: "gpt-4o",
            temperature: 0,
            apiKey: process.env.OPENAI_API_KEY,
          }).withStructuredOutput(DataResolutionOutputSchema);

          // Add instruction to analyze and select
          const selectionPrompt = new SystemMessage(
            `Based on the data sources you retrieved, select the most relevant ones for the user's query. Return a structured JSON response with selectedSources (array of module_key strings) and reasoning (explanation).`,
          );

          const response = await selectionModel.invoke([
            selectionPrompt,
            ...messages,
          ]);

          logger.info(`[LangGraph Tools] Selection complete:`, response);

          const aiMessage = new AIMessage({
            content: JSON.stringify(response),
          });

          return { messages: [...messages, aiMessage] };
        },
      );

      // Routing function: if tool calls exist, execute tools; otherwise go to selection
      const shouldUseTool = (state: typeof MessagesAnnotation.State) => {
        const lastMessage = state.messages[state.messages.length - 1];
        const hasToolCalls =
          lastMessage.additional_kwargs?.tool_calls?.length > 0;

        logger.info(
          `[LangGraph Tools] Routing decision: ${hasToolCalls ? "tools" : "select_sources"}`,
        );
        return hasToolCalls ? "tools" : "select_sources";
      };

      // Build the graph
      workflow.addEdge(START, "agent");
      workflow.addConditionalEdges("agent", shouldUseTool, {
        tools: "tools",
        select_sources: "select_sources",
      });
      workflow.addEdge("tools", "agent"); // After tool execution, go back to agent
      workflow.addNode("parse_output", this.parseOutputNode.bind(this));
      workflow.addEdge("select_sources", "parse_output");
      workflow.addEdge("parse_output", END);

      const graph = workflow.compile();

      // Execute the graph
      const initialState = {
        messages: [new HumanMessage(prompt)],
      };

      const result = await graph.invoke(initialState, {
        recursionLimit: this.maxIterations,
      });

      const selectedSources = result.selectedSources || [];
      const reasoning = result.reasoning || "No reasoning provided";

      const agentMessages: AgentMessage[] = result.messages.map((msg: any) => {
        const role =
          msg._getType() === "human"
            ? ("user" as Role)
            : msg._getType() === "ai"
              ? ("assistant" as Role)
              : msg._getType() === "tool"
                ? ("assistant" as Role)
                : ("assistant" as Role);

        return {
          role,
          content:
            typeof msg.content === "string"
              ? msg.content
              : JSON.stringify(msg.content),
        };
      });

      logger.info(
        `[LangGraph Tools] Resolution complete: ${selectedSources.length} sources selected`,
      );
      logger.info(`[LangGraph Tools] Sources: ${selectedSources.join(", ")}`);

      return {
        success: true,
        selectedSources,
        reasoning,
        messages: agentMessages,
      };
    } catch (error: any) {
      logger.error(`[LangGraph Tools] Error: ${error.message}`);

      return {
        success: false,
        messages: [],
        selectedSources: [],
        reasoning: "",
        error: error.message || "An unexpected error occurred.",
      };
    }
  }

  /**
   * Resolve data sources with tool support and multi agent - two-agent interaction
   * Interaction 1: Call toolAgent to retrieve all available sources
   * Interaction 2: Call resolutionAgent to semantically match user prompt against sources and select relevant ones
   */
  async resolveDataSourcesWithMultiAgent(
    prompt: string,
  ): Promise<ResolutionResult> {
    const toolAgentSystemMessage = `You are a Tool Agent whose only task is to call the get_all_data_sources tool and return its output. Do not perform any analysis or selection. Simply call the tool and return the data sources.`;

    const resolutionAgentSystemMessage = `You are a Resolution Agent.
Analyze the user's request and semantically match it against the available sources.
Select ALL relevant data sources that can help answer the user's query.
Return your selection as a structured JSON response.

Rules:
- Use the provided data sources catalog from the tool results
- Match capabilities and descriptions to the user's information needs
- Include all sources that provide distinct, complementary information
- For employee sentiment queries, consider sources like Glassdoor
- For development/tech activity, consider GitHub and StackOverflow
- For web traffic, consider SimilarWeb
- For workforce data, consider Revelio and Aura

Output Format:
{
  "selectedSources": ["source1_module_key", "source2_module_key"],
  "reasoning": "Explanation of why these sources were selected"
}`;

    const getAllDataSourcesTool = tool(() => getAllDataSources(), {
      name: "get_all_data_sources",
      description:
        "Retrieve the complete catalog of all available data sources. Returns each source with its name, description, and capabilities.",
      schema: z.object({}),
    });

    try {
      const toolAgent = this.createModel("toolAgent").bindTools([
        getAllDataSourcesTool,
      ]);
      const resolutionAgent = this.createModel("resolutionAgent");

      logger.info(
        `[LangGraph Tools] Starting two-agents-interaction resolution for: "${prompt}"`,
      );

      const GraphState = Annotation.Root({
        ...MessagesAnnotation.spec, // keeps `messages`
        selectedSources: Annotation<string[]>({
          default: () => [],
          reducer: (_prev, next) => next ?? [], // “last write wins”
        }),
        reasoning: Annotation<string>({
          default: () => "",
          reducer: (_prev, next) => next ?? "",
        }),
      });

      const workflow = new StateGraph(GraphState);
      const toolNode = new ToolNode([getAllDataSourcesTool]);

      workflow.addNode(
        "tool_agent",
        async (state: typeof MessagesAnnotation.State) => {
          logger.info(
            `[LangGraph MultiAgent] Tool agent: requesting data sources`,
          );

          const messages = [new SystemMessage(toolAgentSystemMessage)];
          const response = await toolAgent.invoke(messages);

          logger.info(
            `[LangGraph MultiAgent] Tool agent response, tool_calls: ${
              (response as any).tool_calls?.length ||
              response.additional_kwargs?.tool_calls?.length ||
              0
            }`,
          );

          return { messages: [...state.messages, response] };
        },
      );

      workflow.addNode("tools", toolNode);

      workflow.addNode(
        "resolution_agent",
        async (state: typeof MessagesAnnotation.State) => {
          logger.info(
            `[LangGraph MultiAgent] Resolution agent: analyzing sources for user query`,
          );

          const messages = [
            new SystemMessage(resolutionAgentSystemMessage),
            ...state.messages,
            new HumanMessage(prompt),
          ];

          const response = await resolutionAgent.invoke(messages);
          const selectedSources = response.parsed.selectedSources || [];
          const reasoning =
            response.parsed.reasoning || "No reasoning provided";

          const aiMessage = new AIMessage({
            ...response.raw,
            content: JSON.stringify(response.parsed),
          });

          return {
            messages: [...state.messages, aiMessage],
            selectedSources,
            reasoning,
          };
        },
      );

      const shouldExecuteTool = (state: typeof MessagesAnnotation.State) => {
        const lastMessage = state.messages[state.messages.length - 1] as any;
        const hasToolCalls =
          (lastMessage.tool_calls?.length ?? 0) > 0 ||
          (lastMessage.additional_kwargs?.tool_calls?.length ?? 0) > 0;

        logger.info(
          `[LangGraph MultiAgent] Routing: ${hasToolCalls ? "execute tools" : "resolution agent"}`,
        );
        return hasToolCalls ? "tools" : "resolution_agent";
      };

      workflow.addEdge(START, "tool_agent");
      workflow.addConditionalEdges("tool_agent", shouldExecuteTool, {
        tools: "tools",
        resolution_agent: "resolution_agent",
      });
      workflow.addEdge("tools", "resolution_agent");
      workflow.addNode("parse_output", this.parseOutputNode.bind(this));
      workflow.addEdge("resolution_agent", "parse_output");
      workflow.addEdge("parse_output", END);

      const graph = workflow.compile();

      const result = await graph.invoke(
        { messages: [] },
        { recursionLimit: this.maxIterations },
      );

      const selectedSources = result.selectedSources || [];
      const reasoning = result.reasoning || "No reasoning provided";

      const agentMessages: AgentMessage[] = result.messages.map((msg: any) => {
        const role =
          msg._getType() === "human" ? ("user" as Role) : ("assistant" as Role);

        return {
          role,
          content:
            typeof msg.content === "string"
              ? msg.content
              : JSON.stringify(msg.content),
        };
      });

      return {
        success: true,
        selectedSources,
        reasoning,
        messages: agentMessages,
      };
    } catch (error: any) {
      logger.error(`[LangGraph MultiAgent] Error: ${error.message}`);
      return {
        success: false,
        messages: [],
        selectedSources: [],
        reasoning: "",
        error: error.message || "An unexpected error occurred.",
      };
    }
  }
}
