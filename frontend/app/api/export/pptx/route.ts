const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const response = await fetch(`${BACKEND_URL}/api/export/pptx`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "Unknown error");
      return new Response(
        JSON.stringify({ error: "Export failed", details: text }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const blob = await response.arrayBuffer();
    return new Response(blob, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": 'attachment; filename="flowdeck-presentation.pptx"',
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "Cannot connect to backend." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
