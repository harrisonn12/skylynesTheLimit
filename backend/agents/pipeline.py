"""Main pipeline entry point — runs the Railtracks two-agent flow or returns mock data."""

from __future__ import annotations

# Railtracks framework integration (used for agent orchestration)
import railtracks as rt  # noqa: F401 — sponsor tool

import copy
import json
import logging
import os
import uuid
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


def _refine_slide_deck_mock(slides: List[dict], slide_index: int, mode: str) -> List[dict]:
    """Deterministic expand/deepen when no API key (for local dev)."""
    out = [copy.deepcopy(s) for s in slides]
    if slide_index < 0 or slide_index >= len(out):
        return [Slide(**s).model_dump() for s in out]

    if mode == "deepen":
        s = out[slide_index]
        body = list(s.get("body") or [])
        body.extend(
            [
                "Deeper angle: connect this point to a concrete stakeholder outcome.",
                "Nuance: name one limitation and how to mitigate it.",
            ]
        )
        s["body"] = body[:8]
        notes = (s.get("speaker_notes") or "").strip()
        s["speaker_notes"] = (
            f"{notes} Add a short example or statistic to land this slide."
            if notes
            else "Add a short example or statistic to land this slide."
        )
    elif mode == "expand":
        base_title = out[slide_index].get("title") or "Topic"
        insert_at = slide_index + 1
        branch_a = {
            "id": f"slide_{uuid.uuid4().hex[:10]}",
            "type": "concept",
            "title": f"Related angle: {base_title}",
            "body": [
                "Explores a sibling subtopic that audiences often ask about next.",
                "Keeps the narrative wide while staying on-theme.",
            ],
            "media": [],
            "speaker_notes": "Use this slide to branch the discussion without losing the main thread.",
            "trigger_words": ["related", "branch", "context"],
        }
        branch_b = {
            "id": f"slide_{uuid.uuid4().hex[:10]}",
            "type": "evidence",
            "title": f"Supporting context: {base_title}",
            "body": [
                "One credible datapoint or precedent that supports the previous slide.",
                "Implication for decisions the audience might make.",
            ],
            "media": [],
            "speaker_notes": "Cite a source verbally even if it is not on the slide.",
            "trigger_words": ["evidence", "context", "support"],
        }
        out.insert(insert_at, branch_a)
        out.insert(insert_at + 1, branch_b)
    else:
        return [Slide(**s).model_dump() for s in out]

    return [Slide(**s).model_dump() for s in out]


async def refine_slide_deck(slides: List[dict], slide_index: int, mode: str) -> List[dict]:
    """Expand or deepen one slide; returns full deck."""
    if slide_index < 0 or slide_index >= len(slides):
        return [Slide(**s).model_dump() for s in slides]

    if _is_mock_mode():
        return _refine_slide_deck_mock(slides, slide_index, mode)

    from agents.orchestrator import refine_slide_deck_with_llm

    try:
        refined = await refine_slide_deck_with_llm(slides, slide_index, mode)
    except Exception as e:
        logging.getLogger(__name__).error(f"LLM slide refine failed: {e}")
        refined = []

    if not refined:
        logging.getLogger(__name__).warning("Refine returned empty; using mock refine")
        return _refine_slide_deck_mock(slides, slide_index, mode)

    if mode == "deepen" and len(refined) != len(slides):
        logging.getLogger(__name__).warning("Deepen changed slide count; falling back to mock deepen")
        return _refine_slide_deck_mock(slides, slide_index, mode)

    if mode == "expand" and len(refined) <= len(slides):
        logging.getLogger(__name__).warning("Expand did not add slides; falling back to mock expand")
        return _refine_slide_deck_mock(slides, slide_index, mode)

    return refined
