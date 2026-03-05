# LangGraph Dependencies Installation Guide

## Required Packages

To use the LangGraph implementation, you need to install the following packages:

```bash
npm install @langchain/core @langchain/openai @langchain/anthropic @langgraph/graph @langgraph/prebuilt
```

Or add them to your `package.json`:

```json
{
  "dependencies": {
    "@langchain/core": "^0.3.0",
    "@langchain/openai": "^0.3.0",
    "@langchain/anthropic": "^0.3.0",
    "@langgraph/graph": "^0.2.0",
    "@langgraph/prebuilt": "^0.2.0"
  }
}
```

## Environment Variables

Make sure you have the appropriate API keys in your `.env` file:

```bash
# For OpenAI provider
OPENAI_API_KEY=sk-...

# For Anthropic provider
ANTHROPIC_API_KEY=sk-ant-...
```

## Installation Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Run the examples:**
   ```bash
   npx tsx src/agents/examples.langgraph.ts
   ```

## Package Versions

- **@langchain/core**: Core LangChain primitives (messages, prompts, etc.)
- **@langchain/openai**: OpenAI integration for LangChain
- **@langchain/anthropic**: Anthropic/Claude integration for LangChain
- **@langgraph/graph**: Graph-based workflow engine
- **@langgraph/prebuilt**: Pre-built nodes and utilities (ToolNode, etc.)

## Troubleshooting

### Module Not Found Errors

If you see errors like:
```
Cannot find module '@langchain/openai'
```

Make sure you've installed all dependencies:
```bash
npm install @langchain/core @langchain/openai @langchain/anthropic @langgraph/graph @langgraph/prebuilt
```

### Type Errors

If you get TypeScript errors, ensure you have the latest version of TypeScript:
```bash
npm install -D typescript@latest
```

### API Key Errors

If you get authentication errors:
1. Check that your `.env` file exists and contains valid API keys
2. Verify the key format matches the provider's requirements
3. Ensure the API key has the necessary permissions

## Alternative: Use Existing Google ADK Implementation

If you don't want to install additional dependencies, you can use the existing Google ADK implementation in `DataResolutionAgent.service.ts` which is already set up and working.

The LangGraph implementation provides:
- Graph-based workflow control
- Better debugging capabilities
- More flexibility for complex workflows
- Support for multiple LLM providers

Choose based on your needs!
