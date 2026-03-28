"""Main pipeline entry point — runs the Railtracks agent flow or returns mock data."""

from __future__ import annotations

import json
import os
from typing import List

from models.slides import Slide, SlideType

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


def run_pipeline(content: str) -> List[dict]:
    """Run the slide generation pipeline.

    In mock mode (no OPENAI_API_KEY), returns hardcoded sample slides.
    In live mode, runs the full Railtracks orchestrator flow.

    Args:
        content: Raw user content to convert into slides.

    Returns:
        A list of slide dictionaries conforming to the Slide schema.
    """
    if _is_mock_mode():
        # Validate mock data against Pydantic models for consistency
        return [Slide(**s).model_dump() for s in MOCK_SLIDES]

    # Live mode — run the Railtracks orchestrator
    import railtracks as rt  # noqa: delay import so mock mode works without railtracks installed

    from agents.orchestrator import create_orchestrator

    orchestrator = create_orchestrator()
    flow = rt.Flow(name="Slide Generation Pipeline", entry_point=orchestrator)
    raw_result = flow.invoke(content)

    # Parse the agent output into validated Slide objects
    try:
        slides_data = json.loads(str(raw_result))
        if isinstance(slides_data, dict) and "slides" in slides_data:
            slides_data = slides_data["slides"]
        slides = [Slide(**s).model_dump() for s in slides_data]
    except (json.JSONDecodeError, TypeError, ValueError):
        # Fallback: return mock slides if parsing fails
        slides = [Slide(**s).model_dump() for s in MOCK_SLIDES]

    return slides
