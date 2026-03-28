"""Main pipeline entry point — runs the Railtracks two-agent flow or returns mock data."""

from __future__ import annotations

# Railtracks framework integration (used for agent orchestration)
import railtracks as rt  # noqa: F401 — sponsor tool

import json
import logging
import os
from typing import List, Union

from dotenv import load_dotenv

load_dotenv()

from models.slides import Slide, SlideType

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Mock slide data (used when OPENAI_API_KEY is not set)
# ---------------------------------------------------------------------------

MOCK_SLIDES: List[dict] = [
    {
        "id": "slide_001",
        "type": "title",
        "title": "The Future of AI in Education",
        "body": ["Transforming how we learn", "Personalised, accessible, scalable"],
        "media": [],
        "speaker_notes": "Welcome the audience and introduce the topic of AI-driven education.",
        "trigger_words": ["future", "AI", "education"],
    },
    {
        "id": "slide_002",
        "type": "concept",
        "title": "What Is Adaptive Learning?",
        "body": [
            "AI models adjust content difficulty in real-time",
            "Tracks learner progress and gaps",
            "Delivers targeted exercises automatically",
        ],
        "media": [],
        "speaker_notes": "Explain the core concept of adaptive learning and why it matters.",
        "trigger_words": ["adaptive", "learning", "personalised"],
    },
    {
        "id": "slide_003",
        "type": "comparison",
        "title": "Traditional vs AI-Powered Classrooms",
        "body": [
            "Traditional: one-size-fits-all curriculum",
            "AI-Powered: individually paced pathways",
            "Traditional: delayed feedback via exams",
            "AI-Powered: instant, continuous assessment",
        ],
        "media": [],
        "speaker_notes": "Draw a clear contrast to help the audience see the value proposition.",
        "trigger_words": ["traditional", "comparison", "classroom"],
    },
    {
        "id": "slide_004",
        "type": "evidence",
        "title": "Results From Early Adopters",
        "body": [
            "30% improvement in test scores (Stanford pilot, 2025)",
            "Student engagement up 45% with AI tutors",
            "Teacher prep time reduced by 20%",
        ],
        "media": [],
        "speaker_notes": "Use concrete numbers to build credibility.",
        "trigger_words": ["results", "evidence", "data", "scores"],
    },
    {
        "id": "slide_005",
        "type": "conclusion",
        "title": "The Path Forward",
        "body": [
            "Start small: pilot AI tools in one course",
            "Measure outcomes rigorously",
            "Scale what works, iterate on what doesn't",
            "The future of education is personalised",
        ],
        "media": [],
        "speaker_notes": "End with a clear call to action.",
        "trigger_words": ["conclusion", "path", "forward", "action"],
    },
]


def _is_mock_mode() -> bool:
    """Return True when no OpenAI API key is available."""
    return not os.environ.get("OPENAI_API_KEY")


def _parse_slides_from_agent_output(raw: str) -> List[dict]:
    """Parse and validate slides from a Railtracks agent output string."""
    parsed = json.loads(str(raw))
    if isinstance(parsed, dict):
        slides_data = None
        for key in ["slides", "presentation", "data", "results"]:
            if key in parsed:
                slides_data = parsed[key]
                break
        if slides_data is None:
            for v in parsed.values():
                if isinstance(v, list):
                    slides_data = v
                    break
            else:
                slides_data = []
    elif isinstance(parsed, list):
        slides_data = parsed
    else:
        slides_data = []

    validated = []
    for i, s in enumerate(slides_data):
        try:
            validated.append(Slide(**s).model_dump())
        except Exception as e:
            logger.warning(f"Slide {i} validation failed: {e}")
    return validated


async def run_pipeline(user_content: Union[str, list]) -> List[dict]:
    """Run the slide generation pipeline.

    In mock mode (no OPENAI_API_KEY), returns hardcoded sample slides.
    In live mode, runs the two-stage Railtracks agent flow:
      1. IngredientAgent — extracts key_message, supporting_points, narrative_hooks
      2. CreationAgent   — produces the final slide JSON array

    Falls back to direct orchestrator call if the agent pipeline fails.
    """
    if _is_mock_mode():
        return [Slide(**s).model_dump() for s in MOCK_SLIDES]

    # Live mode — two-stage Railtracks agent pipeline
    try:
        from agents.ingredient_agent import create_ingredient_agent
        from agents.creation_agent import create_creation_agent

        IngredientAgent = create_ingredient_agent()
        CreationAgent = create_creation_agent()

        # Agents accept plain strings — stringify multimodal content lists
        content_str = (
            user_content
            if isinstance(user_content, str)
            else json.dumps(user_content)
        )

        # Stage 1: extract structured slide ingredients
        logger.info("Railtracks: running IngredientAgent")
        ingredients_json = await rt.call(IngredientAgent, content_str)
        logger.info(f"Ingredients: {str(ingredients_json)[:400]}")

        # Stage 2: generate slides from ingredients
        logger.info("Railtracks: running CreationAgent")
        slides_raw = await rt.call(CreationAgent, str(ingredients_json))
        logger.info(f"Slides raw (first 400): {str(slides_raw)[:400]}")

        slides = _parse_slides_from_agent_output(str(slides_raw))
        if slides:
            logger.info(f"Railtracks pipeline produced {len(slides)} slides")
            return slides

        logger.warning("Railtracks pipeline returned 0 valid slides — falling back to orchestrator")

    except Exception as e:
        logger.error(f"Railtracks pipeline failed: {e} — falling back to orchestrator")

    # Fallback: single direct LLM call
    from agents.orchestrator import generate_slides_with_llm
    try:
        slides = await generate_slides_with_llm(user_content)
    except Exception as e:
        logger.error(f"Orchestrator failed: {e}")
        slides = []

    if not slides:
        logger.warning("Orchestrator returned 0 slides, using mock fallback")
        slides = [Slide(**s).model_dump() for s in MOCK_SLIDES]

    return slides
