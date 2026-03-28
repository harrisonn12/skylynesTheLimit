"""Orchestrator Agent — coordinates the slide generation pipeline."""

from __future__ import annotations

import railtracks as rt

from backend.agents.ingredient_agent import create_ingredient_agent
from backend.agents.creation_agent import create_creation_agent

ORCHESTRATOR_SYSTEM_MESSAGE = """You are the Slide Orchestrator. You coordinate a two-step pipeline to turn raw user content into presentation slides.

Step 1: Send the user's content to the Slide Ingredient Agent to extract structured ingredients (key_message, supporting_points, media_candidates, tags, narrative_hooks).
Step 2: Send the extracted ingredients to the Slide Creation Agent to produce the final slide JSON array.

Always run both steps in sequence. Pass the full output of Step 1 as input to Step 2.
Return the final slide JSON array from Step 2 as your response."""


@rt.function_node
def extract_ingredients(content: str) -> str:
    """Invoke the ingredient extraction sub-agent."""
    agent = create_ingredient_agent()
    flow = rt.Flow(name="Ingredient Extraction", entry_point=agent)
    result = flow.invoke(content)
    return str(result)


@rt.function_node
def create_slides(ingredients_json: str) -> str:
    """Invoke the slide creation sub-agent."""
    agent = create_creation_agent()
    flow = rt.Flow(name="Slide Creation", entry_point=agent)
    result = flow.invoke(ingredients_json)
    return str(result)


def create_orchestrator() -> rt.AgentNode:
    """Create and return the Orchestrator Agent node."""
    return rt.agent_node(
        "Orchestrator",
        tool_nodes=[extract_ingredients, create_slides],
        llm=rt.llm.OpenAILLM("gpt-4o"),
        system_message=ORCHESTRATOR_SYSTEM_MESSAGE,
    )
