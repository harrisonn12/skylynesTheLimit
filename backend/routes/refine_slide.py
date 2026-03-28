"""FastAPI route for expanding or deepening a single slide in a deck."""

from __future__ import annotations

from fastapi import APIRouter

from agents.pipeline import refine_slide_deck
from models.slides import RefineSlideRequest, RefineSlideResponse, Slide

router = APIRouter()


@router.post("/api/refine-slide", response_model=RefineSlideResponse)
async def refine_slide(request: RefineSlideRequest) -> RefineSlideResponse:
    """Expand (insert related slides after index) or deepen (enrich slide in place)."""
    raw = [s.model_dump() for s in request.slides]
    updated = await refine_slide_deck(raw, request.slide_index, request.mode)
    return RefineSlideResponse(slides=[Slide(**s) for s in updated])
