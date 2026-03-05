# LangGraph Data Resolution Agent

This is a LangGraph-based implementation of the Data Resolution Agent that uses graph-based workflows for agent orchestration.

## Overview

The LangGraph implementation provides a structured, stateful approach to agent execution using:
- **Graph-based workflows**: Define nodes and edges for agent reasoning
- **State management**: Track conversation state through the graph
- **Tool support**: Optional integration with tools for extended functionality
- **Multi-provider support**: Works with OpenAI or Anthropic models

## Architecture

### Graph Structure

```
START → agent → parse_output → END
```

#### Nodes:
1. **agent**: Calls the LLM to analyze the prompt and reason about data sources
2. **parse_output**: Extracts structured output (selectedSources, reasoning) from LLM response

### With Tools (Extended)

```
START → agent ↔ tools → parse_output → END
         ↓                    ↑
         └────────────────────┘
```

When tools are provided, the agent can call them in a loop before reaching the final output.

## Usage

### Basic Usage

```typescript
import { DataResolutionAgentLangGraphService } from './agents/DataResolutionAgentLangGraph.service';

// Initialize with OpenAI (default)
const agent = new DataResolutionAgentLangGraphService('openai');

// Or with Anthropic
const agent = new DataResolutionAgentLangGraphService('anthropic');

// Resolve data sources
const result = await agent.resolveDataSources(
    "I need employee sentiment data for Tesla"
);

console.log('Selected sources:', result.selectedSources);
console.log('Reasoning:', result.reasoning);
```

### With Tools

```typescript
const customTools = [
    // Define your tools here
];

const result = await agent.resolveDataSourcesWithTools(
    "Find the best data sources for market analysis",
    customTools
);
```

### Response Format

```typescript
{
    success: boolean;
    selectedSources: string[];       // e.g., ['glassdoor', 'similarweb']
    reasoning: string;                // Explanation of selections
    messages: AgentMessage[];         // Conversation history
    trace?: Trace;                    // Execution metadata
    error?: string;                   // Error message if failed
}
```

## Environment Variables

```bash
# OpenAI (if using OpenAI provider)
OPENAI_API_KEY=sk-...

# Anthropic (if using Anthropic provider)
ANTHROPIC_API_KEY=sk-ant-...
```

## Key Features

### 1. **Structured Workflows**
LangGraph provides explicit control over agent execution flow with nodes and edges.

### 2. **State Management**
The graph maintains state across nodes, making it easy to track conversation history and intermediate results.

### 3. **Extensibility**
Easy to add new nodes (e.g., validation, preprocessing) or tools to the workflow.

### 4. **Debugging**
Clear execution path makes it easier to debug and understand agent behavior.

### 5. **Recursion Control**
Built-in recursion limits prevent infinite loops in tool-calling scenarios.

## Comparison with Other Implementations

| Feature | LangGraph | Google ADK | Custom Agent |
|---------|-----------|------------|--------------|
| Workflow Control | Explicit graph | Built-in ReAct | Manual loop |
| State Management | Graph state | Session state | Local vars |
| Tool Integration | ToolNode | Function tools | Custom impl |
| Debugging | Visual graph | Logs | Logs |
| Flexibility | High | Medium | High |

## Examples

Run the examples:

```bash
# Install dependencies
npm install

# Set environment variables
export OPENAI_API_KEY=sk-...
# or
export ANTHROPIC_API_KEY=sk-ant-...

# Run examples
ts-node src/agents/examples.langgraph.ts
```

## Advanced Configuration

### Custom Graph Structure

You can customize the graph by modifying the `buildGraph()` method:

```typescript
private buildGraph() {
    const workflow = new StateGraph(MessagesAnnotation)
        .addNode("preprocess", this.preprocessNode.bind(this))
        .addNode("agent", this.agentNode.bind(this))
        .addNode("validate", this.validateNode.bind(this))
        .addNode("parse_output", this.parseOutputNode.bind(this))
        .addEdge(START, "preprocess")
        .addEdge("preprocess", "agent")
        .addEdge("agent", "validate")
        .addEdge("validate", "parse_output")
        .addEdge("parse_output", END);

    return workflow.compile();
}
```

### Conditional Edges

Add conditional routing based on state:

```typescript
workflow.addConditionalEdges(
    "agent",
    (state) => {
        const lastMessage = state.messages[state.messages.length - 1];
        if (needsToolCall(lastMessage)) {
            return "tools";
        }
        return "parse_output";
    },
    {
        tools: "tools",
        parse_output: "parse_output"
    }
);
```

## Benefits of LangGraph

1. **Visual Understanding**: The graph structure makes agent behavior explicit
2. **Composability**: Easy to combine multiple agents or add new capabilities
3. **Checkpointing**: Built-in support for persisting state (can be added)
4. **Streaming**: Support for streaming responses (can be added)
5. **Human-in-the-Loop**: Easy to add breakpoints for human approval

## Limitations

1. **Dependencies**: Requires LangGraph and LangChain packages
2. **Learning Curve**: Graph-based thinking may be new to some developers
3. **Overhead**: Slightly more complex than simple function calls for basic use cases

## Future Enhancements

- [ ] Add checkpointing for conversation persistence
- [ ] Implement streaming responses
- [ ] Add human-in-the-loop approval nodes
- [ ] Create visual graph debugging tools
- [ ] Add retry logic with exponential backoff
- [ ] Implement parallel node execution for performance

## License

Same as parent project.
