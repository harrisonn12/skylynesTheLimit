"""Slide Ingredient Agent — extracts structured ingredients from raw content."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

import railtracks as rt

if TYPE_CHECKING:
    pass

INGREDIENT_SYSTEM_MESSAGE = """You are a Slide Ingredient Extractor. Given raw content from a user, extract structured slide ingredients.

Return a JSON object with these fields:
- key_message (string): The single most important takeaway
- supporting_points (list of strings): 3-5 supporting bullet points
- media_candidates (list of strings): Suggested visuals, charts, or images
- tags (list of strings): Topic tags
- narrative_hooks (list of strings): Engaging hooks or questions for the audience

Return ONLY valid JSON, no markdown fences."""


@rt.function_node
def parse_ingredients(text: str) -> str:
    """Pass-through tool that echoes structured ingredient JSON."""
    return text


def create_ingredient_agent() -> rt.AgentNode:
    """Create and return the Slide Ingredient Agent node."""
    return rt.agent_node(
        "Slide Ingredient Agent",
        tool_nodes=[parse_ingredients],
        llm=rt.llm.OpenAILLM("gpt-4o"),
        system_message=INGREDIENT_SYSTEM_MESSAGE,
    )
