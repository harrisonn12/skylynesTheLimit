"""FastAPI route for slide generation."""

from __future__ import annotations

from fastapi import APIRouter

from agents.pipeline import run_pipeline
from models.slides import GenerateRequest, GenerateResponse

router = APIRouter()


@router.post("/api/generate", response_model=GenerateResponse)
async def generate_slides(request: GenerateRequest) -> GenerateResponse:
    """Accept user content and return generated slides.

    In mock mode (no OPENAI_API_KEY), returns hardcoded sample slides.
    In live mode, runs the full Railtracks multi-agent pipeline.
    """
    slides = await run_pipeline(request.content)
    return GenerateResponse(slides=slides)
