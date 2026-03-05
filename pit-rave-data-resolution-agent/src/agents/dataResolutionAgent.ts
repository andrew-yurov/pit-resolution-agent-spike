import { ChatAnthropic } from "@langchain/anthropic";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage } from "@langchain/core/messages";
import { dataResolutionTools } from "../tools/dataSourceTools";

/**
 * Data Resolution Agent
 * 
 * Uses LangGraph's ReAct pattern to:
 * 1. Parse user's natural language prompt
 * 2. Search for appropriate data sources
 * 3. Select the best data source based on requirements
 * 4. Fetch sample data
 * 
 * ReAct Loop: Thought → Action → Observation → Repeat
 */

export class DataResolutionAgent {
  private agent: any;
  private model: ChatAnthropic;

  constructor(apiKey?: string) {
    // Initialize the Claude model
    this.model = new ChatAnthropic({
      modelName: "claude-3-5-sonnet-20241022",
      temperature: 0,
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });

    // Create the ReAct agent with tools
    this.agent = createReactAgent({
      llm: this.model,
      tools: dataResolutionTools,
    });
  }

  /**
   * Process a user prompt and resolve appropriate data sources
   */
  async resolveDataSources(prompt: string): Promise<{
    success: boolean;
    messages: any[];
    selectedSources: string[];
    reasoning: string;
    error?: string;
  }> {
    try {
      console.log(`\n🤖 Data Resolution Agent processing: "${prompt}"\n`);

      // System message to guide the agent
      const systemPrompt = `You are a Data Resolution Agent. Your job is to:
1. Understand what data the user needs based on their natural language prompt
2. Search for available data sources that can provide that data
3. Compare sources if multiple options exist
4. Select the best data source(s) based on the requirements
5. Provide a clear explanation of your decision

When you've identified the right data source(s), explain your reasoning and list them.`;

      // Create the input with system context
      const fullPrompt = `${systemPrompt}

User Request: ${prompt}

Please help me find the right data source(s) for this request.`;

      // Invoke the agent
      const result = await this.agent.invoke({
        messages: [new HumanMessage(fullPrompt)],
      });

      // Extract the final response
      const messages = result.messages || [];
      const finalMessage = messages[messages.length - 1];
      const reasoning = finalMessage?.content || "No response generated";

      // Extract selected sources from the conversation
      const selectedSources = this.extractDataSources(messages);

      console.log(`\n✅ Agent completed reasoning\n`);
      console.log(`Selected sources: ${selectedSources.join(", ")}`);

      return {
        success: true,
        messages,
        selectedSources,
        reasoning,
      };
    } catch (error) {
      console.error("❌ Error in Data Resolution Agent:", error);
      return {
        success: false,
        messages: [],
        selectedSources: [],
        reasoning: "",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Extract data source IDs mentioned in the agent's conversation
   */
  private extractDataSources(messages: any[]): string[] {
    const sources = new Set<string>();
    const knownSources = ["glassdoor", "similarweb", "linkedin", "crunchbase"];

    for (const message of messages) {
      const content = typeof message.content === "string" 
        ? message.content 
        : JSON.stringify(message.content);
      
      const contentLower = content.toLowerCase();
      
      for (const source of knownSources) {
        if (contentLower.includes(source)) {
          sources.add(source);
        }
      }
    }

    return Array.from(sources);
  }

  /**
   * Simple query method for testing without full ReAct loop
   */
  async simpleQuery(question: string): Promise<string> {
    try {
      const response = await this.model.invoke([
        new HumanMessage(question),
      ]);
      return response.content.toString();
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  }
}

/**
 * Example usage function
 */
export async function runExampleQueries() {
  const agent = new DataResolutionAgent();

  const examples = [
    "I need employee sentiment data for Tesla",
    "Get me web traffic analytics for Amazon and its competitors",
    "Find funding information for early-stage AI startups",
    "I want to compare employee satisfaction between Google and Microsoft",
  ];

  console.log("🚀 Running Data Resolution Agent Examples\n");
  console.log("=" .repeat(80));

  for (const prompt of examples) {
    console.log(`\n\n📝 PROMPT: ${prompt}`);
    console.log("-".repeat(80));
    
    const result = await agent.resolveDataSources(prompt);
    
    if (result.success) {
      console.log(`\n💡 REASONING:\n${result.reasoning}`);
      console.log(`\n✨ SELECTED SOURCES: ${result.selectedSources.join(", ") || "None"}`);
    } else {
      console.log(`\n❌ ERROR: ${result.error}`);
    }
    
    console.log("=".repeat(80));
  }
}
