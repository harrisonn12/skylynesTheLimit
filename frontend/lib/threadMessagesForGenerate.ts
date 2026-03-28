/**
 * Serializes assistant-ui thread messages for POST /api/generate so the backend
 * can compile the full transcript plus file attachments (same as chat).
 */

export type GenerateMessagePart =
  | { type: "text"; text: string }
  | { type: "file"; url: string; mediaType: string; filename: string };

export type GenerateMessagePayload = {
  role: string;
  parts: GenerateMessagePart[];
};

function serializePart(p: unknown): GenerateMessagePart | null {
  if (!p || typeof p !== "object") return null;
  const part = p as Record<string, unknown>;
  const t = part.type;
  if (t === "text") {
    return { type: "text", text: String(part.text ?? "") };
  }
  if (t === "file") {
    return {
      type: "file",
      url: String(part.url ?? ""),
      mediaType: String(part.mediaType ?? ""),
      filename: String(part.filename ?? ""),
    };
  }
  return null;
}

export function threadMessagesForGenerate(messages: unknown[]): GenerateMessagePayload[] {
  const out: GenerateMessagePayload[] = [];
  for (const m of messages) {
    if (!m || typeof m !== "object") continue;
    const msg = m as Record<string, unknown>;
    const role = typeof msg.role === "string" ? msg.role : "user";

    let partsRaw: unknown = msg.parts;
    if (!Array.isArray(partsRaw) && Array.isArray(msg.content)) {
      partsRaw = msg.content;
    }

    const parts: GenerateMessagePart[] = [];
    if (Array.isArray(partsRaw)) {
      for (const p of partsRaw) {
        const sp = serializePart(p);
        if (sp) parts.push(sp);
      }
    } else if (typeof msg.content === "string" && msg.content.trim()) {
      parts.push({ type: "text", text: msg.content });
    }

    if (parts.length === 0) continue;
    out.push({ role, parts });
  }
  return out;
}
