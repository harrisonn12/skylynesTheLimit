import json
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
        "I'm a mock assistant — the real agent pipeline is coming soon! 🚀"
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
                    "You are SlideForge, an AI presentation assistant. Help users plan "
                    "and create presentations. Be concise and helpful. When users describe "
                    "their topic, ask clarifying questions about audience, key points, and "
                    "desired length."
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


@app.post("/api/chat")
async def chat(request: FastAPIRequest):
    body = await request.json()
    messages_raw = body.get("messages", [])
    messages = []
    for m in messages_raw:
        content = m.get("content", "")
        # AI SDK can send content as array of objects
        if isinstance(content, list):
            content = " ".join(
                part.get("text", "") for part in content if isinstance(part, dict)
            )
        messages.append(Message(role=m.get("role", "user"), content=str(content)))

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
