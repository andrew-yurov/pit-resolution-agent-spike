"""
Data Resolution Agent

Uses LangGraph's ReAct pattern to:
1. Parse user's natural language prompt
2. Search for appropriate data sources
3. Select the best data source based on requirements
4. Fetch sample data

ReAct Loop: Thought → Action → Observation → Repeat
"""

import os
from typing import Any, Dict, List, Optional
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage
from langgraph.prebuilt import create_react_agent

from ..tools import data_resolution_tools


class DataResolutionAgent:
    """Data Resolution Agent using LangGraph ReAct pattern"""

    def __init__(self, api_key: Optional[str] = None):
        """Initialize the agent with Claude model and tools.
        
        Args:
            api_key: Anthropic API key (defaults to ANTHROPIC_API_KEY env var)
        """
        # Initialize the Claude model
        self.model = ChatAnthropic(
            model="claude-3-5-sonnet-20241022",
            temperature=0,
            api_key=api_key or os.getenv("ANTHROPIC_API_KEY"),
        )

        # Create the ReAct agent with tools
        self.agent = create_react_agent(self.model, data_resolution_tools)

    async def resolve_data_sources(self, prompt: str) -> Dict[str, Any]:
        """Process a user prompt and resolve appropriate data sources.
        
        Args:
            prompt: Natural language prompt describing data needs
            
        Returns:
            Dictionary with success status, messages, selected sources, and reasoning
        """
        try:
            print(f"\n🤖 Data Resolution Agent processing: '{prompt}'\n")

            # System message to guide the agent
            system_prompt = """You are a Data Resolution Agent. Your job is to:
1. Understand what data the user needs based on their natural language prompt
2. Search for available data sources that can provide that data
3. Compare sources if multiple options exist
4. Select the best data source(s) based on the requirements
5. Provide a clear explanation of your decision

When you've identified the right data source(s), explain your reasoning and list them."""

            # Create the input with system context
            full_prompt = f"""{system_prompt}

User Request: {prompt}

Please help me find the right data source(s) for this request."""

            # Invoke the agent
            result = await self.agent.ainvoke({"messages": [HumanMessage(content=full_prompt)]})

            # Extract the final response
            messages = result.get("messages", [])
            final_message = messages[-1] if messages else None
            reasoning = final_message.content if final_message else "No response generated"

            # Extract selected sources from the conversation
            selected_sources = self._extract_data_sources(messages)

            print(f"\n✅ Agent completed reasoning\n")
            print(f"Selected sources: {', '.join(selected_sources)}")

            return {
                "success": True,
                "messages": messages,
                "selected_sources": selected_sources,
                "reasoning": reasoning,
            }

        except Exception as error:
            print(f"❌ Error in Data Resolution Agent: {error}")
            return {
                "success": False,
                "messages": [],
                "selected_sources": [],
                "reasoning": "",
                "error": str(error),
            }

    def _extract_data_sources(self, messages: List[Any]) -> List[str]:
        """Extract data source IDs mentioned in the agent's conversation.
        
        Args:
            messages: List of messages from the agent conversation
            
        Returns:
            List of data source IDs
        """
        sources = set()
        known_sources = ["glassdoor", "similarweb", "linkedin", "crunchbase"]

        for message in messages:
            content = str(message.content) if hasattr(message, "content") else str(message)
            content_lower = content.lower()

            for source in known_sources:
                if source in content_lower:
                    sources.add(source)

        return list(sources)

    async def simple_query(self, question: str) -> str:
        """Simple query method for testing without full ReAct loop.
        
        Args:
            question: Question to ask the model
            
        Returns:
            Response string
        """
        try:
            response = await self.model.ainvoke([HumanMessage(content=question)])
            return str(response.content)
        except Exception as error:
            return f"Error: {str(error)}"


async def run_example_queries():
    """Example usage function"""
    agent = DataResolutionAgent()

    examples = [
        "I need employee sentiment data for Tesla",
        "Get me web traffic analytics for Amazon and its competitors",
        "Find funding information for early-stage AI startups",
        "I want to compare employee satisfaction between Google and Microsoft",
    ]

    print("🚀 Running Data Resolution Agent Examples\n")
    print("=" * 80)

    for prompt in examples:
        print(f"\n\n📝 PROMPT: {prompt}")
        print("-" * 80)

        result = await agent.resolve_data_sources(prompt)

        if result["success"]:
            print(f"\n💡 REASONING:\n{result['reasoning']}")
            print(
                f"\n✨ SELECTED SOURCES: {', '.join(result['selected_sources']) or 'None'}"
            )
        else:
            print(f"\n❌ ERROR: {result.get('error')}")

        print("=" * 80)
