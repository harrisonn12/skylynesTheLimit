"""Slide Creation Agent — transforms ingredients into structured slide JSON."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

import railtracks as rt

if TYPE_CHECKING:
    pass

CREATION_SYSTEM_MESSAGE = """You are a Slide Creation Agent. Given slide ingredients (key_message, supporting_points, media_candidates, tags, narrative_hooks), produce a JSON array of 5-8 presentation slides.

Each slide must follow this schema:
{
  "id": "slide_001",
  "type": "title | concept | comparison | timeline | evidence | conclusion",
  "title": "Slide Title",
  "body": ["Bullet 1", "Bullet 2"],
  "media": [],
  "speaker_notes": "Notes for presenter",
  "trigger_words": ["keyword1", "keyword2"]
}

Guidelines:
- First slide should be type "title"
- Last slide should be type "conclusion"
- Use a mix of types: concept, comparison, timeline, evidence
- Each slide should have 2-4 body bullets
- Speaker notes should be concise guidance for the presenter
- Trigger words should be 2-3 keywords relevant to the slide content

Return ONLY a valid JSON array of slide objects, no markdown fences."""


@rt.function_node
def format_slides(text: str) -> str:
    """Pass-through tool for slide JSON formatting."""
    return text


def create_creation_agent() -> rt.AgentNode:
    """Create and return the Slide Creation Agent node."""
    return rt.agent_node(
        "Slide Creation Agent",
        tool_nodes=[format_slides],
        llm=rt.llm.OpenAILLM("gpt-4o"),
        system_message=CREATION_SYSTEM_MESSAGE,
    )
