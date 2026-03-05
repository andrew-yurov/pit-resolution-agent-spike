"""
Data Resolution Agent using Google ADK

Uses Google's Generative AI with function calling to:
1. Parse user's natural language prompt
2. Search for appropriate data sources
3. Select the best data source based on requirements
4. Fetch sample data

Implements a ReAct-like pattern using Google's function calling.
"""

import os
import json
from typing import Any, Dict, List, Optional
import google.generativeai as genai
from google.generativeai.types import FunctionDeclaration, Tool

from ..tools import TOOL_DECLARATIONS, TOOL_FUNCTIONS


class DataResolutionAgent:
    """Data Resolution Agent using Google ADK"""

    def __init__(self, api_key: Optional[str] = None):
        """Initialize the agent with Google's Gemini model and tools.

        Args:
            api_key: Google API key (defaults to GOOGLE_API_KEY env var)
        """
        # Configure Google AI
        api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable must be set")
        
        genai.configure(api_key=api_key)

        # Create function declarations from tool definitions
        function_declarations = []
        for tool_def in TOOL_DECLARATIONS:
            func_decl = FunctionDeclaration(
                name=tool_def["name"],
                description=tool_def["description"],
                parameters=tool_def["parameters"],
            )
            function_declarations.append(func_decl)

        # Create tool with all function declarations
        self.tools = [Tool(function_declarations=function_declarations)]

        # Initialize the model with tools
        self.model = genai.GenerativeModel(
            model_name="gemini-2.0-flash-exp",  # Latest model with function calling
            tools=self.tools,
        )

    async def resolve_data_sources(self, prompt: str) -> Dict[str, Any]:
        """Process a user prompt and resolve appropriate data sources.

        Args:
            prompt: Natural language prompt describing data needs

        Returns:
            Dictionary with success status, messages, selected sources, and reasoning
        """
        try:
            print(f"\n🤖 Data Resolution Agent processing: '{prompt}'\n")

            # System instruction to guide the agent
            system_instruction = """You are a Data Resolution Agent. Your job is to:
1. Understand what data the user needs based on their natural language prompt
2. Search for available data sources that can provide that data
3. Compare sources if multiple options exist
4. Select the best data source(s) based on the requirements
5. Provide a clear explanation of your decision

When you've identified the right data source(s), explain your reasoning and list them clearly."""

            # Create a chat session
            chat = self.model.start_chat(enable_automatic_function_calling=True)

            # Send the prompt with system context
            full_prompt = f"""{system_instruction}

User Request: {prompt}

Please help me find the right data source(s) for this request."""

            # Keep track of conversation
            messages = []
            max_iterations = 10
            iteration = 0

            # Initial response
            response = chat.send_message(full_prompt)
            messages.append({"role": "user", "content": full_prompt})

            # Process function calls in a loop (manual ReAct pattern)
            while iteration < max_iterations:
                iteration += 1

                # Check if there are function calls
                if response.candidates and response.candidates[0].content.parts:
                    parts = response.candidates[0].content.parts
                    
                    # Check for function calls
                    has_function_call = any(hasattr(part, 'function_call') for part in parts)
                    
                    if has_function_call:
                        # Execute function calls
                        for part in parts:
                            if hasattr(part, 'function_call'):
                                function_call = part.function_call
                                function_name = function_call.name
                                function_args = dict(function_call.args)

                                print(f"🔧 Calling function: {function_name}({function_args})")

                                # Execute the function
                                if function_name in TOOL_FUNCTIONS:
                                    result = TOOL_FUNCTIONS[function_name](**function_args)
                                    messages.append({
                                        "role": "function",
                                        "name": function_name,
                                        "content": result
                                    })

                                    # Send function result back to the model
                                    response = chat.send_message(
                                        genai.protos.Content(
                                            parts=[
                                                genai.protos.Part(
                                                    function_response=genai.protos.FunctionResponse(
                                                        name=function_name,
                                                        response={"result": result}
                                                    )
                                                )
                                            ]
                                        )
                                    )
                    else:
                        # No more function calls, get the final text response
                        final_text = response.text
                        messages.append({"role": "assistant", "content": final_text})
                        break
                else:
                    break

            # Extract the final response
            reasoning = response.text if hasattr(response, 'text') else "No response generated"

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

    def _extract_data_sources(self, messages: List[Dict[str, Any]]) -> List[str]:
        """Extract data source IDs mentioned in the agent's conversation.

        Args:
            messages: List of messages from the agent conversation

        Returns:
            List of data source module_keys
        """
        sources = set()
        known_sources = [
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
        ]

        for message in messages:
            content = str(message.get("content", ""))
            content_lower = content.lower()

            for source in known_sources:
                if source in content_lower:
                    sources.add(source)

        return list(sources)

    async def simple_query(self, question: str) -> str:
        """Simple query method for testing without function calling.

        Args:
            question: Question to ask the model

        Returns:
            Response string
        """
        try:
            # Create model without tools for simple queries
            simple_model = genai.GenerativeModel(model_name="gemini-2.0-flash-exp")
            response = simple_model.generate_content(question)
            return response.text
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
