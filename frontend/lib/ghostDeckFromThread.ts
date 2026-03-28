import type { Slide } from "@/lib/mockSlides";
import { threadMessagesForGenerate } from "@/lib/threadMessagesForGenerate";

export type GhostSlidePreview = {
  id: string;
  title: string;
  type: Slide["type"];
};

function cleanTitle(raw: string): string {
  let s = raw.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`+/g, "").trim();
  s = s.replace(/^[`"'""«»]+|[`"'""«»]+$/g, "").trim();
  const cut = s.split(/\s[—:–-]\s/)[0];
  if (cut && cut.length >= 3) s = cut.trim();
  return s.length > 160 ? `${s.slice(0, 157)}…` : s;
}

function inferSlideType(title: string): Slide["type"] {
  const t = title.toLowerCase();
  if (/(^|\s)(vs\.?|versus|compare|comparison)(\s|$)/.test(t)) return "comparison";
  if (/\b(timeline|roadmap|chronolog|milestone|evolution|history)\b/.test(t)) return "timeline";
  if (/20[12]\d{2}/.test(t) || /\bquarter\b|\bq[1-4]\b/i.test(title)) return "timeline";
  if (/\b(stat|stats|data|evidence|study|survey|metric|percent|%|roi|benchmark)\b/.test(t)) return "evidence";
  if (/\b(conclusion|summary|wrap|next steps|cta|closing|thank you|takeaway)\b/.test(t)) return "conclusion";
  if (/\b(intro|title|welcome|agenda|overview|about us|who we are)\b/.test(t)) return "title";
  return "concept";
}

function extractOutlineItems(text: string): string[] {
  const items: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.length > 400) continue;

    let m = line.match(/^\*\*(.+?)\*\*$/);
    if (m) {
      const t = cleanTitle(m[1]);
      if (t.length >= 3) items.push(t);
      continue;
    }
    m = line.match(/^#{1,3}\s+(.+)$/);
    if (m) {
      const t = cleanTitle(m[1]);
      if (t.length >= 3) items.push(t);
      continue;
    }
    m = line.match(/^\d+[.)]\s*(.+)$/);
    if (m) {
      const t = cleanTitle(m[1]);
      if (t.length >= 3) items.push(t);
      continue;
    }
    m = line.match(/^[-*]\s*(.+)$/);
    if (m) {
      const t = cleanTitle(m[1]);
      if (t.length >= 3) items.push(t);
      continue;
    }
    m = line.match(/^slide\s*\d+\s*[:.)-]\s*(.+)$/i);
    if (m) {
      const t = cleanTitle(m[1]);
      if (t.length >= 3) items.push(t);
    }
  }
  return items;
}

function dedupeTitles(titles: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of titles) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

const NOISE_LINE =
  /^(here are|let me|i'd be happy|feel free|does that|what (kind|type)|could you|would you|can you|questions?)\b/i;

function firstTopicLineFromUser(text: string): string | null {
  for (const raw of text.split(/\n/)) {
    const line = raw.trim().replace(/^[-*]\s*/, "");
    if (line.length < 12 || line.length > 200) continue;
    if (/^\d+[.)]\s/.test(line)) continue;
    if (line.endsWith("?")) continue;
    if (NOISE_LINE.test(line)) continue;
    return cleanTitle(line);
  }
  return null;
}

function toGhostSlides(titles: string[]): GhostSlidePreview[] {
  const capped = dedupeTitles(titles).slice(0, 15);
  return capped.map((title, i) => ({
    id: `ghost-${i}`,
    title,
    type: inferSlideType(title),
  }));
}

function joinText(
  payload: ReturnType<typeof threadMessagesForGenerate>,
  role: string
): string[] {
  return payload
    .filter((m) => m.role === role)
    .map((m) =>
      m.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("\n")
    );
}

/**
 * Infers a provisional slide list from chat (markdown lists, headings, bold lines)
 * so the deck panel can show a ghost preview before /api/generate runs.
 */
export function ghostDeckFromThread(rawMessages: unknown[]): GhostSlidePreview[] {
  const payload = threadMessagesForGenerate(rawMessages);
  const assistantBlocks = joinText(payload, "assistant");
  const userBlocks = joinText(payload, "user");

  for (let i = assistantBlocks.length - 1; i >= 0; i--) {
    const items = extractOutlineItems(assistantBlocks[i]);
    if (items.length >= 2) return toGhostSlides(items);
    if (items.length === 1 && items[0].length >= 24) return toGhostSlides(items);
  }

  const allAssistant = assistantBlocks.join("\n\n");
  let items = extractOutlineItems(allAssistant);
  if (items.length >= 2) return toGhostSlides(items);
  if (items.length === 1 && items[0].length >= 24) return toGhostSlides(items);

  for (let i = userBlocks.length - 1; i >= 0; i--) {
    const fromUser = extractOutlineItems(userBlocks[i]);
    if (fromUser.length >= 2) return toGhostSlides(fromUser);
  }

  if (items.length === 1) return toGhostSlides(items);

  for (let i = userBlocks.length - 1; i >= 0; i--) {
    const topic = firstTopicLineFromUser(userBlocks[i]);
    if (topic) return toGhostSlides([topic]);
  }

  return [];
}
