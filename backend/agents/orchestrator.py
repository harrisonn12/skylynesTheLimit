"""Orchestrator Agent — generates slides from user content using a single LLM call."""

from __future__ import annotations

import json
import os
from typing import List
from models.slides import Slide, SlideType

SLIDE_GENERATION_PROMPT = """You are SlideForge, an AI presentation generator. Given the user's content, create a compelling presentation.

Generate a JSON array of 5-8 presentation slides. Each slide must follow this exact schema:
{
  "id": "slide_001",
  "type": "title | concept | comparison | timeline | evidence | conclusion",
  "title": "Slide Title",
  "body": ["Bullet 1", "Bullet 2"],
  "media": [],
  "speaker_notes": "Notes for presenter",
  "trigger_words": ["keyword1", "keyword2"]
}

Rules:
- First slide MUST be type "title"
- Last slide MUST be type "conclusion"
- Use a mix of types: concept, comparison, timeline, evidence
- Each slide should have 2-4 body bullets
- Speaker notes should be concise guidance for the presenter
- Trigger words should be 2-3 keywords relevant to the slide content
- Make the content engaging, clear, and professional
- If the user's input is vague, create a general but impressive presentation about the topic

Return ONLY a valid JSON array. No markdown fences, no explanation, just the JSON array."""


async def generate_slides_with_llm(content: str) -> List[dict]:
    """Generate slides using a direct OpenAI call (simpler than nested Railtracks agents for hackathon)."""
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SLIDE_GENERATION_PROMPT},
            {"role": "user", "content": content},
        ],
        temperature=0.7,
        response_format={"type": "json_object"},
    )

    result_text = response.choices[0].message.content or "[]"

    # Parse the JSON
    parsed = json.loads(result_text)

    # Handle both {"slides": [...]} and [...] formats
    if isinstance(parsed, dict) and "slides" in parsed:
        slides_data = parsed["slides"]
    elif isinstance(parsed, list):
        slides_data = parsed
    else:
        slides_data = []

    # Validate through Pydantic
    return [Slide(**s).model_dump() for s in slides_data]
