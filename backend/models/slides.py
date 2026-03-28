"""Pydantic models for slide ingredients and slide output."""

from __future__ import annotations

from enum import Enum
from typing import Any, List, Optional

from pydantic import BaseModel, Field, model_validator


class SlideType(str, Enum):
    TITLE = "title"
    CONCEPT = "concept"
    COMPARISON = "comparison"
    TIMELINE = "timeline"
    EVIDENCE = "evidence"
    CONCLUSION = "conclusion"


class SlideIngredients(BaseModel):
    """Structured ingredients extracted from raw content."""

    key_message: str = Field(..., description="The core message to convey")
    supporting_points: List[str] = Field(
        default_factory=list, description="Supporting bullet points"
    )
    media_candidates: List[str] = Field(
        default_factory=list, description="Suggested media or visual references"
    )
    tags: List[str] = Field(
        default_factory=list, description="Topic tags for categorisation"
    )
    narrative_hooks: List[str] = Field(
        default_factory=list, description="Hooks to engage the audience"
    )


class Slide(BaseModel):
    """A single presentation slide."""

    id: str = Field(default="slide_000", description="Unique slide identifier, e.g. slide_001")
    type: str = Field(default="concept", description="Layout type of the slide")
    title: str = Field(default="", description="Slide title")
    body: List[str] = Field(default_factory=list, description="Bullet points / body text")
    media: List[str] = Field(default_factory=list, description="Media asset references")
    speaker_notes: str = Field(default="", description="Notes for the presenter")
    trigger_words: List[str] = Field(
        default_factory=list,
        description="Keywords that can trigger navigation to this slide via voice",
    )


class GenerateRequest(BaseModel):
    """Request body for the /api/generate endpoint."""

    content: Optional[str] = Field(
        default=None,
        description="Plain text (legacy). Used when messages is empty or omitted.",
    )
    messages: Optional[List[dict[str, Any]]] = Field(
        default=None,
        description="Full chat thread (same shapes as /api/chat). Preferred when non-empty.",
    )

    @model_validator(mode="after")
    def require_some_input(self) -> GenerateRequest:
        has_messages = bool(self.messages)
        has_content = bool(self.content and str(self.content).strip())
        if not has_messages and not has_content:
            raise ValueError("Provide non-empty `messages` or `content`")
        return self


class GenerateResponse(BaseModel):
    """Response body for the /api/generate endpoint."""

    slides: List[Slide]
