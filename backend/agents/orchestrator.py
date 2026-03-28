"""Orchestrator Agent — generates slides from user content using a single LLM call."""

from __future__ import annotations

import json
import logging
import os
from typing import List, Union
from models.slides import Slide, SlideType

logger = logging.getLogger(__name__)

SLIDE_GENERATION_PROMPT = """You are Deckless, an AI presentation generator. Given the user's content, create a compelling presentation.

Generate 5-8 presentation slides and return them as a JSON object with a "slides" key.

Each slide in the array must follow this exact schema:
{
  "id": "slide_001",
  "type": "title",
  "title": "Slide Title",
  "body": ["Bullet 1", "Bullet 2"],
  "media": [],
  "speaker_notes": "Notes for presenter",
  "trigger_words": ["keyword1", "keyword2"]
}

Valid values for "type": "title", "concept", "comparison", "timeline", "evidence", "conclusion"

Rules:
- First slide MUST have type "title"
- Last slide MUST have type "conclusion"
- Use a mix of types for middle slides
- Each slide should have 2-4 body bullets
- Speaker notes should be concise guidance for the presenter
- Trigger words should be 2-3 keywords relevant to the slide content
- Make the content engaging, clear, and professional
- If the user's input is vague, create a general but impressive presentation about the topic
- When images or documents are included, use them to inform titles, bullets, and narrative

Return ONLY valid JSON: {"slides": [...]}
"""


async def generate_slides_with_llm(user_content: Union[str, list]) -> List[dict]:
    """Generate slides using a direct OpenAI call."""
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SLIDE_GENERATION_PROMPT},
            {"role": "user", "content": user_content},
        ],
        temperature=0.7,
        response_format={"type": "json_object"},
    )

    result_text = response.choices[0].message.content or "{}"
    logger.info(f"LLM raw response (first 500 chars): {result_text[:500]}")

    # Parse the JSON
    parsed = json.loads(result_text)
    logger.info(f"Parsed JSON type: {type(parsed).__name__}, keys: {list(parsed.keys()) if isinstance(parsed, dict) else 'N/A'}")

    # Extract slides array from various possible wrapper keys
    if isinstance(parsed, dict):
        # Try common key names
        slides_data = None
        for key in ["slides", "presentation", "data", "results"]:
            if key in parsed:
                slides_data = parsed[key]
                break
        if slides_data is None:
            # If dict has a single key with a list value, use that
            for key, value in parsed.items():
                if isinstance(value, list):
                    slides_data = value
                    break
            else:
                slides_data = []
    elif isinstance(parsed, list):
        slides_data = parsed
    else:
        slides_data = []

    logger.info(f"Found {len(slides_data)} raw slides")

    # Validate through Pydantic, skip invalid slides rather than failing all
    validated = []
    for i, s in enumerate(slides_data):
        try:
            slide = Slide(**s)
            validated.append(slide.model_dump())
        except Exception as e:
            logger.warning(f"Slide {i} validation failed: {e} — raw: {s}")

    logger.info(f"Validated {len(validated)} slides out of {len(slides_data)}")
    return validated


REFINE_EXPAND_PROMPT = """You are Deckless. You receive a full presentation as JSON (a "slides" array) and a target slide index.

Task — EXPAND: Insert exactly 2 new slides immediately AFTER the slide at slide_index. The new slides must cover distinct related subtopics that branch from that slide (wider coverage, adjacent angles the audience expects next). Do not remove or duplicate existing slides.

Rules:
- Return ONLY valid JSON: {"slides": [...]} with the COMPLETE updated array in presentation order.
- New slides need unique "id" values (e.g. slide_branch_01).
- Valid "type" values: "title", "concept", "comparison", "timeline", "evidence", "conclusion"
- Each new slide: 2-4 body bullets, speaker_notes, 2-3 trigger_words
- If the deck ends with type "conclusion", keep that slide as the very last slide after your insertions (shift it after the new slides if needed).
"""


REFINE_DEEPEN_PROMPT = """You are Deckless. You receive a full presentation as JSON (a "slides" array) and a target slide index.

Task — DEEPEN: Enrich ONLY the slide at slide_index. Add substantive detail: more specific bullets (up to 6 body lines total), clearer speaker_notes with examples or caveats, and refined trigger_words if needed. You may slightly sharpen the title if it helps clarity. All other slides must be unchanged (same order, same ids, same content).

Rules:
- Return ONLY valid JSON: {"slides": [...]} with the COMPLETE array.
- Do not insert or remove slides.
"""


async def refine_slide_deck_with_llm(
    slides: List[dict], slide_index: int, mode: str
) -> List[dict]:
    """Return full deck after expand or deepen via LLM."""
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    system = REFINE_EXPAND_PROMPT if mode == "expand" else REFINE_DEEPEN_PROMPT
    user_payload = json.dumps(
        {"slides": slides, "slide_index": slide_index, "mode": mode},
        ensure_ascii=False,
    )

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_payload},
        ],
        temperature=0.6,
        response_format={"type": "json_object"},
    )

    result_text = response.choices[0].message.content or "{}"
    parsed = json.loads(result_text)

    if isinstance(parsed, dict):
        slides_data = None
        for key in ["slides", "presentation", "data", "results"]:
            if key in parsed:
                slides_data = parsed[key]
                break
        if slides_data is None:
            for _key, value in parsed.items():
                if isinstance(value, list):
                    slides_data = value
                    break
            else:
                slides_data = []
    elif isinstance(parsed, list):
        slides_data = parsed
    else:
        slides_data = []

    validated: List[dict] = []
    for i, s in enumerate(slides_data):
        try:
            slide = Slide(**s)
            validated.append(slide.model_dump())
        except Exception as e:
            logger.warning(f"Refine slide {i} validation failed: {e} — raw: {s}")

    return validated
