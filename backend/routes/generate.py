"""FastAPI route for slide generation."""

from __future__ import annotations

from fastapi import APIRouter

from agents.pipeline import run_pipeline
from models.slides import GenerateRequest, GenerateResponse
from thread_context import compile_messages_for_slide_generation

router = APIRouter()


@router.post("/api/generate", response_model=GenerateResponse)
async def generate_slides(request: GenerateRequest) -> GenerateResponse:
    """Accept user content and return generated slides.

    In mock mode (no OPENAI_API_KEY), returns hardcoded sample slides.
    In live mode, runs the full Railtracks multi-agent pipeline.
    """
    if request.messages:
        user_payload = compile_messages_for_slide_generation(request.messages)
    else:
        user_payload = (request.content or "").strip()
    slides = await run_pipeline(user_payload)
    return GenerateResponse(slides=slides)
