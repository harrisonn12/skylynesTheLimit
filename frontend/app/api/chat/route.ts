const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(req: Request) {
  const body = await req.json();

  const response = await fetch(`${BACKEND_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return new Response(
      JSON.stringify({ error: "Backend request failed" }),
      { status: response.status, headers: { "Content-Type": "application/json" } }
    );
  }

  // Forward the stream with correct headers for AI SDK UI Message Stream
  return new Response(response.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Vercel-AI-UI-Message-Stream": "v1",
      "X-Accel-Buffering": "no",
    },
  });
}
