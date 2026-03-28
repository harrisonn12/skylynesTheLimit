import json
import logging
import os
import uuid

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request as FastAPIRequest
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from openai import OpenAI

from routes.generate import router as generate_router
from routes.export import router as export_router
from routes.qa import router as qa_router
from routes.refine_slide import router as refine_slide_router
from thread_context import mock_user_preview, raw_message_to_openai

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(title="Agent Backend")

app.include_router(generate_router)
app.include_router(export_router)
app.include_router(qa_router)
app.include_router(refine_slide_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def generate_mock_response(openai_messages: list[dict]):
    """Generate a mock streaming response in AI SDK UI Message Stream (SSE) format.

    Format: Server-Sent Events with JSON UIMessageChunk objects.
    See: https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol#ui-message-stream-protocol
    """
    user_message = mock_user_preview(openai_messages[-1] if openai_messages else None)

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


def generate_real_response(openai_messages: list[dict]):
    """Stream a real response from OpenAI in AI SDK UI Message Stream SSE format."""
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

    completion = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are Deckless, an AI presentation assistant.\n\n"
                    "When the user describes a slide deck, topic, or presentation idea, walk "
                    "them through clarifications in a natural back-and-forth. Each reply "
                    "should ask only a few focused questions at a time (for example: "
                    "audience, primary goal, must-cover points, approximate length or slide "
                    "count, tone, brand or format constraints). Spread questions across "
                    "several turns rather than dumping a long checklist in one message.\n\n"
                    "The user may attach files (PDFs, slide decks, images, text). Use what "
                    "they provide: reference specific details from attachments when relevant.\n\n"
                    "Stay concise and conversational. When you have enough context, briefly "
                    "summarize what you understood and mention they can use Generate when ready."
                ),
            },
            *openai_messages,
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


@app.post("/api/chat")
async def chat(request: FastAPIRequest):
    body = await request.json()
    logger.debug(f"Raw request body: {json.dumps(body, indent=2)}")
    messages_raw = body.get("messages", [])
    openai_messages: list[dict] = []
    for m in messages_raw:
        if not isinstance(m, dict):
            continue
        om = raw_message_to_openai(m)
        preview = (
            om["content"]
            if isinstance(om["content"], str)
            else f"[multimodal, {len(om['content'])} blocks]"
        )
        logger.debug("OpenAI message role=%s preview=%r", om.get("role"), preview)
        openai_messages.append(om)

    if os.environ.get("OPENAI_API_KEY"):
        generator = generate_real_response(openai_messages)
    else:
        generator = generate_mock_response(openai_messages)

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
