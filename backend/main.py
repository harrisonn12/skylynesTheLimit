import json
import logging
import os
import uuid
from datetime import datetime

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request as FastAPIRequest
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from openai import OpenAI
from pydantic import BaseModel

from routes.generate import router as generate_router

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(title="Agent Backend")

app.include_router(generate_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]


def generate_mock_response(messages: list[Message]):
    """Generate a mock streaming response in AI SDK UI Message Stream (SSE) format.

    Format: Server-Sent Events with JSON UIMessageChunk objects.
    See: https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol#ui-message-stream-protocol
    """
    user_message = messages[-1].content if messages else "Hello"

    response_text = (
        f"I received your message: \"{user_message}\". "
        "I'm running in mock mode (no API key). In the real app I'd ask a few "
        "focused questions about your audience, goal, and key points, and remind "
        "you to drag files into the composer or use the attach button if you have "
        "outlines or decks to share."
    )

    text_part_id = str(uuid.uuid4())

    # Start message
    yield f"data: {json.dumps({'type': 'start', 'messageId': str(uuid.uuid4())})}\n\n"

    # Start step
    yield f"data: {json.dumps({'type': 'start-step'})}\n\n"

    # Text start
    yield f"data: {json.dumps({'type': 'text-start', 'id': text_part_id})}\n\n"

    # Text deltas — stream word by word
    for word in response_text.split(" "):
        yield f"data: {json.dumps({'type': 'text-delta', 'id': text_part_id, 'delta': word + ' '})}\n\n"

    # Text end
    yield f"data: {json.dumps({'type': 'text-end', 'id': text_part_id})}\n\n"

    # Finish step
    yield f"data: {json.dumps({'type': 'finish-step'})}\n\n"

    # Finish message
    yield f"data: {json.dumps({'type': 'finish', 'finishReason': 'stop'})}\n\n"

    # SSE done signal
    yield "data: [DONE]\n\n"


def generate_real_response(messages: list[Message]):
    """Stream a real response from OpenAI in AI SDK UI Message Stream SSE format."""
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

    completion = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are SlideForge, an AI presentation assistant.\n\n"
                    "When the user describes a slide deck, topic, or presentation idea, walk "
                    "them through clarifications in a natural back-and-forth. Each reply "
                    "should ask only a few focused questions at a time (for example: "
                    "audience, primary goal, must-cover points, approximate length or slide "
                    "count, tone, brand or format constraints). Spread questions across "
                    "several turns rather than dumping a long checklist in one message.\n\n"
                    "Early in the conversation, remind them they can drag and drop files "
                    "onto the message box (composer) or use the paperclip / attach button "
                    "to add outlines, existing decks, PDFs, notes, or images if they have any.\n\n"
                    "Stay concise and conversational. When you have enough context, briefly "
                    "summarize what you understood and mention they can use Generate when ready."
                ),
            },
            *[{"role": m.role, "content": m.content} for m in messages],
        ],
        stream=True,
    )

    text_part_id = str(uuid.uuid4())

    # Start message
    yield f"data: {json.dumps({'type': 'start', 'messageId': str(uuid.uuid4())})}\n\n"

    # Start step
    yield f"data: {json.dumps({'type': 'start-step'})}\n\n"

    # Text start
    yield f"data: {json.dumps({'type': 'text-start', 'id': text_part_id})}\n\n"

    for chunk in completion:
        delta = chunk.choices[0].delta.content if chunk.choices[0].delta.content else ""
        if delta:
            yield f"data: {json.dumps({'type': 'text-delta', 'id': text_part_id, 'delta': delta})}\n\n"

    # Text end
    yield f"data: {json.dumps({'type': 'text-end', 'id': text_part_id})}\n\n"

    # Finish step
    yield f"data: {json.dumps({'type': 'finish-step'})}\n\n"

    # Finish message
    yield f"data: {json.dumps({'type': 'finish', 'finishReason': 'stop'})}\n\n"

    # SSE done signal
    yield "data: [DONE]\n\n"


def extract_text_from_message(m: dict) -> str:
    """Extract text content from an AI SDK message.

    Handles multiple formats:
    - Format A (string): {"role": "user", "content": "hello"}
    - Format B (content parts): {"role": "user", "content": [{"type": "text", "text": "hello"}]}
    - Format C (parts field): {"role": "user", "parts": [{"type": "text", "text": "hello"}], "content": ""}
    """
    # First try the 'parts' field (AI SDK v6 / assistant-ui format)
    parts = m.get("parts")
    if parts and isinstance(parts, list):
        texts = []
        for part in parts:
            if isinstance(part, dict) and part.get("type") == "text":
                texts.append(part.get("text", ""))
        if texts:
            return " ".join(texts)

    # Then try 'content'
    content = m.get("content", "")

    # content as array of part objects (Format B)
    if isinstance(content, list):
        texts = []
        for part in content:
            if isinstance(part, dict):
                texts.append(part.get("text", ""))
        result = " ".join(texts)
        if result.strip():
            return result

    # content as plain string (Format A)
    if isinstance(content, str) and content.strip():
        return content

    return str(content)


@app.post("/api/chat")
async def chat(request: FastAPIRequest):
    body = await request.json()
    logger.debug(f"Raw request body: {json.dumps(body, indent=2)}")
    messages_raw = body.get("messages", [])
    messages = []
    for m in messages_raw:
        text = extract_text_from_message(m)
        logger.debug(f"Parsed message: role={m.get('role')}, content={text!r}")
        messages.append(Message(role=m.get("role", "user"), content=text))

    if os.environ.get("OPENAI_API_KEY"):
        generator = generate_real_response(messages)
    else:
        generator = generate_mock_response(messages)

    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Vercel-AI-UI-Message-Stream": "v1",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
