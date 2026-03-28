import json
import uuid
from datetime import datetime

import uvicorn
from fastapi import FastAPI, Request as FastAPIRequest
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from routes.generate import router as generate_router

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
    """Generate a mock streaming response in AI SDK compatible format."""
    user_message = messages[-1].content if messages else "Hello"

    response_text = (
        f"I received your message: \"{user_message}\". "
        "I'm a mock assistant — the real agent pipeline is coming soon! 🚀"
    )

    # AI SDK Data Stream Protocol
    # Format: https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol#data-stream-protocol

    # Step start
    yield f'f:{{"messageId":"{uuid.uuid4()}"}}\n'

    # Text parts
    for word in response_text.split(" "):
        yield f'0:"{word} "\n'

    # Finish step
    yield f'e:{{"finishReason":"stop","usage":{{"promptTokens":0,"completionTokens":0}}}}\n'

    # Finish message
    yield f'd:{{"finishReason":"stop","usage":{{"promptTokens":0,"completionTokens":0}}}}\n'


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

    return StreamingResponse(
        generate_mock_response(messages),
        media_type="text/plain",
    )


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
