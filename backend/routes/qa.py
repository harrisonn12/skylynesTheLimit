"""FastAPI route for live presentation Q&A grounded in chat + attachments."""

from __future__ import annotations

import os

from fastapi import APIRouter
from openai import AsyncOpenAI

from models.slides import QaRequest, QaResponse
from thread_context import compile_messages_for_live_qa

router = APIRouter()

SYSTEM = (
    "You are Deckless live Q&A. Answer clearly for a spoken presentation: short "
    "paragraphs, no markdown headings. Ground every claim in the knowledge base; "
    "if it is not there, say so honestly."
)


def _slides_context(slides: list[dict] | None) -> str:
    if not slides:
        return ""
    lines: list[str] = ["\n\n### Current slide deck (titles and bullets)\n"]
    for i, s in enumerate(slides):
        title = (s.get("title") or "").strip()
        body = s.get("body") or []
        lines.append(f"\nSlide {i + 1}: {title}")
        if isinstance(body, list):
            for item in body:
                if isinstance(item, str) and item.strip():
                    lines.append(f"  • {item}")
        elif isinstance(body, str) and body.strip():
            lines.append(f"  {body}")
    return "\n".join(lines)


def _build_user_content(
    kb: str | list,
    slide_block: str,
    question: str,
) -> str | list:
    tail = (
        f"{slide_block}\n\n---\n\nQuestion:\n{question.strip()}\n\n"
        "Answer concisely for a live audience (about 2–6 sentences unless the "
        "question clearly needs more)."
    )
    if isinstance(kb, list):
        return [*kb, {"type": "text", "text": tail}]
    return f"{kb}\n{tail}"


@router.post("/api/qa", response_model=QaResponse)
async def live_qa(request: QaRequest) -> QaResponse:
    q = request.question.strip()
    if request.messages:
        kb = compile_messages_for_live_qa(request.messages)
    else:
        kb = (request.content or "").strip() or "(No chat context or attachments.)"

    slide_block = _slides_context(request.slides)
    user_content = _build_user_content(kb, slide_block, q)

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        preview = q[:120] + ("…" if len(q) > 120 else "")
        return QaResponse(
            answer=(
                "[Mock mode — set OPENAI_API_KEY for real answers.] "
                f"I would ground an answer about “{preview}” in your uploaded "
                "materials and slide deck."
            )
        )

    client = AsyncOpenAI(api_key=api_key)
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": user_content},
        ],
        temperature=0.35,
        max_tokens=600,
    )
    text = (response.choices[0].message.content or "").strip()
    if not text:
        return QaResponse(answer="I could not generate an answer. Please try again.")
    return QaResponse(answer=text)
